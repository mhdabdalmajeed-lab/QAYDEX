import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { authUsers, authenticatedRole } from "drizzle-orm/supabase";

import type {
  AuditDomain,
  BlockType,
  ClaimType,
  Confidence,
  Severity,
} from "@/lib/ai/blocks/types";

// `authUsers` is imported and used in foreign keys but deliberately NOT
// re-exported: drizzle-kit collects the tables a schema file *exports*, so
// re-exporting it would make `generate` emit CREATE TABLE "auth"."users" and
// clobber Supabase's own auth table.
//
// An `ensure_rls` event trigger on this database enables row level security on
// every new table in `public`. A table without a matching policy is readable by
// nobody through the Supabase client, so every table below declares one.
// Drizzle connects as the `postgres` role and bypasses RLS entirely, which
// makes these policies defence in depth rather than the authorisation boundary
// — server code must still go through `src/lib/auth/guards.ts`.
//
// `is_workspace_member` is SECURITY DEFINER (see drizzle/0001_rls_helpers.sql)
// so the policy on `workspace_members` can query `workspace_members` without
// tripping infinite RLS recursion.
const memberOf = (column: AnyPgColumn) => sql`public.is_workspace_member(${column})`;

/** Standard tenant policy: members of the owning workspace may do anything. */
const workspacePolicy = (name: string, column: AnyPgColumn) =>
  pgPolicy(name, {
    for: "all",
    to: authenticatedRole,
    using: memberOf(column),
    withCheck: memberOf(column),
  });

const id = () => uuid("id").primaryKey().defaultRandom().notNull();
const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).defaultNow().notNull();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true }).defaultNow().notNull();

// ─────────────────────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────────────────────

export const workspaceTypeEnum = pgEnum("workspace_type", ["internal", "firm"]);

/** PRD §21.1 */
export const memberRoleEnum = pgEnum("member_role", [
  "owner",
  "admin",
  "finance_manager",
  "internal_auditor",
  "auditor",
  "reviewer",
  "approver",
  "contributor",
  "read_only",
  "client_user",
]);

export const auditDomainEnum = pgEnum("audit_domain", [
  "general",
  "ledger",
  "budgets",
  "cash",
  "customers",
  "suppliers",
]);

/** PRD §9.1 */
export const instructionCategoryEnum = pgEnum("instruction_category", [
  "organization",
  "client",
  "subsidiary",
  "department",
  "audit_type",
  "accounting_standard",
  "industry",
  "reporting",
  "risk",
  "data_handling",
  "output_formatting",
]);

export const visibilityEnum = pgEnum("visibility", [
  "workspace",
  "private",
  "client",
  "system",
]);

export const lifecycleStatusEnum = pgEnum("lifecycle_status", [
  "draft",
  "active",
  "archived",
]);

/** Where an instruction entered the audit — drives the priority hierarchy (PRD §9.3). */
export const instructionSourceEnum = pgEnum("instruction_source", [
  "platform_safety",
  "organization_mandatory",
  "client_mandatory",
  "template",
  "saved",
  "audit_specific",
  "chat",
]);

export const auditStatusEnum = pgEnum("audit_status", [
  "draft",
  "queued",
  "processing",
  "needs_input",
  "completed",
  "review_needed",
  "approved",
  "failed",
  "archived",
]);

export const riskLevelEnum = pgEnum("risk_level", [
  "critical",
  "high",
  "medium",
  "low",
  "none",
]);

export const revisionStatusEnum = pgEnum("revision_status", [
  "draft",
  "processing",
  "completed",
  "failed",
  "approved",
]);

export const inputKindEnum = pgEnum("input_kind", ["file", "text", "integration"]);

export const inputStatusEnum = pgEnum("input_status", [
  "pending",
  "parsing",
  "parsed",
  "failed",
  "unsupported",
]);

export const documentKindEnum = pgEnum("document_kind", [
  "table",
  "text",
  "page",
  "sheet",
  "image",
]);

export const severityEnum = pgEnum("severity", [
  "critical",
  "high",
  "medium",
  "low",
  "info",
]);

export const confidenceEnum = pgEnum("confidence", ["high", "medium", "low"]);

/** PRD §10.5 — the model must say how much weight a statement carries. */
export const claimTypeEnum = pgEnum("claim_type", [
  "evidence_supported",
  "reasonable_interpretation",
  "unverified_hypothesis",
  "missing_information",
  "user_claim",
  "judgment_required",
]);

export const findingStatusEnum = pgEnum("finding_status", [
  "open",
  "in_progress",
  "accepted",
  "disputed",
  "resolved",
]);

export const messageRoleEnum = pgEnum("message_role", [
  "user",
  "assistant",
  "system",
  "tool",
]);

export const connectionStatusEnum = pgEnum("connection_status", [
  "connected",
  "error",
  "disconnected",
  "pending",
]);

export const importModeEnum = pgEnum("import_mode", ["snapshot", "refresh_on_revision"]);

export const runStatusEnum = pgEnum("run_status", [
  "pending",
  "running",
  "completed",
  "failed",
]);

export const jobStatusEnum = pgEnum("job_status", [
  "queued",
  "running",
  "completed",
  "failed",
  "cancelled",
]);

