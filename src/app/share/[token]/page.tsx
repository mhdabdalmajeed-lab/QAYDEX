import {
  RiChat1Line,
  RiDoubleQuotesL,
  RiErrorWarningLine,
  RiEyeOffLine,
  RiFileTextLine,
  RiHistoryLine,
  RiInformationLine,
  RiTimeLine,
} from "@remixicon/react";
import { and, asc, eq, inArray, isNotNull } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { RiskBadge, describePeriod, formatDateTime } from "@/components/audit/meta";
import { AuditBlockView } from "@/components/blocks";
import { ClaimBadge, SeverityBadge, formatMoney } from "@/components/blocks/shared";
import { Separator } from "@/components/ui/separator";
import { db } from "@/db";
import {
  auditRevisions,
  audits,
  blockStates,
  comments,
  evidenceRefs,
  findings,
  outputBlocks,
  shareLinks,
  type EvidenceLocator,
} from "@/db/schema";
import type { AuditBlock } from "@/lib/ai/blocks/schemas";

/**
 * The public share view (PRD §24).
 *
 * This is the only page in the product that renders audit content to someone who is not signed
 * in and is not a member of the workspace. There is no session to read, so the *token is the
 * entire authorisation story* — and everything below follows from that:
 *
 *  - The token is looked up, never trusted. It selects one `share_links` row, and that row's
 *    `auditId` / `revisionId` / `workspaceId` are the only identifiers used from that point on.
 *    Nothing about the request can widen the query beyond that one revision.
 *  - The **stored** scope decides what is rendered. A query parameter cannot turn evidence or
 *    internal notes on: they are read from `link.scope`, and anything absent reads as off.
 *  - Revoked and expired links are refused with wording that does not depend on whether the
 *    audit exists, so the page cannot be used as an oracle.
 *  - No author names, no workspace members, no other audits, no revision history. The reader
 *    gets exactly one point-in-time revision and is told so.
 *
 * Every query still carries its own `workspaceId` predicate: drizzle connects as the owner and
 * bypasses RLS, so the schema's policies are not a backstop here.
 */

export const metadata: Metadata = {
  title: "Shared audit",
  robots: { index: false, follow: false, nocache: true },
};

/**
 * `createShareLink` mints 32 CSPRNG bytes as base64url — 43 characters from a fixed alphabet.
 * Rejecting anything else up front means a hostile path segment never reaches the database.
 */
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{20,128}$/;

/* -------------------------------------------------------------------------- */
/* Refusals                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Shown for revoked, expired and structurally broken links.
 *
 * The heading is the same in every case. Only the sub-line differs, and only in ways the holder
 * of the link already knows (that it once worked, and when it stopped). Nothing here reveals
 * the audit's name, its workspace, or whether it still exists.
 */
