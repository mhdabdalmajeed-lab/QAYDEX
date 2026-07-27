import { and, asc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { RiPlayLine } from "@remixicon/react";

import { BlockActions, HiddenBlockRow } from "@/components/audit/block-actions";
import { FindingTriageList, type TriageFinding } from "@/components/audit/finding-triage";
import { FloatingChat } from "@/components/audit/floating-chat";
import { HeaderActions } from "@/components/audit/header-actions";
import { InputPanel } from "@/components/audit/input-panel";
import { AuditStatusBadge, RiskBadge, describePeriod } from "@/components/audit/meta";
import { ProcessingPanel } from "@/components/audit/processing-panel";
import { QualityReviewNotice } from "@/components/audit/quality-review";
import { RunButton } from "@/components/audit/run-button";
import { AuditBlockView } from "@/components/blocks";
import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { db } from "@/db";
import {
  blockStates,
  comments,
  evidenceRefs,
  findingStates,
  findings,
  outputBlocks,
} from "@/db/schema";
import type { AuditBlock } from "@/lib/ai/blocks/schemas";
import { buildProgressPayload } from "@/lib/audit/progress-server";
import {
  getAuditContext,
  getLatestJob,
  getPanelInputs,
  listAssignees,
  listAuditConversations,
  listRevisions,
  resolveRevision,
} from "@/server/queries/audit";

/**
 * The audit detail page (PRD §19).
 *
 * Three regions: the persistent left input panel (what this was built from), the canvas (what
 * the model concluded), and the floating chat (how you argue with it).
 *
 * Two things here are load-bearing product promises rather than layout choices:
 *
 *  - The panel renders the revision's **frozen instruction snapshot**, not today's library. An
 *    instruction edited last week must not silently rewrite what a published audit was run
 *    against (PRD §9.4).
 *  - A failed quality review is rendered **above** the findings, never below them. An audit the
 *    reviewer rejected must not read like a finished one (PRD §22.8, §26.3).
 */

type Params = { params: Promise<{ slug: string; id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug, id } = await params;
  const { audit } = await getAuditContext(slug, id);
  return { title: audit.name };
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AuditPage({ params, searchParams }: Params) {
  const { slug, id } = await params;
  const query = await searchParams;
  const ctx = await getAuditContext(slug, id);
  const { audit, workspace, membership, can } = ctx;

  const revisions = await listRevisions(workspace.id, audit.id);
  const revision = await resolveRevision(
    workspace.id,
    audit.id,
    audit.currentRevisionId,
    first(query.revision),
  );

  const job = await getLatestJob(workspace.id, audit.id);
  const isRunning =
    audit.status === "queued" ||
    audit.status === "processing" ||
    job?.job.status === "running" ||
    job?.job.status === "queued";

  const [panelInputs, conversations] = await Promise.all([
    getPanelInputs(workspace.id, audit.id, revision?.id ?? null),
    listAuditConversations(workspace.id, audit.id),
  ]);

  const header = (
    <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-4 md:px-6">
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-1.5">
          <SidebarTrigger className="-ml-1.5 shrink-0 text-muted-foreground" />
          <h1 className="truncate text-xl font-semibold">{audit.name}</h1>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <AuditStatusBadge status={audit.status} />
          {audit.overallRisk ? <RiskBadge risk={audit.overallRisk} /> : null}
          <Badge variant="outline">{describePeriod(audit)}</Badge>
          {ctx.entityName ? <Badge variant="outline">{ctx.entityName}</Badge> : null}
          {ctx.clientName ? <Badge variant="outline">Client: {ctx.clientName}</Badge> : null}
          {revision ? (
            <Link
              href={`/w/${slug}/audits/${audit.id}/revisions`}
              className="rounded underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Revision {revision.revision}
              {revisions.length > 1 ? ` of ${revisions.length}` : ""}
            </Link>
          ) : null}
        </div>
      </div>
      <HeaderActions
        slug={slug}
        auditId={audit.id}
        auditName={audit.name}
        details={{
          auditId: audit.id,
          name: audit.name,
          objective: audit.objective,
          scope: audit.scope,
          periodLabel: audit.periodLabel,
          periodStart: audit.periodStart,
          periodEnd: audit.periodEnd,
          customInstructions: audit.customInstructions,
        }}
        status={audit.status}
        hasRevision={Boolean(revision)}
        isRunning={isRunning}
        can={{
          run: can("audits.run"),
          edit: can("audits.edit"),
          create: can("audits.create"),
          review: can("audits.review"),
          approve: can("audits.approve"),
          remove: can("audits.delete"),
          exportAudit: can("audits.export"),
          share: can("audits.share"),
        }}
      />
    </div>
  );

  return (
    <div className="flex min-h-0 flex-1">
      <main className="flex min-w-0 flex-1 flex-col">
        {header}

        <div className="flex-1 overflow-y-auto px-6 pb-32 pt-6">
          <div className="mx-auto w-full max-w-4xl space-y-6">
            {/* Also shown after a failure, not only while running: a run that died at a stage
                left a revision behind, and without this the page reads as an empty result
                rather than a broken one. The panel carries the stage error and the retry. */}
            {(isRunning || audit.status === "failed" || job?.job.status === "failed") && job ? (
              <ProcessingPanel
                auditId={audit.id}
                initial={buildProgressPayload(audit.status, job.job, job.stages)}
                canRetry={can("audits.run")}
              />
            ) : null}

            {!revision ? (
              // Nothing has been produced yet. The page is for results, so a draft says so
              // and offers the one action that changes that; evidence is attached in the
              // panel beside it.
              !isRunning ? (
                <Empty className="rounded-xl border border-dashed border-border py-16">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <RiPlayLine aria-hidden="true" />
                    </EmptyMedia>
                    <EmptyTitle>This audit has not run yet</EmptyTitle>
                    <EmptyDescription>
                      {panelInputs.length === 0
                        ? "Attach evidence in the panel on the right, then run it. Running with nothing attached is allowed — the model will report that it had nothing to examine rather than invent findings."
                        : `${panelInputs.length} input${panelInputs.length === 1 ? "" : "s"} attached. Run it to produce findings.`}
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <RunButton
                      auditId={audit.id}
                      workspaceSlug={slug}
                      blockedReason={
                        can("audits.run")
                          ? null
                          : `Your role (${membership.role.replace(/_/g, " ")}) cannot run audits.`
                      }
                      hasRevisions={false}
                    />
                  </EmptyContent>
                </Empty>
              ) : null
            ) : (
              <>
                {/* Above the findings on purpose: a rejected audit must not read as finished. */}
                {revision.qualityReview && !revision.qualityReview.passed ? (
                  <QualityReviewNotice review={revision.qualityReview} />
                ) : null}

                {revision.summary ? (
                  <section
                    aria-labelledby="audit-summary"
                    className="rounded-xl border border-border bg-card p-5"
                  >
                    <h2 id="audit-summary" className="text-sm font-medium text-muted-foreground">
                      Summary
                    </h2>
                    <p className="mt-2 text-pretty leading-relaxed">{revision.summary}</p>
                  </section>
                ) : null}

                <Suspense fallback={<BlocksSkeleton />}>
                  <Blocks slug={slug} auditId={audit.id} revisionId={revision.id} canEdit={can("audits.edit")} />
                </Suspense>

                <Separator />

                <Suspense fallback={<BlocksSkeleton />}>
                  <Findings
                    slug={slug}
                    workspaceId={workspace.id}
                    auditId={audit.id}
                    revisionId={revision.id}
                    can={{
                      assign: can("findings.assign"),
                      respond: can("findings.respond"),
                      comment: can("comments.create"),
                    }}
                  />
                </Suspense>

                {revision.qualityReview?.passed ? (
                  <QualityReviewNotice review={revision.qualityReview} />
                ) : null}
              </>
            )}
          </div>
        </div>
      </main>

      <InputPanel
        slug={slug}
        auditId={audit.id}
        inputs={panelInputs}
        instructions={revision?.instructionSnapshot ?? []}
        customInstructions={audit.customInstructions}
        periodLabel={describePeriod(audit)}
        dataFreshness={panelInputs
          .map((input) => input.freshness)
          .filter((value): value is string => Boolean(value))}
        missingEvidence={revision?.plan?.missingEvidence ?? []}
        revisionLabel={revision ? `Revision ${revision.revision}` : null}
        canEdit={can("audits.edit")}
      />

      <FloatingChat
        slug={slug}
        auditId={audit.id}
        auditName={audit.name}
        conversations={conversations.map((c) => ({
          id: c.id,
          title: c.title,
          updatedAt: c.updatedAt.toISOString(),
        }))}
        suggestions={revision?.plan?.clarifyingQuestions?.slice(0, 3) ?? []}
      />
    </div>
  );
}


function BlocksSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <Skeleton className="h-32 w-full rounded-xl" />
      <Skeleton className="h-56 w-full rounded-xl" />
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  );
}