/** PRD §22 — the nine processing stages, each independently retryable. */
export const jobStageEnum = pgEnum("job_stage", [
  "intake",
  "parsing",
  "context",
  "planning",
  "analysis",
  "evidence_review",
  "interface_generation",
  "quality_review",
  "publication",
]);

export const stageStatusEnum = pgEnum("stage_status", [
  "pending",
  "running",
  "completed",
  "failed",
  "skipped",
]);

export const modelStatusEnum = pgEnum("model_status", [
  "approved",
  "candidate",
  "deprecated",
]);

export const exportKindEnum = pgEnum("export_kind", [
  "full_report",
  "executive_summary",
  "findings",
  "management_letter",
  "remediation_plan",
  "evidence_appendix",
  "blocks",
  "activity",
  "instructions",
  "input_list",
]);

export const exportFormatEnum = pgEnum("export_format", [
  "pdf",
  "docx",
  "xlsx",
  "csv",
  "html",
]);

// ─────────────────────────────────────────────────────────────────────────────
// Shared JSON shapes
// ─────────────────────────────────────────────────────────────────────────────

/** Points at the exact place in an input that supports a claim (PRD §6.2). */
export type EvidenceLocator = {
  sheet?: string;
  page?: number;
  rowFrom?: number;
  rowTo?: number;
  columns?: string[];
  cell?: string;
  section?: string;
  recordId?: string;
};

export type InstructionSnapshotEntry = {
  source: (typeof instructionSourceEnum.enumValues)[number];
  priority: number;
  instructionId?: string;
  instructionVersionId?: string;
  version?: number;
  name: string;
  category?: string;
  text: string;
  mandatory: boolean;
};

export type InstructionConflict = {
  aRef: string;
  bRef: string;
  aName: string;
  bName: string;
  description: string;
  resolution?: "keep_a" | "keep_b" | "keep_both" | "manual";
  resolutionNote?: string;
};

export type InputSnapshotEntry = {
  inputId: string;
  kind: (typeof inputKindEnum.enumValues)[number];
  name: string;
  checksum?: string;
  documentIds: string[];
  rowCount?: number;
  status: string;
};

export type WorkspaceSettings = {
  ai?: {
    allowExternalModels?: boolean;
    permittedProviders?: string[];
    permittedRegions?: string[];
    retainConversations?: boolean;
    allowProductImprovement?: boolean;
    rolesAllowedToRunAudits?: string[];
    permittedIntegrations?: string[];
    permittedFileTypes?: string[];
  };
  retention?: { auditDays?: number | null; conversationDays?: number | null };
  branding?: { primaryColor?: string; logoUrl?: string; footer?: string };
};

export type QualityReviewCheck = {
  key: string;
  label: string;
  passed: boolean;
  severity: Severity;
  detail: string;
};

export type QualityReviewResult = {
  passed: boolean;
  score: number;
  checks: QualityReviewCheck[];
  summary: string;
  reviewedBlockCount: number;
  reviewedFindingCount: number;
};

export type AuditPlan = {
  objective: string;
  audience: string;
  approach: string[];
  investigationTargets: {
    id: string;
    area: string;
    rationale: string;
    instructionRefs: string[];
    evidenceNeeded: string[];
  }[];
  missingEvidence: string[];
  clarifyingQuestions: string[];
  plannedComparisons: string[];
};

export type ToolCallRecord = {
  name: string;
  arguments: unknown;
  result: unknown;
  ok: boolean;
  ms: number;
};

export type DetectedMetadata = {
  periods?: { start?: string; end?: string; label?: string }[];
  currencies?: string[];
  entities?: string[];
  rowCount?: number;
  freshness?: string;
};

export type InputWarning = {
  code: string;
  message: string;
  severity: Severity;
};

// ─────────────────────────────────────────────────────────────────────────────
// Tenancy
// ─────────────────────────────────────────────────────────────────────────────