function LinkUnavailable({ reason }: { reason: string }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
      <span className="flex size-11 items-center justify-center rounded-full border border-border bg-muted">
        <RiEyeOffLine aria-hidden="true" className="size-5 text-muted-foreground" />
      </span>
      <h1 className="text-lg font-semibold tracking-tight">This share link is no longer active</h1>
      <p className="text-sm leading-relaxed text-muted-foreground">{reason}</p>
      <p className="text-sm text-muted-foreground">
        Ask the person who sent it to issue a new link if you still need access.
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Evidence                                                                    */
/* -------------------------------------------------------------------------- */

/** The working-paper shorthand for where an excerpt came from, e.g. "sheet Jan · rows 44-51". */
function describeLocator(locator: EvidenceLocator): string {
  const parts: string[] = [];
  if (locator.sheet) parts.push(`sheet ${locator.sheet}`);
  if (typeof locator.page === "number") parts.push(`p.${locator.page}`);
  if (locator.cell) parts.push(`cell ${locator.cell}`);
  else if (typeof locator.rowFrom === "number") {
    const to = locator.rowTo;
    parts.push(
      typeof to === "number" && to !== locator.rowFrom
        ? `rows ${locator.rowFrom}-${to}`
        : `row ${locator.rowFrom}`,
    );
  }
  if (locator.section) parts.push(locator.section);
  return parts.join(" · ");
}

/**
 * Removes every `excerpt` from a stored block payload.
 *
 * Blocks carry their citations inline, so honouring `scope.includeEvidence` cannot be done by
 * skipping a section of the page — the quoted source lines are nested inside the block content
 * itself. This walks the payload and drops them wherever they appear, which is the one
 * behaviour that stays correct as new block types are added: a block type nobody has written
 * yet still cannot smuggle a quotation through.
 *
 * The locator and label survive: the reader is told a source exists, just not what it says.
 */
function stripExcerpts(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripExcerpts);
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      if (key === "excerpt") {
        out[key] = null;
        continue;
      }
      out[key] = stripExcerpts(entry);
    }
    return out;
  }
  return value;
}

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!TOKEN_PATTERN.test(token)) notFound();

  // This page writes `last_accessed_at` on every view, so it must never be prerendered and
  // served from a cache — the access log is the point.
  await connection();

  const [link] = await db
    .select({
      id: shareLinks.id,
      workspaceId: shareLinks.workspaceId,
      auditId: shareLinks.auditId,
      revisionId: shareLinks.revisionId,
      scope: shareLinks.scope,
      expiresAt: shareLinks.expiresAt,
      revokedAt: shareLinks.revokedAt,
    })
    .from(shareLinks)
    .where(eq(shareLinks.token, token))
    .limit(1);

  if (!link) notFound();

  if (link.revokedAt) {
    return (
      <LinkUnavailable reason="It was revoked by the team that created it, and will not work again." />
    );
  }

  const now = new Date();
  if (link.expiresAt && link.expiresAt.getTime() <= now.getTime()) {
    const on = formatDateTime(link.expiresAt);
    return (
      <LinkUnavailable
        reason={on ? `It expired on ${on}.` : "It has passed its expiry date."}
      />
    );
  }

  if (!link.revisionId) {
    // A link always pins one revision; a row without one points at nothing readable. Refuse
    // rather than fall back to "current" — that would publish a revision nobody approved.
    return <LinkUnavailable reason="The revision it pointed to is no longer available." />;
  }

  // Scope is read off the row, never off the request. `=== true` means a payload written before
  // a field existed, or one missing it, resolves to "off" — failure leans towards showing less.
  const includeEvidence = link.scope.includeEvidence === true;
  const includeInternalNotes = link.scope.includeInternalNotes === true;

  // Both predicates matter: the revision must be the one this link pins *and* live in the
  // workspace that issued it.
  const [context] = await db
    .select({
      auditName: audits.name,
      objective: audits.objective,
      periodLabel: audits.periodLabel,
      periodStart: audits.periodStart,
      periodEnd: audits.periodEnd,
      revision: auditRevisions.revision,
      summary: auditRevisions.summary,
      overallRisk: auditRevisions.overallRisk,
      completedAt: auditRevisions.completedAt,
      createdAt: auditRevisions.createdAt,
    })
    .from(auditRevisions)
    .innerJoin(audits, eq(audits.id, auditRevisions.auditId))
    .where(
      and(
        eq(auditRevisions.id, link.revisionId),
        eq(auditRevisions.auditId, link.auditId),
        eq(auditRevisions.workspaceId, link.workspaceId),
        eq(audits.workspaceId, link.workspaceId),
      ),
    )
    .limit(1);

  if (!context) {
    return <LinkUnavailable reason="The revision it pointed to is no longer available." />;
  }

  // Recorded after the link is proven good, so the timestamp the workspace sees means "someone
  // actually read this", not "someone probed a dead URL".
  await db.update(shareLinks).set({ lastAccessedAt: now }).where(eq(shareLinks.id, link.id));

  const blockRows = await db
    .select({
      id: outputBlocks.id,
      content: outputBlocks.content,
      hidden: blockStates.hidden,
      narrativeOverride: blockStates.narrativeOverride,
    })
    .from(outputBlocks)
    .leftJoin(blockStates, eq(blockStates.blockId, outputBlocks.id))
    .where(
      and(
        eq(outputBlocks.revisionId, link.revisionId),
        eq(outputBlocks.auditId, link.auditId),
        eq(outputBlocks.workspaceId, link.workspaceId),
      ),
    )
    .orderBy(asc(outputBlocks.position));

  // A block the team hid from their own view is not published to a stranger.
  const visibleBlocks = blockRows.filter((row) => row.hidden !== true);

  const findingRows = await db
    .select({
      id: findings.id,
      title: findings.title,
      summary: findings.summary,
      detail: findings.detail,
      riskCategory: findings.riskCategory,
      severity: findings.severity,
      confidence: findings.confidence,
      confidenceNote: findings.confidenceNote,
      claimType: findings.claimType,
      financialImpact: findings.financialImpact,
      financialImpactCurrency: findings.financialImpactCurrency,
      impactBasis: findings.impactBasis,
      affectedPeriods: findings.affectedPeriods,
      affectedEntities: findings.affectedEntities,
      affectedAccounts: findings.affectedAccounts,
      potentialExplanations: findings.potentialExplanations,
      recommendedFollowup: findings.recommendedFollowup,
      recommendedRemediation: findings.recommendedRemediation,
    })
    .from(findings)
    .where(
      and(
        eq(findings.revisionId, link.revisionId),
        eq(findings.auditId, link.auditId),
        eq(findings.workspaceId, link.workspaceId),
      ),
    )
    .orderBy(asc(findings.position));

  const findingIds = findingRows.map((row) => row.id);

  // Both extras are fetched only when the stored scope allows them. Not "fetched and hidden" —
  // data that is never loaded cannot leak through a rendering mistake.
  const evidenceByFinding = new Map<
    string,
    { id: string; label: string | null; excerpt: string | null; locator: EvidenceLocator }[]
  >();
  if (includeEvidence && findingIds.length > 0) {
    const rows = await db
      .select({
        id: evidenceRefs.id,
        findingId: evidenceRefs.findingId,
        label: evidenceRefs.label,
        excerpt: evidenceRefs.excerpt,
        locator: evidenceRefs.locator,
      })
      .from(evidenceRefs)
      .where(
        and(
          inArray(evidenceRefs.findingId, findingIds),
          eq(evidenceRefs.revisionId, link.revisionId),
          eq(evidenceRefs.workspaceId, link.workspaceId),
        ),
      )
      .orderBy(asc(evidenceRefs.createdAt));

    for (const row of rows) {
      if (!row.findingId) continue;
      const bucket = evidenceByFinding.get(row.findingId) ?? [];
      bucket.push({ id: row.id, label: row.label, excerpt: row.excerpt, locator: row.locator });
      evidenceByFinding.set(row.findingId, bucket);
    }
  }

  const notesByFinding = new Map<string, { id: string; body: string; createdAt: Date }[]>();
  if (includeInternalNotes && findingIds.length > 0) {
    const rows = await db
      .select({
        id: comments.id,
        findingId: comments.findingId,
        body: comments.body,
        createdAt: comments.createdAt,
      })
      .from(comments)
      .where(
        and(
          inArray(comments.findingId, findingIds),
          isNotNull(comments.findingId),
          eq(comments.auditId, link.auditId),
          eq(comments.workspaceId, link.workspaceId),
        ),
      )
      .orderBy(asc(comments.createdAt));

    for (const row of rows) {
      if (!row.findingId) continue;
      // `authorId` is deliberately not selected. Naming the colleague who wrote a note would
      // expose workspace membership to someone outside the workspace.
      const bucket = notesByFinding.get(row.findingId) ?? [];
      bucket.push({ id: row.id, body: row.body, createdAt: row.createdAt });
      notesByFinding.set(row.findingId, bucket);
    }
  }

  const generatedAt = formatDateTime(context.completedAt ?? context.createdAt);

  return (
    <article className="space-y-8">
      <header className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Shared audit
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-balance">{context.auditName}</h1>

        <dl className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <dt className="sr-only">Revision</dt>
            <RiHistoryLine aria-hidden="true" className="size-3.5 shrink-0" />
            <dd>Revision {context.revision}</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <dt className="sr-only">Period</dt>
            <RiTimeLine aria-hidden="true" className="size-3.5 shrink-0" />
            <dd>{describePeriod(context)}</dd>
          </div>
          {generatedAt ? (
            <div className="flex items-center gap-1.5">
              <dt className="sr-only">Generated</dt>
              <dd>Generated {generatedAt}</dd>
            </div>
          ) : null}
          {context.overallRisk ? (
            <div className="flex items-center gap-1.5">
              <dt className="sr-only">Overall risk</dt>
              <dd>
                <RiskBadge risk={context.overallRisk} />
              </dd>
            </div>
          ) : null}
        </dl>

        {context.objective ? (
          <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
            {context.objective}
          </p>
        ) : null}
      </header>

      {/* Said before anything is read, not in the footnotes: this is one frozen revision, and
          the numbers below are only as good as the evidence behind them. */}
      <aside
        className="flex items-start gap-2.5 rounded-md border border-border bg-muted/40 p-3 text-sm"
        aria-label="About this shared view"
      >
        <RiInformationLine
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-muted-foreground"
        />
        <div className="space-y-1.5 text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">
              This is revision {context.revision}, exactly as it stood when it was shared.
            </span>{" "}
            It is a single point in time. Later revisions, corrections and any work done since
            are not reflected here and will not appear on this page.
          </p>
          <p>
            It is AI-assisted analysis for review by a qualified professional — not an assurance
            opinion and not a substitute for professional judgment. Treat each finding as
            something to verify against the underlying records.
          </p>
          {!includeEvidence || !includeInternalNotes ? (
            <p>
              Parts of this audit were withheld from this link
              {!includeEvidence && !includeInternalNotes
                ? ": evidence excerpts and internal notes"
                : !includeEvidence
                  ? ": evidence excerpts"
                  : ": internal notes"}
              .
            </p>
          ) : null}
        </div>
      </aside>

      {context.summary ? (
        <section aria-labelledby="share-summary" className="space-y-2">
          <h2 id="share-summary" className="text-sm font-medium">
            Summary
          </h2>
          <p className="max-w-prose whitespace-pre-line text-sm leading-relaxed">
            {context.summary}
          </p>
        </section>
      ) : null}

      <Separator />

      <section aria-label="Audit analysis" className="space-y-4">
        {visibleBlocks.length === 0 ? (
          <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
            This revision has no published analysis to show.
          </p>
        ) : (
          visibleBlocks.map((row) => {
            /* jsonb → typed union. The payload was validated against this exact schema before
               it was stored, which is what makes the cast honest rather than a silencer. When
               evidence is out of scope, what is rendered is the redacted copy — the original
               object is never handed to a component. */
            const content = includeEvidence ? row.content : stripExcerpts(row.content);
            const block = content as unknown as AuditBlock;
            return (
              <div key={row.id} className="space-y-2">
                <AuditBlockView block={block} />
                {includeInternalNotes && row.narrativeOverride ? (
                  <p className="rounded-md border border-border bg-muted/40 p-3 text-sm">
                    <span className="font-medium">Reviewer note: </span>
                    {row.narrativeOverride}
                  </p>
                ) : null}
              </div>
            );
          })
        )}
      </section>

      {findingRows.length > 0 ? (
        <>
          <Separator />
          <section aria-labelledby="share-findings" className="space-y-3">
            <h2 id="share-findings" className="text-sm font-medium">
              Findings ({findingRows.length})
            </h2>

            <ul className="space-y-4">
              {findingRows.map((finding) => {
                const impact =
                  finding.financialImpact === null
                    ? null
                    : Number.parseFloat(finding.financialImpact);
                const evidence = evidenceByFinding.get(finding.id) ?? [];
                const notes = notesByFinding.get(finding.id) ?? [];
                const affected = [
                  ...(finding.affectedPeriods ?? []),
                  ...(finding.affectedEntities ?? []),
                  ...(finding.affectedAccounts ?? []),
                ];

                return (
                  <li
                    key={finding.id}
                    className="space-y-3 rounded-lg border border-border p-4"
                  >
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Severity is never colour alone: the badge carries an icon and the
                            word, and survives greyscale printing. */}
                        <SeverityBadge severity={finding.severity} />
                        <ClaimBadge claimType={finding.claimType} />
                        <span className="text-xs text-muted-foreground">
                          {finding.riskCategory}
                        </span>
                      </div>
                      <h3 className="font-medium text-balance">{finding.title}</h3>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {finding.summary}
                      </p>
                    </div>

                    {finding.detail ? (
                      <p className="whitespace-pre-line text-sm leading-relaxed">
                        {finding.detail}
                      </p>
                    ) : null}

                    {/* Rendered only when the model recorded an amount — never a computed or
                        invented figure standing in for one. */}
                    {impact !== null && Number.isFinite(impact) ? (
                      <p className="text-sm">
                        <span className="text-muted-foreground">Estimated impact: </span>
                        <span className="font-medium tabular-nums">
                          {formatMoney(impact, finding.financialImpactCurrency ?? "USD")}
                        </span>
                        {finding.impactBasis ? (
                          <span className="text-muted-foreground"> · {finding.impactBasis}</span>
                        ) : null}
                      </p>
                    ) : null}

                    {affected.length > 0 ? (
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">Affected: </span>
                        {affected.join(", ")}
                      </p>
                    ) : null}

                    <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                      <RiErrorWarningLine aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
                      <span>
                        <span className="font-medium">
                          {finding.confidence === "high"
                            ? "High confidence"
                            : finding.confidence === "medium"
                              ? "Medium confidence"
                              : "Low confidence"}
                        </span>
                        {finding.confidenceNote ? ` · ${finding.confidenceNote}` : ""}
                      </span>
                    </p>

                    {finding.potentialExplanations.length > 0 ? (
                      <div className="space-y-1">
                        <h4 className="text-xs font-medium text-muted-foreground">
                          Possible innocent explanations
                        </h4>
                        <ul className="list-disc space-y-0.5 pl-4 text-sm text-muted-foreground">
                          {finding.potentialExplanations.map((explanation, index) => (
                            <li key={`${finding.id}-explanation-${index}`}>{explanation}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {finding.recommendedFollowup ? (
                      <p className="text-sm">
                        <span className="text-muted-foreground">Recommended follow-up: </span>
                        {finding.recommendedFollowup}
                      </p>
                    ) : null}

                    {finding.recommendedRemediation ? (
                      <p className="text-sm">
                        <span className="text-muted-foreground">Recommended remediation: </span>
                        {finding.recommendedRemediation}
                      </p>
                    ) : null}

                    {includeEvidence && evidence.length > 0 ? (
                      <div className="space-y-1.5">
                        <h4 className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                          <RiFileTextLine aria-hidden="true" className="size-3.5 shrink-0" />
                          Evidence
                        </h4>
                        <ul className="space-y-1.5">
                          {evidence.map((item) => {
                            const locator = describeLocator(item.locator);
                            return (
                              <li
                                key={item.id}
                                className="rounded-md border border-border bg-muted/30 p-2.5 text-xs"
                              >
                                <p className="font-medium">
                                  {item.label ?? "Source"}
                                  {locator ? (
                                    <span className="font-normal text-muted-foreground">
                                      {" "}
                                      · {locator}
                                    </span>
                                  ) : null}
                                </p>
                                {item.excerpt ? (
                                  <blockquote className="mt-1 flex gap-1.5 border-l-2 border-border pl-2 text-muted-foreground">
                                    <RiDoubleQuotesL
                                      aria-hidden="true"
                                      className="mt-0.5 size-3 shrink-0"
                                    />
                                    <span className="whitespace-pre-line italic">
                                      {item.excerpt}
                                    </span>
                                  </blockquote>
                                ) : null}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ) : null}

                    {includeInternalNotes && notes.length > 0 ? (
                      <div className="space-y-1.5">
                        <h4 className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                          <RiChat1Line aria-hidden="true" className="size-3.5 shrink-0" />
                          Internal notes
                        </h4>
                        <ul className="space-y-1.5">
                          {notes.map((note) => (
                            <li
                              key={note.id}
                              className="rounded-md border border-dashed border-border p-2.5 text-xs"
                            >
                              <p className="whitespace-pre-line">{note.body}</p>
                              {formatDateTime(note.createdAt) ? (
                                <p className="mt-1 text-muted-foreground">
                                  {formatDateTime(note.createdAt)}
                                </p>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      ) : null}
    </article>
  );
}
