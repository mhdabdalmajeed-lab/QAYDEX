import "server-only";

import {
  and,
  arrayOverlaps,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lte,
  ne,
  or,
  type SQL,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/db";
import {
  auditRevisions,
  audits,
  clients,
  entities,
  findings,
  integrationConnections,
  integrationImports,
  templates,
} from "@/db/schema";
import {
  firstParam,
  isAuditStatus,
  isRiskLevel,
  type AuditStatus,
  type DomainFilter,
} from "@/lib/audit-filters";
import type { AuditDomain } from "@/lib/ai/blocks/types";

/**
 * The audit library query (PRD §20), shared by `/audits` and by every domain library.
 *
 * A domain page is the same query with `domain` pinned and an optional template-tag
 * filter applied — the pages differ in framing, not in what they read. Nothing here can
 * reach outside a workspace: `workspaceId` is a mandatory argument and is applied to the
 * audits table and to every correlated subquery, because drizzle bypasses RLS.
 */

export type AuditQueryParams = Record<string, string | string[] | undefined>;

export type ParsedFilters = {
  domain?: AuditDomain;
  templateId?: string;
  entityId?: string;
  clientId?: string;
  period?: string;
  creatorId?: string;
  reviewerId?: string;
  status?: AuditStatus;
  risk?: string;
  findingCategory?: string;
  integration?: string;
  createdFrom?: string;
  createdTo?: string;
  completedFrom?: string;
  completedTo?: string;
  q?: string;
};

const DOMAIN_VALUES: readonly string[] = [
  "general",
  "ledger",
  "budgets",
  "cash",
  "customers",
  "suppliers",
];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Ignores anything that is not a well-formed id: a bad param narrows nothing rather than erroring. */
function uuidParam(value: string | string[] | undefined): string | undefined {
  const raw = firstParam(value);
  return raw && UUID.test(raw) ? raw : undefined;
}

/** `YYYY-MM-DD` only — the value goes into a date comparison. */
function dateParam(value: string | string[] | undefined): string | undefined {
  const raw = firstParam(value);
  return raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : undefined;
}

export function parseFilters(params: AuditQueryParams): ParsedFilters {
  const domain = firstParam(params.domain);
  const status = firstParam(params.status);
  const risk = firstParam(params.risk);

  return {
    domain: domain && DOMAIN_VALUES.includes(domain) ? (domain as AuditDomain) : undefined,
    templateId: uuidParam(params.template),
    entityId: uuidParam(params.entity),
    clientId: uuidParam(params.client),
    period: firstParam(params.period),
    creatorId: uuidParam(params.creator),
    reviewerId: uuidParam(params.reviewer),
    status: status && isAuditStatus(status) ? status : undefined,
    risk: risk && isRiskLevel(risk) ? risk : undefined,
    findingCategory: firstParam(params.category),
    integration: firstParam(params.integration),
    createdFrom: dateParam(params.createdFrom),
    createdTo: dateParam(params.createdTo),
    completedFrom: dateParam(params.completedFrom),
    completedTo: dateParam(params.completedTo),
    q: firstParam(params.q),
  };
}

/** The revision an audit currently points at — the source of "date completed". */
const currentRevision = alias(auditRevisions, "current_revision");

/**
 * Audits whose *current* revision produced a finding in this category. Superseded
 * revisions are excluded on purpose: they remain in the database for reproducibility, but
 * they are not what the audit says today.
 */
async function auditIdsByFindingCategory(
  workspaceId: string,
  category: string,
): Promise<string[]> {
  const rows = await db
    .selectDistinct({ auditId: findings.auditId })
    .from(findings)
    .innerJoin(
      audits,
      and(eq(audits.id, findings.auditId), eq(audits.currentRevisionId, findings.revisionId)),
    )
    .where(
      and(
        eq(findings.workspaceId, workspaceId),
        eq(audits.workspaceId, workspaceId),
        ilike(findings.riskCategory, `%${category}%`),
      ),
    );
  return rows.map((row) => row.auditId);
}

/** Audits that received a snapshot from a connection to this provider (PRD §16.8). */
async function auditIdsByIntegration(
  workspaceId: string,
  providerKey: string,
): Promise<string[]> {
  const rows = await db
    .selectDistinct({ auditId: integrationImports.auditId })
    .from(integrationImports)
    .innerJoin(
      integrationConnections,
      eq(integrationConnections.id, integrationImports.connectionId),
    )
    .where(
      and(
        eq(integrationImports.workspaceId, workspaceId),
        eq(integrationConnections.workspaceId, workspaceId),
        eq(integrationConnections.providerKey, providerKey),
        isNotNull(integrationImports.auditId),
      ),
    );
  return rows.flatMap((row) => (row.auditId ? [row.auditId] : []));
}

export type BuildOptions = {
  workspaceId: string;
  filters: ParsedFilters;
  /** Pins the domain regardless of `filters.domain` — used by the domain libraries. */
  domain?: AuditDomain;
  /** A domain sub-library (`?filter=`), matched through the audit's template tags. */
  subFilter?: DomainFilter | null;
  /**
   * Status handled by the tabs. `"all"` hides archived audits — archive is its own tab,
   * not part of the working set.
   */
  tab?: string;
};

export async function buildAuditConditions({
  workspaceId,
  filters,
  domain,
  subFilter,
  tab,
}: BuildOptions): Promise<SQL[]> {
  // The tenant predicate is first and unconditional. Nothing below may remove it.
  const conditions: SQL[] = [eq(audits.workspaceId, workspaceId)];

  const pinnedDomain = domain ?? filters.domain;
  if (pinnedDomain) conditions.push(eq(audits.domain, pinnedDomain));

  if (subFilter && subFilter.tags.length > 0) {
    conditions.push(arrayOverlaps(templates.tags, subFilter.tags));
  }

  // Omitting `tab` *and* `filters.status` deliberately applies no status predicate at all,
  // which is what the tab counts need: they must be able to count archived audits too.
  const status = tab && tab !== "all" && isAuditStatusValue(tab) ? tab : filters.status;
  if (status) {
    conditions.push(eq(audits.status, status));
  } else if (tab === "all") {
    conditions.push(ne(audits.status, "archived"));
  }

  if (filters.templateId) conditions.push(eq(audits.templateId, filters.templateId));
  if (filters.entityId) conditions.push(eq(audits.entityId, filters.entityId));
  if (filters.clientId) conditions.push(eq(audits.clientId, filters.clientId));
  if (filters.period) conditions.push(eq(audits.periodLabel, filters.period));
  if (filters.creatorId) conditions.push(eq(audits.creatorId, filters.creatorId));
  if (filters.reviewerId) conditions.push(eq(audits.reviewerId, filters.reviewerId));

  if (filters.risk) {
    if (filters.risk === "none") {
      // "No risk identified" and "not assessed yet" read the same to a user here.
      const clause = or(eq(audits.overallRisk, "none"), isNull(audits.overallRisk));
      if (clause) conditions.push(clause);
    } else if (isRiskLevel(filters.risk)) {
      conditions.push(eq(audits.overallRisk, filters.risk));
    }
  }

  if (filters.q) {
    const clause = or(
      ilike(audits.name, `%${filters.q}%`),
      ilike(audits.objective, `%${filters.q}%`),
    );
    if (clause) conditions.push(clause);
  }

  if (filters.createdFrom) conditions.push(gte(audits.createdAt, new Date(filters.createdFrom)));
  if (filters.createdTo) {
    // Inclusive of the chosen day: the user picked a date, not an instant.
    conditions.push(lte(audits.createdAt, new Date(`${filters.createdTo}T23:59:59.999Z`)));
  }
  if (filters.completedFrom) {
    conditions.push(gte(currentRevision.completedAt, new Date(filters.completedFrom)));
  }
  if (filters.completedTo) {
    conditions.push(
      lte(currentRevision.completedAt, new Date(`${filters.completedTo}T23:59:59.999Z`)),
    );
  }

  if (filters.findingCategory) {
    const ids = await auditIdsByFindingCategory(workspaceId, filters.findingCategory);
    conditions.push(inArray(audits.id, ids.length > 0 ? ids : [NO_MATCH]));
  }

  if (filters.integration) {
    const ids = await auditIdsByIntegration(workspaceId, filters.integration);
    conditions.push(inArray(audits.id, ids.length > 0 ? ids : [NO_MATCH]));
  }

  return conditions;
}

/** A uuid no row can hold, so `inArray` narrows to nothing instead of to everything. */
const NO_MATCH = "00000000-0000-0000-0000-000000000000";

function isAuditStatusValue(value: string): value is AuditStatus {
  return isAuditStatus(value);
}

export type AuditRow = {
  id: string;
  name: string;
  domain: AuditDomain;
  subcategory: string | null;
  status: AuditStatus;
  overallRisk: "critical" | "high" | "medium" | "low" | "none" | null;
  findingCount: number;
  periodLabel: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  creatorId: string | null;
  reviewerId: string | null;
  updatedAt: Date;
  createdAt: Date;
  completedAt: Date | null;
  templateName: string | null;
  entityName: string | null;
  clientName: string | null;
};

/**
 * The three left joins are what make the filter set expressible in one query: the template
 * join carries the tag vocabulary the domain sub-filters match on, and the revision join
 * carries "date completed", which lives on the revision rather than the audit.
 */
function baseSelect() {
  return db
    .select({
      id: audits.id,
      name: audits.name,
      domain: audits.domain,
      subcategory: audits.subcategory,
      status: audits.status,
      overallRisk: audits.overallRisk,
      findingCount: audits.findingCount,
      periodLabel: audits.periodLabel,
      periodStart: audits.periodStart,
      periodEnd: audits.periodEnd,
      creatorId: audits.creatorId,
      reviewerId: audits.reviewerId,
      updatedAt: audits.updatedAt,
      createdAt: audits.createdAt,
      completedAt: currentRevision.completedAt,
      templateName: templates.name,
      entityName: entities.legalName,
      clientName: clients.name,
    })
    .from(audits)
    .leftJoin(templates, eq(templates.id, audits.templateId))
    .leftJoin(entities, eq(entities.id, audits.entityId))
    .leftJoin(clients, eq(clients.id, audits.clientId))
    .leftJoin(currentRevision, eq(currentRevision.id, audits.currentRevisionId));
}

export async function listAudits(
  conditions: SQL[],
  limit: number,
  offset = 0,
): Promise<AuditRow[]> {
  return baseSelect()
    .where(and(...conditions))
    .orderBy(desc(audits.updatedAt))
    .limit(limit)
    .offset(offset);
}

export async function countAudits(conditions: SQL[]): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(audits)
    .leftJoin(templates, eq(templates.id, audits.templateId))
    .leftJoin(currentRevision, eq(currentRevision.id, audits.currentRevisionId))
    .where(and(...conditions));
  return row?.total ?? 0;
}

/** Per-status totals for the tab counts, honouring every other active filter. */
export async function countByStatus(
  conditions: SQL[],
): Promise<Map<AuditStatus, number>> {
  const rows = await db
    .select({ status: audits.status, total: count() })
    .from(audits)
    .leftJoin(templates, eq(templates.id, audits.templateId))
    .leftJoin(currentRevision, eq(currentRevision.id, audits.currentRevisionId))
    .where(and(...conditions))
    .groupBy(audits.status);
  return new Map(rows.map((row) => [row.status, row.total]));
}
