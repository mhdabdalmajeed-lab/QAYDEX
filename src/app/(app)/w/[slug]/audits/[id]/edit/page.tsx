import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import {
  RiCheckboxCircleLine,
  RiCloseCircleLine,
  RiErrorWarningLine,
  RiFileList3Line,
  RiInformationLine,
  RiShieldCheckLine,
} from "@remixicon/react";

import { PageHeader } from "@/components/layout/page-header";
import { ActiveInstructions } from "@/components/audit/active-instructions";
import { AuditDetailsForm } from "@/components/audit/audit-details-form";
import { ConflictResolver } from "@/components/audit/conflict-resolver";
import {
  InstructionLibraryLink,
  InstructionPicker,
  type InstructionOption,
} from "@/components/audit/instruction-picker";
import { InputReviewList, type ReviewInput } from "@/components/audit/input-review-list";
import { InputUploader } from "@/components/audit/input-uploader";
import { AUDIT_STATUS_LABEL, DOMAIN_LABEL } from "@/components/audit/labels";
import { RunButton } from "@/components/audit/run-button";
import { TextInputForm } from "@/components/audit/text-input-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { db } from "@/db";
import {
  auditInputs,
  auditInstructionLinks,
  auditRevisions,
  audits,
  inputDocuments,
  templateVersions,
  templates,
  workspaces,
} from "@/db/schema";
import { loadInstructionOptions, resolveInstructions } from "@/lib/ai/instructions";
import { AccessDenied, requireMember, roleHas } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Audit setup" };

/** The steps, in the order an auditor works through them. Used for the in-page nav. */
const STEPS = [
  { id: "step-details", label: "Details" },
  { id: "step-instructions", label: "Instructions" },
  { id: "step-inputs", label: "Inputs" },
  { id: "step-review", label: "Review inputs" },
  { id: "step-run", label: "Run" },
] as const;