/**
 * Streamed separately so the summary paints immediately and each chart/table arrives on its
 * own (PRD §26.1: progressive loading, blocks render independently).
 */
async function Blocks({
  slug,
  auditId,
  revisionId,
  canEdit,
}: {
  slug: string;
  auditId: string;
  revisionId: string;
  canEdit: boolean;
}) {
  const rows = await db
    .select({ block: outputBlocks, state: blockStates })
    .from(outputBlocks)
    .leftJoin(blockStates, eq(blockStates.blockId, outputBlocks.id))
    .where(eq(outputBlocks.revisionId, revisionId))
    .orderBy(asc(outputBlocks.position));

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        This revision produced no output blocks.
      </p>
    );
  }

  const visible = rows.filter((r) => !r.state?.hidden);
  const hidden = rows.filter((r) => r.state?.hidden);

  return (
    <section aria-label="Audit findings and analysis" className="space-y-4">
      {visible.map(({ block, state }) => (
        <div key={block.id} className="group relative">
          {/* jsonb → typed union. This is the one place the cast is legitimate: the payload was
              validated against the same schema before it was ever stored. */}
          <AuditBlockView block={block.content as unknown as AuditBlock} />
          {state?.narrativeOverride ? (
            <p className="mt-2 rounded-md border border-border bg-muted/40 p-3 text-sm">
              <span className="font-medium">Reviewer note: </span>
              {state.narrativeOverride}
            </p>
          ) : null}
          <div className="mt-2 flex justify-end opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
            <BlockActions
              slug={slug}
              auditId={auditId}
              blockId={block.id}
              blockTitle={block.title ?? block.type}
              hidden={Boolean(state?.hidden)}
              includeInReport={state?.includeInReport ?? true}
              canEdit={canEdit}
            />
          </div>
        </div>
      ))}

      {hidden.length > 0 ? (
        <div className="space-y-2 rounded-lg border border-dashed border-border p-3">
          <h3 className="text-xs font-medium text-muted-foreground">
            Hidden from this view ({hidden.length})
          </h3>
          {hidden.map(({ block }) => (
            <HiddenBlockRow
              key={block.id}
              auditId={auditId}
              blockId={block.id}
              blockTitle={block.title ?? block.type}
              blockType={block.type}
              canEdit={canEdit}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

async function Findings({
  slug,
  workspaceId,
  auditId,
  revisionId,
  can,
}: {
  slug: string;
  workspaceId: string;
  auditId: string;
  revisionId: string;
  can: { assign: boolean; respond: boolean; comment: boolean };
}) {
  const rows = await db
    .select({ finding: findings, state: findingStates })
    .from(findings)
    .leftJoin(findingStates, eq(findingStates.findingId, findings.id))
    .where(eq(findings.revisionId, revisionId))
    .orderBy(asc(findings.position));

  if (rows.length === 0) return null;

  const [refs, commentRows, assignees] = await Promise.all([
    db.select().from(evidenceRefs).where(eq(evidenceRefs.revisionId, revisionId)),
    db
      .select()
      .from(comments)
      .where(and(eq(comments.auditId, auditId), eq(comments.workspaceId, workspaceId)))
      .orderBy(asc(comments.createdAt)),
    listAssignees(workspaceId),
  ]);

  const emailById = new Map(assignees.map((a) => [a.userId, a.email ?? ""]));

  const triage: TriageFinding[] = rows.map(({ finding, state }) => ({
    id: finding.id,
    key: finding.key,
    title: finding.title,
    summary: finding.summary,
    detail: finding.detail,
    riskCategory: finding.riskCategory,
    severity: finding.severity,
    confidence: finding.confidence,
    confidenceNote: finding.confidenceNote,
    claimType: finding.claimType,
    financialImpact: finding.financialImpact,
    financialImpactCurrency: finding.financialImpactCurrency,
    impactBasis: finding.impactBasis,
    affectedPeriods: finding.affectedPeriods ?? [],
    affectedEntities: finding.affectedEntities ?? [],
    affectedAccounts: finding.affectedAccounts ?? [],
    potentialExplanations: finding.potentialExplanations,
    recommendedFollowup: finding.recommendedFollowup,
    recommendedRemediation: finding.recommendedRemediation,
    instructionsReferenced: finding.instructionsReferenced,
    evidence: refs
      .filter((r) => r.findingId === finding.id)
      .map((r) => ({
        label: r.label ?? "Source",
        locator: describeLocator(r.locator),
        inputName: null,
      })),
    state: state
      ? {
          status: state.status,
          ownerId: state.ownerId,
          dueDate: state.dueDate,
          managementResponse: state.managementResponse,
          updatedAt: state.updatedAt?.toISOString() ?? null,
          updatedByEmail: state.updatedBy ? (emailById.get(state.updatedBy) ?? null) : null,
        }
      : null,
    comments: commentRows
      .filter((c) => c.findingId === finding.id)
      .map((c) => ({
        id: c.id,
        body: c.body,
        authorEmail: c.authorId ? (emailById.get(c.authorId) ?? "Unknown") : "Unknown",
        createdAt: c.createdAt.toISOString(),
      })),
  }));

  return (
    <section aria-labelledby="findings-heading" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 id="findings-heading" className="text-lg font-semibold">
          Findings ({triage.length})
        </h2>
      </div>
      <FindingTriageList
        findings={triage}
        assignees={assignees}
        slug={slug}
        auditId={auditId}
        can={can}
      />
    </section>
  );
}

function describeLocator(locator: {
  sheet?: string;
  page?: number;
  rowFrom?: number;
  rowTo?: number;
  cell?: string;
  section?: string;
}): string | null {
  const parts: string[] = [];
  if (locator.sheet) parts.push(`sheet ${locator.sheet}`);
  if (locator.page !== undefined) parts.push(`p.${locator.page}`);
  if (locator.cell) parts.push(`cell ${locator.cell}`);
  else if (locator.rowFrom !== undefined) {
    parts.push(
      locator.rowTo && locator.rowTo !== locator.rowFrom
        ? `rows ${locator.rowFrom}-${locator.rowTo}`
        : `row ${locator.rowFrom}`,
    );
  }
  if (locator.section) parts.push(locator.section);
  return parts.length ? parts.join(" · ") : null;
}