export const workspaces = pgTable(
  "workspaces",
  {
    id: id(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    type: workspaceTypeEnum("type").notNull().default("internal"),
    industry: text("industry"),
    baseCurrency: text("base_currency").notNull().default("USD"),
    accountingStandards: text("accounting_standards").array(),
    fiscalYearStartMonth: integer("fiscal_year_start_month").notNull().default(1),
    settings: jsonb("settings").$type<WorkspaceSettings>().notNull().default({}),
    createdBy: uuid("created_by").references(() => authUsers.id, {
      onDelete: "set null",
    }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("workspaces_slug_key").on(t.slug),
    workspacePolicy("workspaces_members", t.id),
  ],
);

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    id: id(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    role: memberRoleEnum("role").notNull().default("contributor"),
    title: text("title"),
    invitedBy: uuid("invited_by").references(() => authUsers.id, {
      onDelete: "set null",
    }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("workspace_members_unique").on(t.workspaceId, t.userId),
    index("workspace_members_user_idx").on(t.userId),
    workspacePolicy("workspace_members_members", t.workspaceId),
  ],
);

export const entities = pgTable(
  "entities",
  {
    id: id(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    legalName: text("legal_name").notNull(),
    entityType: text("entity_type"),
    registrationDetails: jsonb("registration_details")
      .$type<Record<string, string>>()
      .notNull()
      .default({}),
    baseCurrency: text("base_currency").notNull().default("USD"),
    fiscalPeriod: text("fiscal_period"),
    parentEntityId: uuid("parent_entity_id").references((): AnyPgColumn => entities.id, {
      onDelete: "set null",
    }),
    createdAt: createdAt(),
  },
  (t) => [
    index("entities_workspace_idx").on(t.workspaceId),
    workspacePolicy("entities_members", t.workspaceId),
  ],
);

/** Audit-firm workspaces keep each client's work separated (PRD §21.3). */
export const clients = pgTable(
  "clients",
  {
    id: id(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    industry: text("industry"),
    details: jsonb("details").$type<Record<string, string>>().notNull().default({}),
    branding: jsonb("branding")
      .$type<{ primaryColor?: string; logoUrl?: string }>()
      .notNull()
      .default({}),
    createdBy: uuid("created_by").references(() => authUsers.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [
    index("clients_workspace_idx").on(t.workspaceId),
    workspacePolicy("clients_members", t.workspaceId),
  ],
);

export const engagements = pgTable(
  "engagements",
  {
    id: id(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    status: lifecycleStatusEnum("status").notNull().default("active"),
    periodStart: date("period_start"),
    periodEnd: date("period_end"),
    createdAt: createdAt(),
  },
  (t) => [
    index("engagements_client_idx").on(t.clientId),
    workspacePolicy("engagements_members", t.workspaceId),
  ],
);

/** Restricts a member to specific clients; no rows means "all clients". */
export const memberClientAccess = pgTable(
  "member_client_access",
  {
    id: id(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => workspaceMembers.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("member_client_access_unique").on(t.memberId, t.clientId),
    workspacePolicy("member_client_access_members", t.workspaceId),
  ],
);

// ─────────────────────────────────────────────────────────────────────────────
// Instructions (PRD §9)
// ─────────────────────────────────────────────────────────────────────────────

export const instructions = pgTable(
  "instructions",
  {
    id: id(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    category: instructionCategoryEnum("category").notNull(),
    ownerId: uuid("owner_id").references(() => authUsers.id, { onDelete: "set null" }),
    clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }),
    visibility: visibilityEnum("visibility").notNull().default("workspace"),
    /** Lower sorts first; combined with source rank to resolve the hierarchy. */
    priority: integer("priority").notNull().default(100),
    mandatory: boolean("mandatory").notNull().default(false),
    status: lifecycleStatusEnum("status").notNull().default("active"),
    tags: text("tags").array(),
    applicableModules: text("applicable_modules").array(),
    applicableEntityIds: uuid("applicable_entity_ids").array(),
    applicableTemplateIds: uuid("applicable_template_ids").array(),
    effectiveDate: date("effective_date"),
    expirationDate: date("expiration_date"),
    currentVersion: integer("current_version").notNull().default(1),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("instructions_workspace_idx").on(t.workspaceId),
    index("instructions_category_idx").on(t.workspaceId, t.category),
    workspacePolicy("instructions_members", t.workspaceId),
  ],
);

/** Editing an instruction must never change an audit that already used it (PRD §9.4). */
export const instructionVersions = pgTable(
  "instruction_versions",
  {
    id: id(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    instructionId: uuid("instruction_id")
      .notNull()
      .references(() => instructions.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    text: text("text").notNull(),
    changelog: text("changelog"),
    createdBy: uuid("created_by").references(() => authUsers.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("instruction_versions_unique").on(t.instructionId, t.version),
    workspacePolicy("instruction_versions_members", t.workspaceId),
  ],
);

// ─────────────────────────────────────────────────────────────────────────────
// Templates (PRD §17)
// ─────────────────────────────────────────────────────────────────────────────

export const templates = pgTable(
  "templates",
  {
    id: id(),
    /** NULL for the system library that ships with the product. */
    workspaceId: uuid("workspace_id").references(() => workspaces.id, {
      onDelete: "cascade",
    }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    category: auditDomainEnum("category").notNull(),
    subcategory: text("subcategory"),
    description: text("description").notNull(),
    isSystem: boolean("is_system").notNull().default(false),
    visibility: visibilityEnum("visibility").notNull().default("system"),
    tags: text("tags").array(),
    currentVersion: integer("current_version").notNull().default(1),
    createdBy: uuid("created_by").references(() => authUsers.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("templates_slug_key").on(t.slug),
    index("templates_category_idx").on(t.category),
    // System templates (workspace_id IS NULL) are readable by every signed-in
    // user; workspace templates stay tenant-scoped and only they may be written.
    pgPolicy("templates_read", {
      for: "all",
      to: authenticatedRole,
      using: sql`${t.workspaceId} is null or public.is_workspace_member(${t.workspaceId})`,
      withCheck: sql`${t.workspaceId} is not null and public.is_workspace_member(${t.workspaceId})`,
    }),
  ],
);

export const templateVersions = pgTable(
  "template_versions",
  {
    id: id(),
    templateId: uuid("template_id")
      .notNull()
      .references(() => templates.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    defaultTitle: text("default_title").notNull(),
    auditDescription: text("audit_description").notNull(),
    instructions: text("instructions").notNull(),
    recommendedInputs: jsonb("recommended_inputs")
      .$type<{ name: string; description: string; formats: string[]; required: boolean }[]>()
      .notNull()
      .default([]),
    requiredEvidence: jsonb("required_evidence").$type<string[]>().notNull().default([]),
    suggestedPeriod: text("suggested_period"),
    expectedOutputStructure: jsonb("expected_output_structure")
      .$type<BlockType[]>()
      .notNull()
      .default([]),
    suggestedFollowups: jsonb("suggested_followups").$type<string[]>().notNull().default([]),
    relevantIntegrations: text("relevant_integrations").array(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("template_versions_unique").on(t.templateId, t.version),
    // Template bodies are readable by any signed-in user (the library ships with
    // the product); writes go through the server, which bypasses RLS.
    pgPolicy("template_versions_read", {
      for: "select",
      to: authenticatedRole,
      using: sql`true`,
    }),
  ],
);

// ─────────────────────────────────────────────────────────────────────────────
// Audits
// ─────────────────────────────────────────────────────────────────────────────

export const audits = pgTable(
  "audits",
  {
    id: id(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" }),
    engagementId: uuid("engagement_id").references(() => engagements.id, {
      onDelete: "set null",
    }),
    entityId: uuid("entity_id").references(() => entities.id, { onDelete: "set null" }),
    templateId: uuid("template_id").references(() => templates.id, { onDelete: "set null" }),
    templateVersionId: uuid("template_version_id").references(() => templateVersions.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    objective: text("objective"),
    scope: text("scope"),
    domain: auditDomainEnum("domain").notNull().default("general"),
    subcategory: text("subcategory"),
    periodStart: date("period_start"),
    periodEnd: date("period_end"),
    periodLabel: text("period_label"),
    status: auditStatusEnum("status").notNull().default("draft"),
    overallRisk: riskLevelEnum("overall_risk"),
    findingCount: integer("finding_count").notNull().default(0),
    /** Instructions written for this audit alone (PRD §8.4). */
    customInstructions: text("custom_instructions"),
    /** Surfaced for the user to settle before generation, never auto-resolved (PRD §9.3). */
    instructionConflicts: jsonb("instruction_conflicts")
      .$type<InstructionConflict[]>()
      .notNull()
      .default([]),
    currentRevisionId: uuid("current_revision_id"),
    creatorId: uuid("creator_id").references(() => authUsers.id, { onDelete: "set null" }),
    reviewerId: uuid("reviewer_id").references(() => authUsers.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (t) => [
    index("audits_workspace_idx").on(t.workspaceId),
    index("audits_domain_idx").on(t.workspaceId, t.domain),
    index("audits_status_idx").on(t.workspaceId, t.status),
    index("audits_client_idx").on(t.clientId),
    workspacePolicy("audits_members", t.workspaceId),
  ],
);

/**
 * A revision is the immutable unit of record. Re-running an audit always creates
 * a new one; a completed revision is never rewritten (PRD §23, §26.3).
 */
export const auditRevisions = pgTable(
  "audit_revisions",
  {
    id: id(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    auditId: uuid("audit_id")
      .notNull()
      .references(() => audits.id, { onDelete: "cascade" }),
    revision: integer("revision").notNull(),
    status: revisionStatusEnum("status").notNull().default("draft"),
    modelId: text("model_id"),
    modelParams: jsonb("model_params").$type<Record<string, unknown>>().notNull().default({}),
    promptVersion: text("prompt_version"),
    schemaVersion: text("schema_version"),
    templateVersionId: uuid("template_version_id").references(() => templateVersions.id, {
      onDelete: "set null",
    }),
    instructionSnapshot: jsonb("instruction_snapshot")
      .$type<InstructionSnapshotEntry[]>()
      .notNull()
      .default([]),
    inputSnapshot: jsonb("input_snapshot").$type<InputSnapshotEntry[]>().notNull().default([]),
    plan: jsonb("plan").$type<AuditPlan>(),
    qualityReview: jsonb("quality_review").$type<QualityReviewResult>(),
    summary: text("summary"),
    overallRisk: riskLevelEnum("overall_risk"),
    reason: text("reason"),
    /** Set at publication; nothing may change afterwards. */
    immutable: boolean("immutable").notNull().default(false),
    createdBy: uuid("created_by").references(() => authUsers.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    approvedBy: uuid("approved_by").references(() => authUsers.id, { onDelete: "set null" }),
  },
  (t) => [
    uniqueIndex("audit_revisions_unique").on(t.auditId, t.revision),
    workspacePolicy("audit_revisions_members", t.workspaceId),
  ],
);

/** The user's current selection of saved instructions, frozen into the revision at run time. */
export const auditInstructionLinks = pgTable(
  "audit_instruction_links",
  {
    id: id(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    auditId: uuid("audit_id")
      .notNull()
      .references(() => audits.id, { onDelete: "cascade" }),
    instructionId: uuid("instruction_id")
      .notNull()
      .references(() => instructions.id, { onDelete: "cascade" }),
    instructionVersionId: uuid("instruction_version_id")
      .notNull()
      .references(() => instructionVersions.id, { onDelete: "cascade" }),
    source: instructionSourceEnum("source").notNull().default("saved"),
    addedBy: uuid("added_by").references(() => authUsers.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("audit_instruction_links_unique").on(t.auditId, t.instructionId),
    workspacePolicy("audit_instruction_links_members", t.workspaceId),
  ],
);

// ─────────────────────────────────────────────────────────────────────────────
// Inputs (PRD §8.5) — evidence lives inside the audit it was provided for
// ─────────────────────────────────────────────────────────────────────────────

export const auditInputs = pgTable(
  "audit_inputs",
  {
    id: id(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    auditId: uuid("audit_id")
      .notNull()
      .references(() => audits.id, { onDelete: "cascade" }),
    kind: inputKindEnum("kind").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    status: inputStatusEnum("status").notNull().default("pending"),
    filePath: text("file_path"),
    fileName: text("file_name"),
    fileSize: integer("file_size"),
    mimeType: text("mime_type"),
    checksum: text("checksum"),
    textContent: text("text_content"),
    connectionId: uuid("connection_id"),
    importId: uuid("import_id"),
    warnings: jsonb("warnings").$type<InputWarning[]>().notNull().default([]),
    detected: jsonb("detected").$type<DetectedMetadata>().notNull().default({}),
    parseError: text("parse_error"),
    parsedAt: timestamp("parsed_at", { withTimezone: true }),
    version: integer("version").notNull().default(1),
    createdBy: uuid("created_by").references(() => authUsers.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    /** Inputs are never silently dropped; removal only takes effect in a new revision. */
    removedAt: timestamp("removed_at", { withTimezone: true }),
  },
  (t) => [
    index("audit_inputs_audit_idx").on(t.auditId),
    workspacePolicy("audit_inputs_members", t.workspaceId),
  ],
);

/** A parsed unit of an input — the thing evidence references point at. */
export const inputDocuments = pgTable(
  "input_documents",
  {
    id: id(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    inputId: uuid("input_id")
      .notNull()
      .references(() => auditInputs.id, { onDelete: "cascade" }),
    kind: documentKindEnum("kind").notNull(),
    name: text("name").notNull(),
    sheetName: text("sheet_name"),
    pageNumber: integer("page_number"),
    seq: integer("seq").notNull().default(0),
    rowCount: integer("row_count"),
    colCount: integer("col_count"),
    columns: jsonb("columns")
      .$type<{ key: string; label: string; type: string }[]>()
      .notNull()
      .default([]),
    rows: jsonb("rows").$type<unknown[][]>().notNull().default([]),
    textContent: text("text_content"),
    summary: text("summary"),
    truncated: boolean("truncated").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [
    index("input_documents_input_idx").on(t.inputId),
    workspacePolicy("input_documents_members", t.workspaceId),
  ],
);

// ─────────────────────────────────────────────────────────────────────────────
// Outputs
// ─────────────────────────────────────────────────────────────────────────────

export const outputBlocks = pgTable(
  "output_blocks",
  {
    id: id(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    auditId: uuid("audit_id")
      .notNull()
      .references(() => audits.id, { onDelete: "cascade" }),
    revisionId: uuid("revision_id")
      .notNull()
      .references(() => auditRevisions.id, { onDelete: "cascade" }),
    type: text("type").$type<BlockType>().notNull(),
    position: integer("position").notNull().default(0),
    title: text("title"),
    /** Validated against the block's schema before it is ever stored. */
    content: jsonb("content").$type<Record<string, unknown>>().notNull(),
    config: jsonb("config").$type<Record<string, unknown>>().notNull().default({}),
    schemaVersion: text("schema_version"),
    /** A block that failed to generate is recorded, never silently dropped. */
    error: text("error"),
    createdAt: createdAt(),
  },
  (t) => [
    index("output_blocks_revision_idx").on(t.revisionId, t.position),
    workspacePolicy("output_blocks_members", t.workspaceId),
  ],
);

/** User interaction with a block, kept out of the immutable revision (PRD §18.4). */
export const blockStates = pgTable(
  "block_states",
  {
    blockId: uuid("block_id")
      .primaryKey()
      .references(() => outputBlocks.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    hidden: boolean("hidden").notNull().default(false),
    includeInReport: boolean("include_in_report").notNull().default(true),
    narrativeOverride: text("narrative_override"),
    updatedBy: uuid("updated_by").references(() => authUsers.id, { onDelete: "set null" }),
    updatedAt: updatedAt(),
  },
  (t) => [workspacePolicy("block_states_members", t.workspaceId)],
);

export const findings = pgTable(
  "findings",
  {
    id: id(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    auditId: uuid("audit_id")
      .notNull()
      .references(() => audits.id, { onDelete: "cascade" }),
    revisionId: uuid("revision_id")
      .notNull()
      .references(() => auditRevisions.id, { onDelete: "cascade" }),
    /** Stable across revisions where the model recognises the same issue. */
    key: text("key").notNull(),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    detail: text("detail").notNull(),
    riskCategory: text("risk_category").notNull(),
    severity: severityEnum("severity").notNull(),
    confidence: confidenceEnum("confidence").notNull(),
    confidenceNote: text("confidence_note"),
    claimType: claimTypeEnum("claim_type").notNull().default("evidence_supported"),
    financialImpact: numeric("financial_impact", { precision: 20, scale: 2 }),
    financialImpactCurrency: text("financial_impact_currency"),
    impactBasis: text("impact_basis"),
    affectedPeriods: text("affected_periods").array(),
    affectedEntities: text("affected_entities").array(),
    affectedAccounts: text("affected_accounts").array(),
    potentialExplanations: jsonb("potential_explanations").$type<string[]>().notNull().default([]),
    recommendedFollowup: text("recommended_followup"),
    recommendedRemediation: text("recommended_remediation"),
    /** Which instruction caused this area to be investigated (PRD §6.2). */
    instructionsReferenced: jsonb("instructions_referenced").$type<string[]>().notNull().default([]),
    position: integer("position").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [
    index("findings_revision_idx").on(t.revisionId, t.position),
    index("findings_audit_idx").on(t.auditId),
    index("findings_severity_idx").on(t.workspaceId, t.severity),
    workspacePolicy("findings_members", t.workspaceId),
  ],
);

/** Collaboration state, deliberately separate so the revision stays immutable (PRD §21.2). */
export const findingStates = pgTable(
  "finding_states",
  {
    findingId: uuid("finding_id")
      .primaryKey()
      .references(() => findings.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    status: findingStatusEnum("status").notNull().default("open"),
    ownerId: uuid("owner_id").references(() => authUsers.id, { onDelete: "set null" }),
    dueDate: date("due_date"),
    managementResponse: text("management_response"),
    updatedBy: uuid("updated_by").references(() => authUsers.id, { onDelete: "set null" }),
    updatedAt: updatedAt(),
  },
  (t) => [workspacePolicy("finding_states_members", t.workspaceId)],
);

export const evidenceRefs = pgTable(
  "evidence_refs",
  {
    id: id(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    revisionId: uuid("revision_id")
      .notNull()
      .references(() => auditRevisions.id, { onDelete: "cascade" }),
    findingId: uuid("finding_id").references(() => findings.id, { onDelete: "cascade" }),
    blockId: uuid("block_id").references(() => outputBlocks.id, { onDelete: "cascade" }),
    inputId: uuid("input_id")
      .notNull()
      .references(() => auditInputs.id, { onDelete: "cascade" }),
    documentId: uuid("document_id").references(() => inputDocuments.id, {
      onDelete: "set null",
    }),
    locator: jsonb("locator").$type<EvidenceLocator>().notNull().default({}),
    excerpt: text("excerpt"),
    label: text("label"),
    createdAt: createdAt(),
  },
  (t) => [
    index("evidence_refs_finding_idx").on(t.findingId),
    index("evidence_refs_block_idx").on(t.blockId),
    index("evidence_refs_input_idx").on(t.inputId),
    workspacePolicy("evidence_refs_members", t.workspaceId),
  ],
);

export const comments = pgTable(
  "comments",
  {
    id: id(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    auditId: uuid("audit_id")
      .notNull()
      .references(() => audits.id, { onDelete: "cascade" }),
    findingId: uuid("finding_id").references(() => findings.id, { onDelete: "cascade" }),
    blockId: uuid("block_id").references(() => outputBlocks.id, { onDelete: "cascade" }),
    authorId: uuid("author_id").references(() => authUsers.id, { onDelete: "set null" }),
    body: text("body").notNull(),
    mentions: uuid("mentions").array(),
    resolved: boolean("resolved").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("comments_audit_idx").on(t.auditId),
    workspacePolicy("comments_members", t.workspaceId),
  ],
);

// ─────────────────────────────────────────────────────────────────────────────
// Conversations (PRD §10)
// ─────────────────────────────────────────────────────────────────────────────

export const conversations = pgTable(
  "conversations",
  {
    id: id(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("New conversation"),
    createdBy: uuid("created_by").references(() => authUsers.id, { onDelete: "set null" }),
    pinned: boolean("pinned").notNull().default(false),
    archived: boolean("archived").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("conversations_workspace_idx").on(t.workspaceId, t.updatedAt),
    workspacePolicy("conversations_members", t.workspaceId),
  ],
);

/** A chat may be blank or grounded in one or more audits. */
export const conversationAudits = pgTable(
  "conversation_audits",
  {
    id: id(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    auditId: uuid("audit_id")
      .notNull()
      .references(() => audits.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("conversation_audits_unique").on(t.conversationId, t.auditId),
    workspacePolicy("conversation_audits_members", t.workspaceId),
  ],
);

export type MessageAttachment = {
  kind: "file" | "audit" | "finding" | "block" | "input" | "text";
  refId?: string;
  name: string;
  meta?: Record<string, unknown>;
};

export type MessageCitation = {
  label: string;
  inputId?: string;
  documentId?: string;
  auditId?: string;
  findingId?: string;
  locator?: EvidenceLocator;
};

export const messages = pgTable(
  "messages",
  {
    id: id(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    role: messageRoleEnum("role").notNull(),
    content: text("content").notNull().default(""),
    /** Charts/tables the model generated inline, using the same block registry. */
    blocks: jsonb("blocks")
      .$type<{ type: BlockType; title?: string; content: Record<string, unknown> }[]>()
      .notNull()
      .default([]),
    citations: jsonb("citations").$type<MessageCitation[]>().notNull().default([]),
    attachments: jsonb("attachments").$type<MessageAttachment[]>().notNull().default([]),
    suggestedFollowups: jsonb("suggested_followups").$type<string[]>().notNull().default([]),
    modelId: text("model_id"),
    tokens: jsonb("tokens").$type<{ input?: number; output?: number; total?: number }>(),
    status: runStatusEnum("status").notNull().default("completed"),
    error: text("error"),
    createdAt: createdAt(),
  },
  (t) => [
    index("messages_conversation_idx").on(t.conversationId, t.createdAt),
    workspacePolicy("messages_members", t.workspaceId),
  ],
);

// ─────────────────────────────────────────────────────────────────────────────
// Integrations (PRD §16) — connections are reusable, imports are audit snapshots
// ─────────────────────────────────────────────────────────────────────────────

export const integrationConnections = pgTable(
  "integration_connections",
  {
    id: id(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    providerKey: text("provider_key").notNull(),
    name: text("name").notNull(),
    clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" }),
    entityId: uuid("entity_id").references(() => entities.id, { onDelete: "set null" }),
    status: connectionStatusEnum("status").notNull().default("pending"),
    authType: text("auth_type").notNull(),
    /** AES-256-GCM ciphertext; never returned to the browser (PRD §25.1). */
    credentialsEncrypted: text("credentials_encrypted"),
    credentialsMeta: jsonb("credentials_meta")
      .$type<{ hint?: string; account?: string; expiresAt?: string }>()
      .notNull()
      .default({}),
    connectedEntity: text("connected_entity"),
    availableDatasets: jsonb("available_datasets").$type<string[]>().notNull().default([]),
    dataPeriod: jsonb("data_period").$type<{ start?: string; end?: string }>(),
    permissions: jsonb("permissions").$type<string[]>().notNull().default([]),
    lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
    nextSyncAt: timestamp("next_sync_at", { withTimezone: true }),
    error: text("error"),
    ownerId: uuid("owner_id").references(() => authUsers.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("integration_connections_workspace_idx").on(t.workspaceId),
    workspacePolicy("integration_connections_members", t.workspaceId),
  ],
);

export const integrationImports = pgTable(
  "integration_imports",
  {
    id: id(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    connectionId: uuid("connection_id")
      .notNull()
      .references(() => integrationConnections.id, { onDelete: "cascade" }),
    auditId: uuid("audit_id").references(() => audits.id, { onDelete: "cascade" }),
    inputId: uuid("input_id").references(() => auditInputs.id, { onDelete: "set null" }),
    dataset: text("dataset").notNull(),
    periodStart: date("period_start"),
    periodEnd: date("period_end"),
    mode: importModeEnum("mode").notNull().default("snapshot"),
    recordCount: integer("record_count"),
    /** Lets an audit detect that the source changed after it ran (PRD §16.8). */
    snapshotChecksum: text("snapshot_checksum"),
    status: runStatusEnum("status").notNull().default("pending"),
    error: text("error"),
    requestedBy: uuid("requested_by").references(() => authUsers.id, { onDelete: "set null" }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    index("integration_imports_connection_idx").on(t.connectionId),
    index("integration_imports_audit_idx").on(t.auditId),
    workspacePolicy("integration_imports_members", t.workspaceId),
  ],
);

export const integrationEvents = pgTable(
  "integration_events",
  {
    id: id(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    connectionId: uuid("connection_id")
      .notNull()
      .references(() => integrationConnections.id, { onDelete: "cascade" }),
    importId: uuid("import_id").references(() => integrationImports.id, {
      onDelete: "cascade",
    }),
    type: text("type").notNull(),
    message: text("message").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: createdAt(),
  },
  (t) => [
    index("integration_events_connection_idx").on(t.connectionId, t.createdAt),
    workspacePolicy("integration_events_members", t.workspaceId),
  ],
);

// ─────────────────────────────────────────────────────────────────────────────
// Durable jobs (PRD §26.1) — progress by stage, each stage retryable alone
// ─────────────────────────────────────────────────────────────────────────────

export const auditJobs = pgTable(
  "audit_jobs",
  {
    id: id(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    auditId: uuid("audit_id")
      .notNull()
      .references(() => audits.id, { onDelete: "cascade" }),
    revisionId: uuid("revision_id")
      .notNull()
      .references(() => auditRevisions.id, { onDelete: "cascade" }),
    status: jobStatusEnum("status").notNull().default("queued"),
    currentStage: jobStageEnum("current_stage"),
    attempt: integer("attempt").notNull().default(0),
    error: text("error"),
    /** Prevents the same revision being processed twice (PRD §26.3). */
    idempotencyKey: text("idempotency_key").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    heartbeatAt: timestamp("heartbeat_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("audit_jobs_idempotency_key").on(t.idempotencyKey),
    index("audit_jobs_audit_idx").on(t.auditId),
    workspacePolicy("audit_jobs_members", t.workspaceId),
  ],
);

export const auditJobStages = pgTable(
  "audit_job_stages",
  {
    id: id(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    jobId: uuid("job_id")
      .notNull()
      .references(() => auditJobs.id, { onDelete: "cascade" }),
    stage: jobStageEnum("stage").notNull(),
    status: stageStatusEnum("status").notNull().default("pending"),
    attempt: integer("attempt").notNull().default(0),
    progress: integer("progress").notNull().default(0),
    detail: text("detail"),
    output: jsonb("output").$type<Record<string, unknown>>(),
    tokens: jsonb("tokens").$type<{ input?: number; output?: number }>(),
    error: text("error"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("audit_job_stages_unique").on(t.jobId, t.stage),
    workspacePolicy("audit_job_stages_members", t.workspaceId),
  ],
);

/** Every model call is logged, including the tools it invoked (PRD §22.9, §25.3). */
export const modelCalls = pgTable(
  "model_calls",
  {
    id: id(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    jobId: uuid("job_id").references(() => auditJobs.id, { onDelete: "cascade" }),
    revisionId: uuid("revision_id").references(() => auditRevisions.id, {
      onDelete: "cascade",
    }),
    conversationId: uuid("conversation_id").references(() => conversations.id, {
      onDelete: "cascade",
    }),
    stage: text("stage").notNull(),
    modelId: text("model_id").notNull(),
    promptVersion: text("prompt_version"),
    requestSummary: jsonb("request_summary").$type<Record<string, unknown>>().notNull().default({}),
    responseMeta: jsonb("response_meta").$type<Record<string, unknown>>().notNull().default({}),
    toolCalls: jsonb("tool_calls").$type<ToolCallRecord[]>().notNull().default([]),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    latencyMs: integer("latency_ms"),
    status: runStatusEnum("status").notNull().default("completed"),
    error: text("error"),
    createdAt: createdAt(),
  },
  (t) => [
    index("model_calls_revision_idx").on(t.revisionId),
    workspacePolicy("model_calls_members", t.workspaceId),
  ],
);

// ─────────────────────────────────────────────────────────────────────────────
// Governance
// ─────────────────────────────────────────────────────────────────────────────

/** Audits use the latest *approved* model, never whatever shipped today (PRD §23). */
export const approvedModels = pgTable(
  "approved_models",
  {
    id: id(),
    /** NULL = platform default, available to every workspace. */
    workspaceId: uuid("workspace_id").references(() => workspaces.id, {
      onDelete: "cascade",
    }),
    modelId: text("model_id").notNull(),
    label: text("label").notNull(),
    status: modelStatusEnum("status").notNull().default("candidate"),
    isDefault: boolean("is_default").notNull().default(false),
    params: jsonb("params").$type<Record<string, unknown>>().notNull().default({}),
    evalNotes: text("eval_notes"),
    contextWindow: integer("context_window"),
    approvedBy: uuid("approved_by").references(() => authUsers.id, { onDelete: "set null" }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("approved_models_unique").on(t.workspaceId, t.modelId),
    pgPolicy("approved_models_read", {
      for: "all",
      to: authenticatedRole,
      using: sql`${t.workspaceId} is null or public.is_workspace_member(${t.workspaceId})`,
      withCheck: sql`${t.workspaceId} is not null and public.is_workspace_member(${t.workspaceId})`,
    }),
  ],
);

export const activityLog = pgTable(
  "activity_log",
  {
    id: id(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id").references(() => authUsers.id, { onDelete: "set null" }),
    actorEmail: text("actor_email"),
    action: text("action").notNull(),
    targetType: text("target_type"),
    targetId: uuid("target_id"),
    auditId: uuid("audit_id").references(() => audits.id, { onDelete: "cascade" }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    ip: text("ip"),
    userAgent: text("user_agent"),
    createdAt: createdAt(),
  },
  (t) => [
    index("activity_log_workspace_idx").on(t.workspaceId, t.createdAt),
    index("activity_log_audit_idx").on(t.auditId),
    workspacePolicy("activity_log_members", t.workspaceId),
  ],
);

export const exports = pgTable(
  "exports",
  {
    id: id(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    auditId: uuid("audit_id")
      .notNull()
      .references(() => audits.id, { onDelete: "cascade" }),
    revisionId: uuid("revision_id").references(() => auditRevisions.id, {
      onDelete: "cascade",
    }),
    kind: exportKindEnum("kind").notNull(),
    format: exportFormatEnum("format").notNull(),
    status: runStatusEnum("status").notNull().default("pending"),
    filePath: text("file_path"),
    fileSize: integer("file_size"),
    options: jsonb("options").$type<Record<string, unknown>>().notNull().default({}),
    error: text("error"),
    createdBy: uuid("created_by").references(() => authUsers.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [
    index("exports_audit_idx").on(t.auditId),
    workspacePolicy("exports_members", t.workspaceId),
  ],
);

export const shareLinks = pgTable(
  "share_links",
  {
    id: id(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    auditId: uuid("audit_id")
      .notNull()
      .references(() => audits.id, { onDelete: "cascade" }),
    revisionId: uuid("revision_id").references(() => auditRevisions.id, {
      onDelete: "cascade",
    }),
    token: text("token").notNull(),
    scope: jsonb("scope")
      .$type<{ includeEvidence?: boolean; includeInternalNotes?: boolean }>()
      .notNull()
      .default({}),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    lastAccessedAt: timestamp("last_accessed_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => authUsers.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("share_links_token_key").on(t.token),
    workspacePolicy("share_links_members", t.workspaceId),
  ],
);

export const savedViews = pgTable(
  "saved_views",
  {
    id: id(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => authUsers.id, { onDelete: "cascade" }),
    page: text("page").notNull(),
    name: text("name").notNull(),
    filters: jsonb("filters").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: createdAt(),
  },
  (t) => [
    index("saved_views_workspace_idx").on(t.workspaceId, t.page),
    workspacePolicy("saved_views_members", t.workspaceId),
  ],
);

export type { AuditDomain, BlockType, ClaimType, Confidence, Severity };