export default async function AuditSetupPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;

  const [workspace] = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      settings: workspaces.settings,
    })
    .from(workspaces)
    .where(eq(workspaces.slug, slug))
    .limit(1);

  if (!workspace) notFound();

  let role;
  try {
    const { membership } = await requireMember(workspace.id);
    role = membership.role;
  } catch (error) {
    if (error instanceof AccessDenied) notFound();
    throw error;
  }

  // The workspaceId predicate is the tenant boundary: an audit id from another workspace must
  // read as "not found" here, not as someone else's audit.
  const [audit] = await db
    .select()
    .from(audits)
    .where(and(eq(audits.id, id), eq(audits.workspaceId, workspace.id)))
    .limit(1);

  if (!audit) notFound();

  const canEdit = roleHas(role, "audits.edit");

  const [resolved, instructionRows, links, inputRows, revisions, templateRow] = await Promise.all([
    resolveInstructions(audit.id),
    loadInstructionOptions(workspace.id),
    db
      .select({ instructionId: auditInstructionLinks.instructionId })
      .from(auditInstructionLinks)
      .where(
        and(
          eq(auditInstructionLinks.auditId, audit.id),
          eq(auditInstructionLinks.workspaceId, workspace.id),
        ),
      ),
    db
      .select()
      .from(auditInputs)
      .where(
        and(
          eq(auditInputs.auditId, audit.id),
          eq(auditInputs.workspaceId, workspace.id),
          isNull(auditInputs.removedAt),
        ),
      )
      .orderBy(auditInputs.createdAt),
    db
      .select({
        id: auditRevisions.id,
        revision: auditRevisions.revision,
        status: auditRevisions.status,
      })
      .from(auditRevisions)
      .where(
        and(
          eq(auditRevisions.auditId, audit.id),
          eq(auditRevisions.workspaceId, workspace.id),
        ),
      )
      .orderBy(desc(auditRevisions.revision)),
    audit.templateVersionId
      ? db
          .select({ template: templates, version: templateVersions })
          .from(templateVersions)
          .innerJoin(templates, eq(templates.id, templateVersions.templateId))
          .where(eq(templateVersions.id, audit.templateVersionId))
          .limit(1)
      : Promise.resolve([]),
  ]);

  const inputIds = inputRows.map((row) => row.id);
  const documentRows =
    inputIds.length > 0
      ? await db
          .select({
            id: inputDocuments.id,
            inputId: inputDocuments.inputId,
            kind: inputDocuments.kind,
            name: inputDocuments.name,
            sheetName: inputDocuments.sheetName,
            pageNumber: inputDocuments.pageNumber,
            rowCount: inputDocuments.rowCount,
            truncated: inputDocuments.truncated,
          })
          .from(inputDocuments)
          .where(
            and(
              eq(inputDocuments.workspaceId, workspace.id),
              inArray(inputDocuments.inputId, inputIds),
            ),
          )
          .orderBy(inputDocuments.seq)
      : [];

  const linkedIds = new Set(links.map((link) => link.instructionId));
  const template = templateRow[0] ?? null;

  const instructionOptions: InstructionOption[] = instructionRows
    .map(({ instruction, version }) => ({
      id: instruction.id,
      name: instruction.name,
      description: instruction.description,
      category: instruction.category,
      mandatory: instruction.mandatory,
      priority: instruction.priority,
      version: version.version,
      text: version.text,
      selected: linkedIds.has(instruction.id),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" });

  // A duplicate is an identical checksum, which is a fact rather than a guess. Only the
  // *later* copy is flagged, so the first upload reads as the original.
  const seenChecksums = new Map<string, string>();
  const reviewInputs: ReviewInput[] = inputRows.map((row) => {
    let duplicateOf: string | null = null;
    if (row.checksum) {
      const previous = seenChecksums.get(row.checksum);
      if (previous) duplicateOf = previous;
      else seenChecksums.set(row.checksum, row.name);
    }
    return {
      id: row.id,
      kind: row.kind,
      name: row.name,
      description: row.description,
      status: row.status,
      fileName: row.fileName,
      fileSize: row.fileSize,
      mimeType: row.mimeType,
      textPreview: row.textContent ? row.textContent.slice(0, 400) : null,
      warnings: row.warnings,
      detected: row.detected,
      parseError: row.parseError,
      addedAt: dateFormat.format(row.createdAt),
      documents: documentRows
        .filter((doc) => doc.inputId === row.id)
        .map((doc) => ({
          id: doc.id,
          kind: doc.kind,
          name: doc.name,
          sheetName: doc.sheetName,
          pageNumber: doc.pageNumber,
          rowCount: doc.rowCount,
          truncated: doc.truncated,
        })),
      duplicateOf,
      softRemoveOnly: revisions.length > 0,
    };
  });

  const conflicts = audit.instructionConflicts;
  const unresolvedConflicts = conflicts.filter((conflict) => !conflict.resolution);
  const failedInputs = reviewInputs.filter(
    (input) => input.status === "failed" || input.status === "unsupported",
  );
  const stillParsing = reviewInputs.filter(
    (input) => input.status === "pending" || input.status === "parsing",
  );

  const recommended = template?.version.recommendedInputs ?? [];
  const missingRecommended = recommended.filter(
    (rec) => matchInputs(rec.name, reviewInputs).length === 0,
  );

  const ai = workspace.settings.ai;
  const blockedReason = !roleHas(role, "audits.run")
    ? `Your role (${role.replace(/_/g, " ")}) cannot run audits.`
    : ai?.allowExternalModels === false
      ? "This workspace has disabled sending data to external model providers (Settings › AI data controls)."
      : ai?.rolesAllowedToRunAudits &&
          ai.rolesAllowedToRunAudits.length > 0 &&
          !ai.rolesAllowedToRunAudits.includes(role)
        ? "This workspace restricts who may run audits (Settings › AI data controls)."
        : unresolvedConflicts.length > 0
          ? `Resolve ${unresolvedConflicts.length} instruction conflict${unresolvedConflicts.length === 1 ? "" : "s"} first.`
          : audit.status === "queued" || audit.status === "processing"
            ? "This audit is already running."
            : null;

  return (
    <>
      <PageHeader
        title={audit.name}
        description={
          <span className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline">{DOMAIN_LABEL[audit.domain]}</Badge>
            <Badge variant="outline">{AUDIT_STATUS_LABEL[audit.status] ?? audit.status}</Badge>
            {template ? <Badge variant="outline">{template.template.name}</Badge> : null}
            {audit.periodLabel ? <Badge variant="outline">{audit.periodLabel}</Badge> : null}
          </span>
        }
        breadcrumb={[
          { label: "Audits", href: `/w/${slug}/audits` },
          { label: audit.name, href: `/w/${slug}/audits/${audit.id}` },
          { label: "Setup" },
        ]}
        actions={
          revisions.length > 0 ? (
            <Button render={<Link href={`/w/${slug}/audits/${audit.id}`} />} variant="outline">
              Open the audit
            </Button>
          ) : null
        }
      />

      <main className="flex-1 px-4 py-5 md:px-6">
        <div className="mx-auto flex max-w-4xl flex-col gap-6">
          {!canEdit ? (
            <Alert>
              <RiInformationLine aria-hidden="true" />
              <AlertTitle>Read-only</AlertTitle>
              <AlertDescription>
                Your role ({role.replace(/_/g, " ")}) can see this setup but not change it.
              </AlertDescription>
            </Alert>
          ) : null}

          <nav aria-label="Setup steps">
            <ol className="flex flex-wrap gap-1.5">
              {STEPS.map((step, index) => (
                <li key={step.id}>
                  <a
                    href={`#${step.id}`}
                    className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <span className="text-muted-foreground tabular-nums">{index + 1}</span>
                    {step.label}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <Step
            id="step-details"
            number={1}
            title="Details"
            description="What this audit is for, and the instructions that belong to it alone."
          >
            <AuditDetailsForm
              auditId={audit.id}
              name={audit.name}
              objective={audit.objective}
              scope={audit.scope}
              periodLabel={audit.periodLabel}
              periodStart={audit.periodStart}
              periodEnd={audit.periodEnd}
              customInstructions={audit.customInstructions}
              disabled={!canEdit}
            />
          </Step>

          <Step
            id="step-instructions"
            number={2}
            title="Instructions"
            description="Instructions are how this platform learns your audit method. Everything below is applied in authority order."
          >
            <div className="flex flex-col gap-6">
              <section aria-labelledby="active-instructions-heading" className="flex flex-col gap-2">
                <h3
                  id="active-instructions-heading"
                  className="flex items-center gap-1.5 font-heading text-sm font-semibold"
                >
                  <RiShieldCheckLine aria-hidden="true" className="size-4" />
                  Active for this audit ({resolved.length})
                </h3>
                <ActiveInstructions entries={resolved} />
              </section>

              <section aria-labelledby="pick-instructions-heading" className="flex flex-col gap-2">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3
                    id="pick-instructions-heading"
                    className="flex items-center gap-1.5 font-heading text-sm font-semibold"
                  >
                    <RiFileList3Line aria-hidden="true" className="size-4" />
                    Choose from your library
                  </h3>
                  <InstructionLibraryLink slug={slug} />
                </div>
                <InstructionPicker
                  auditId={audit.id}
                  options={instructionOptions}
                  disabled={!canEdit}
                />
              </section>

              <section aria-labelledby="conflicts-heading" className="flex flex-col gap-2">
                <h3 id="conflicts-heading" className="font-heading text-sm font-semibold">
                  Conflicts
                </h3>
                <ConflictResolver
                  auditId={audit.id}
                  conflicts={conflicts}
                  checked={conflicts.length > 0}
                  disabled={!canEdit}
                />
              </section>
            </div>
          </Step>

          <Step
            id="step-inputs"
            number={3}
            title="Inputs"
            description="Everything you attach stays inside this audit. It does not become workspace-wide accounting data."
          >
            <div className="flex flex-col gap-6">
              {recommended.length > 0 ? (
                <section aria-labelledby="recommended-heading" className="flex flex-col gap-2">
                  <h3 id="recommended-heading" className="font-heading text-sm font-semibold">
                    What this template expects
                  </h3>
                  <ul className="flex flex-col gap-1.5">
                    {recommended.map((rec) => {
                      const matches = matchInputs(rec.name, reviewInputs);
                      return (
                        <li
                          key={rec.name}
                          className="flex items-start gap-2 rounded-lg border border-border p-2.5"
                        >
                          {matches.length > 0 ? (
                            <RiCheckboxCircleLine
                              aria-hidden="true"
                              className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                            />
                          ) : (
                            <RiErrorWarningLine
                              aria-hidden="true"
                              className={
                                rec.required
                                  ? "mt-0.5 size-4 shrink-0 text-destructive"
                                  : "mt-0.5 size-4 shrink-0 text-muted-foreground"
                              }
                            />
                          )}
                          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-sm font-medium">{rec.name}</span>
                              <Badge variant={rec.required ? "secondary" : "outline"}>
                                {rec.required ? "Required by the template" : "Optional"}
                              </Badge>
                              {matches.length > 0 ? (
                                <Badge variant="outline">
                                  Possibly {matches.map((m) => m.name).join(", ")}
                                </Badge>
                              ) : null}
                            </div>
                            <p className="text-xs text-muted-foreground">{rec.description}</p>
                            {rec.formats.length > 0 ? (
                              <p className="font-mono text-xs text-muted-foreground">
                                {rec.formats.join(" · ")}
                              </p>
                            ) : null}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  <p className="text-xs text-muted-foreground">
                    Matching is by file name only — we cannot tell from a name what a file really
                    contains. Treat this as a checklist, not a verdict.
                  </p>
                </section>
              ) : null}

              <section aria-labelledby="upload-heading" className="flex flex-col gap-2">
                <h3 id="upload-heading" className="font-heading text-sm font-semibold">
                  Files
                </h3>
                {canEdit ? (
                  <InputUploader auditId={audit.id} disabled={!canEdit} />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Your role cannot add evidence to this audit.
                  </p>
                )}
              </section>

              {canEdit ? (
                <section aria-labelledby="text-heading" className="flex flex-col gap-2">
                  <h3 id="text-heading" className="font-heading text-sm font-semibold">
                    Written context
                  </h3>
                  <TextInputForm auditId={audit.id} disabled={!canEdit} />
                </section>
              ) : null}
            </div>
          </Step>

          <Step
            id="step-review"
            number={4}
            title="Review inputs"
            description="What was actually read, and what was not. You may proceed even when this is incomplete."
          >
            <div className="flex flex-col gap-4">
              {stillParsing.length > 0 ? (
                <Alert>
                  <RiInformationLine aria-hidden="true" />
                  <AlertTitle>
                    {stillParsing.length} input{stillParsing.length === 1 ? " is" : "s are"} still
                    being read
                  </AlertTitle>
                  <AlertDescription>
                    Reload the page in a moment to see the parse result.
                  </AlertDescription>
                </Alert>
              ) : null}

              {failedInputs.length > 0 ? (
                <Alert variant="destructive">
                  <RiCloseCircleLine aria-hidden="true" />
                  <AlertTitle>
                    {failedInputs.length} file{failedInputs.length === 1 ? "" : "s"} could not be
                    read
                  </AlertTitle>
                  <AlertDescription>
                    They are stored and stay attached, but the model cannot cite rows from them.
                    Re-export them in a readable format if the audit depends on their contents.
                  </AlertDescription>
                </Alert>
              ) : null}

              {missingRecommended.length > 0 ? (
                <Alert>
                  <RiErrorWarningLine aria-hidden="true" />
                  <AlertTitle>
                    {missingRecommended.length} recommended input
                    {missingRecommended.length === 1 ? "" : "s"} not obviously attached
                  </AlertTitle>
                  <AlertDescription>
                    Nothing attached mentions:{" "}
                    {missingRecommended.map((rec) => rec.name).join(", ")}. If a file you uploaded
                    covers one of these, ignore this. Otherwise the audit will run with a gap, and
                    the model will say so rather than assume.
                  </AlertDescription>
                </Alert>
              ) : null}

              <InputReviewList inputs={reviewInputs} disabled={!canEdit} />

              {reviewInputs.length > 0 ? (
                <p className="text-xs text-muted-foreground">
                  Data freshness is whatever the file itself says. Nothing here is inferred: if a
                  period, currency or entity is not stated in the data, it is reported as not
                  determined rather than guessed.
                </p>
              ) : null}
            </div>
          </Step>

          <Step
            id="step-run"
            number={5}
            title="Run"
            description="Every run produces a new revision. Existing revisions are never overwritten."
          >
            <div className="flex flex-col gap-4">
              {reviewInputs.length === 0 ? (
                <Alert>
                  <RiInformationLine aria-hidden="true" />
                  <AlertTitle>No evidence is attached</AlertTitle>
                  <AlertDescription>
                    You can still run this — the model will report that it had nothing to examine
                    rather than invent findings. Most of the time you want to attach something
                    first.
                  </AlertDescription>
                </Alert>
              ) : null}

              <RunButton
                auditId={audit.id}
                workspaceSlug={slug}
                blockedReason={blockedReason}
                hasRevisions={revisions.length > 0}
              />

              {revisions.length > 0 ? (
                <p className="text-xs text-muted-foreground">
                  {revisions.length} revision{revisions.length === 1 ? "" : "s"} so far — the
                  latest is revision {revisions[0].revision} ({revisions[0].status}).
                </p>
              ) : null}
            </div>
          </Step>
        </div>
      </main>
    </>
  );
}

function Step({
  id,
  number,
  title,
  description,
  children,
}: {
  id: string;
  number: number;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-4">
      <div className="flex flex-col gap-1 border-b border-border pb-3">
        <h2 id={`${id}-heading`} className="font-heading text-base font-semibold">
          <span className="mr-2 text-muted-foreground tabular-nums">{number}</span>
          {title}
        </h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="pt-4">{children}</div>
    </section>
  );
}

const STOP_WORDS = new Set([
  "report",
  "file",
  "data",
  "list",
  "export",
  "detail",
  "details",
  "statement",
  "statements",
  "summary",
  "records",
  "record",
]);

/**
 * A deliberately weak, honestly-labelled match between a template's recommended input and the
 * files someone attached. Names are all we have — the alternative would be inventing a claim
 * that a file satisfies a requirement, which is exactly the kind of thing this product must
 * not do (PRD §6.2).
 */
function matchInputs(recommendedName: string, inputs: ReviewInput[]): ReviewInput[] {
  const words = recommendedName
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 3 && !STOP_WORDS.has(word));
  if (words.length === 0) return [];

  return inputs.filter((input) => {
    const haystack = `${input.name} ${input.description ?? ""}`.toLowerCase();
    return words.some((word) => haystack.includes(word));
  });
}
