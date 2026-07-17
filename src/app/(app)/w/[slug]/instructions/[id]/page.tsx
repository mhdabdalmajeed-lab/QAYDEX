import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, count, desc, eq, isNull, or } from "drizzle-orm";
import { RiErrorWarningLine, RiGitCommitLine, RiLock2Line } from "@remixicon/react";

import { AuthorityHierarchy } from "@/components/instructions/authority-hierarchy";
import { InstructionActions } from "@/components/instructions/instruction-actions";
import { InstructionForm } from "@/components/instructions/instruction-form";
import {
  AUTHORITY_LABELS,
  CATEGORY_LABELS,
  MODULE_LABELS,
  STATUS_LABELS,
  VISIBILITY_LABELS,
  authorityFor,
  authorityRank,
  isInstructionModule,
} from "@/components/instructions/labels";
import { PageHeader } from "@/components/layout/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { db } from "@/db";
import {
  auditInstructionLinks,
  clients,
  entities,
  instructionVersions,
  instructions,
  templates,
  workspaces,
} from "@/db/schema";
import { AccessDenied, requireMember, roleHas } from "@/lib/auth/guards";
import { displayName, memberEmailMap } from "@/lib/workspace-directory";

/**
 * One instruction: what it says, where it sits in the hierarchy, and every version of it.
 *
 * This page exists to make PRD §9.4 impossible to misread. An audit does not point at an
 * instruction, it pins an `instruction_version_id` — so the history below is not a nicety,
 * it is the record of which words each finished audit was actually generated under.
 * Editing the text appends; it never rewrites. The page says so, and then proves it by
 * showing how many audits are frozen against each version.
 *
 * Drizzle bypasses RLS, so every query below carries `workspace_id` itself.
 */
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Props = { params: Promise<{ slug: string; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  if (!UUID.test(id)) return { title: "Instruction" };

  // Title only. Membership is enforced by the page itself before anything is rendered;
  // this reads a name that a member is about to see anyway.
  const [row] = await db
    .select({ name: instructions.name })
    .from(instructions)
    .where(eq(instructions.id, id))
    .limit(1);

  return { title: row?.name ?? "Instruction" };
}

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const dateTimeFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** A `date` column arrives as `YYYY-MM-DD`; render it without inventing a timezone. */
function formatDay(value: string | null): string | null {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return dateFormat.format(new Date(Date.UTC(year, month - 1, day)));
}

function MetaRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

export default async function InstructionDetailPage({ params }: Props) {
  const { slug, id } = await params;
  if (!UUID.test(id)) notFound();

  const [workspace] = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.slug, slug))
    .limit(1);
  if (!workspace) notFound();

  let role;
  let userId;
  let userEmail;
  try {
    const { membership, user } = await requireMember(workspace.id);
    role = membership.role;
    userId = user.id;
    userEmail = user.email;
  } catch (error) {
    if (error instanceof AccessDenied) notFound();
    throw error;
  }

  const workspaceId = workspace.id;

  // The workspace predicate is what makes a forged id useless against another tenant.
  const [instruction] = await db
    .select()
    .from(instructions)
    .where(and(eq(instructions.id, id), eq(instructions.workspaceId, workspaceId)))
    .limit(1);
  if (!instruction) notFound();

  // A private instruction is its owner's alone — the same rule the library list applies.
  if (instruction.visibility === "private" && instruction.ownerId !== userId) notFound();

  const canManage = roleHas(role, "instructions.manage");

  const [versions, usageByVersion, emails] = await Promise.all([
    db
      .select({
        id: instructionVersions.id,
        version: instructionVersions.version,
        text: instructionVersions.text,
        changelog: instructionVersions.changelog,
        createdBy: instructionVersions.createdBy,
        createdAt: instructionVersions.createdAt,
      })
      .from(instructionVersions)
      .where(
        and(
          eq(instructionVersions.instructionId, id),
          eq(instructionVersions.workspaceId, workspaceId),
        ),
      )
      .orderBy(desc(instructionVersions.version)),

    db
      .select({
        instructionVersionId: auditInstructionLinks.instructionVersionId,
        audits: count(),
      })
      .from(auditInstructionLinks)
      .where(
        and(
          eq(auditInstructionLinks.instructionId, id),
          eq(auditInstructionLinks.workspaceId, workspaceId),
        ),
      )
      .groupBy(auditInstructionLinks.instructionVersionId),

    memberEmailMap(workspaceId),
  ]);

  const auditsBy = new Map(usageByVersion.map((row) => [row.instructionVersionId, row.audits]));
  const usedByAudits = usageByVersion.reduce((sum, row) => sum + row.audits, 0);

  const current = versions.find((version) => version.version === instruction.currentVersion);
  const auditsOnCurrentVersion = current ? (auditsBy.get(current.id) ?? 0) : 0;

  const authority = authorityFor(instruction.category, instruction.mandatory);

  const ownerEmail = instruction.ownerId ? emails.get(instruction.ownerId) : undefined;
  const ownerLabel =
    instruction.ownerId === userId
      ? `${userEmail} (you)`
      : (ownerEmail ?? "No owner — the account that created it has since been removed.");

  const breadcrumb = [
    { label: "Instructions", href: `/w/${slug}/instructions` },
    { label: instruction.name },
  ];

  const [entityRows, clientRows, templateRows] = canManage
    ? await Promise.all([
        db
          .select({ id: entities.id, legalName: entities.legalName })
          .from(entities)
          .where(eq(entities.workspaceId, workspaceId))
          .orderBy(asc(entities.legalName)),
        db
          .select({ id: clients.id, name: clients.name })
          .from(clients)
          .where(eq(clients.workspaceId, workspaceId))
          .orderBy(asc(clients.name)),
        db
          .select({ id: templates.id, name: templates.name })
          .from(templates)
          .where(or(eq(templates.workspaceId, workspaceId), isNull(templates.workspaceId)))
          .orderBy(asc(templates.name)),
      ])
    : [[], [], []];

  const modules = (instruction.applicableModules ?? []).filter(isInstructionModule);
  const entityNames = (instruction.applicableEntityIds ?? []).map(
    (entityId) => entityRows.find((row) => row.id === entityId)?.legalName ?? entityId,
  );
  const effective = formatDay(instruction.effectiveDate);
  const expiration = formatDay(instruction.expirationDate);

  return (
    <>
      <PageHeader
        title={instruction.name}
        description={
          instruction.description ?? "No description — only the text below reaches the model."
        }
        breadcrumb={breadcrumb}
        actions={
          canManage ? (
            <InstructionActions
              workspaceSlug={slug}
              instructionId={instruction.id}
              name={instruction.name}
              status={instruction.status}
              usedByAudits={usedByAudits}
            />
          ) : null
        }
      />

      <main className="flex-1 px-4 py-5 md:px-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-6">
          <section
            aria-labelledby="summary-heading"
            className="rounded-lg border border-border px-4 py-3"
          >
            <h2 id="summary-heading" className="sr-only">
              Summary
            </h2>
            <dl className="grid gap-4 sm:grid-cols-3">
              <MetaRow label="Status">
                <Badge variant={instruction.status === "active" ? "outline" : "ghost"}>
                  {STATUS_LABELS[instruction.status]}
                </Badge>
              </MetaRow>
              <MetaRow label="Category">{CATEGORY_LABELS[instruction.category]}</MetaRow>
              <MetaRow label="Current version">
                <span className="tabular-nums">v{instruction.currentVersion}</span>
                <span className="text-muted-foreground">
                  {" "}
                  of {versions.length} · {versions.length === 1 ? "1 version" : "all kept"}
                </span>
              </MetaRow>

              <MetaRow label="Applies">
                {instruction.mandatory ? (
                  <span className="inline-flex items-center gap-1 font-medium">
                    <RiLock2Line aria-hidden="true" className="size-3.5" />
                    Always, whether or not it is selected
                  </span>
                ) : (
                  "Only when someone attaches it to an audit"
                )}
              </MetaRow>
              <MetaRow label="Priority">
                <span className="tabular-nums">{instruction.priority}</span>
                <span className="text-muted-foreground"> · lower wins ties within its rank</span>
              </MetaRow>
              <MetaRow label="Used by">
                {usedByAudits === 0 ? (
                  <span className="text-muted-foreground">No audits yet</span>
                ) : (
                  `${usedByAudits} audit${usedByAudits === 1 ? "" : "s"}`
                )}
              </MetaRow>

              <MetaRow label="Owner">
                {instruction.ownerId === userId ? "You" : ownerEmail ? (
                  <span title={ownerEmail}>{displayName(ownerEmail)}</span>
                ) : (
                  <span className="text-muted-foreground">Unassigned</span>
                )}
              </MetaRow>
              <MetaRow label="Visibility">{VISIBILITY_LABELS[instruction.visibility]}</MetaRow>
              <MetaRow label="In force">
                {effective || expiration ? (
                  <>
                    {effective ? `From ${effective}` : "Immediately"}
                    {expiration ? ` until ${expiration}` : " onwards"}
                  </>
                ) : (
                  "Immediately, indefinitely"
                )}
              </MetaRow>

              <MetaRow label="Modules">
                {modules.length > 0 ? (
                  modules.map((module) => MODULE_LABELS[module]).join(", ")
                ) : (
                  <span className="text-muted-foreground">Every module</span>
                )}
              </MetaRow>
              <MetaRow label="Entities">
                {entityNames.length > 0 ? (
                  entityNames.join(", ")
                ) : (
                  <span className="text-muted-foreground">Every entity</span>
                )}
              </MetaRow>
              <MetaRow label="Templates">
                {(instruction.applicableTemplateIds ?? []).length > 0 ? (
                  `${instruction.applicableTemplateIds?.length} selected`
                ) : (
                  <span className="text-muted-foreground">Every template</span>
                )}
              </MetaRow>
            </dl>

            {instruction.tags && instruction.tags.length > 0 ? (
              <ul className="mt-4 flex flex-wrap gap-1.5 border-t border-border pt-3">
                {instruction.tags.map((tag) => (
                  <li
                    key={tag}
                    className="rounded-4xl bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                  >
                    {tag}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          <Alert>
            <RiGitCommitLine aria-hidden="true" />
            <AlertTitle>Editing this text will not change any audit that already ran.</AlertTitle>
            <AlertDescription>
              <p>
                Each audit records the exact version of this instruction it was given.
                {usedByAudits > 0
                  ? ` ${usedByAudits} audit${usedByAudits === 1 ? " is" : "s are"} pinned to a version below and ${usedByAudits === 1 ? "keeps its own" : "keep their own"} text and findings.`
                  : " No audit has used it yet."}{" "}
                Saving new text creates version {instruction.currentVersion + 1} and applies from
                then on. Nothing already generated is rewritten, and no old version is deleted.
              </p>
            </AlertDescription>
          </Alert>

          <section
            aria-labelledby="rank-heading"
            className="rounded-lg border border-border px-4 py-3"
          >
            <h2 id="rank-heading" className="font-heading text-sm font-semibold">
              Where this sits in the hierarchy
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              As a{" "}
              {instruction.mandatory ? "mandatory" : "selectable"}{" "}
              {CATEGORY_LABELS[instruction.category].toLowerCase()} instruction, it counts as{" "}
              <strong className="font-medium text-foreground">
                {AUTHORITY_LABELS[authority]}
              </strong>{" "}
              — rank {authorityRank(authority)} of 7.{" "}
              {instruction.mandatory
                ? "It reaches every audit in its scope on its own; the user does not choose it and cannot drop it."
                : "It reaches an audit only when someone attaches it there."}{" "}
              Priority breaks ties within that rank and nothing more: it cannot lift this above an
              instruction that outranks it.
            </p>
          </section>

          {canManage ? (
            <section aria-labelledby="edit-heading" className="flex flex-col gap-4">
              <h2 id="edit-heading" className="font-heading text-sm font-semibold">
                Edit
              </h2>
              <InstructionForm
                workspaceSlug={slug}
                instructionId={instruction.id}
                values={{
                  name: instruction.name,
                  description: instruction.description ?? "",
                  text: current?.text ?? "",
                  category: instruction.category,
                  visibility:
                    instruction.visibility === "system" ? "workspace" : instruction.visibility,
                  priority: instruction.priority,
                  mandatory: instruction.mandatory,
                  status: instruction.status,
                  clientId: instruction.clientId,
                  applicableModules: instruction.applicableModules ?? [],
                  applicableEntityIds: instruction.applicableEntityIds ?? [],
                  applicableTemplateIds: instruction.applicableTemplateIds ?? [],
                  effectiveDate: instruction.effectiveDate ?? "",
                  expirationDate: instruction.expirationDate ?? "",
                }}
                entities={entityRows}
                clients={clientRows}
                templates={templateRows}
                tags={instruction.tags ?? []}
                currentVersion={instruction.currentVersion}
                auditsOnCurrentVersion={auditsOnCurrentVersion}
                ownerLabel={ownerLabel}
              />
            </section>
          ) : (
            <section aria-labelledby="text-heading" className="flex flex-col gap-3">
              <h2 id="text-heading" className="font-heading text-sm font-semibold">
                Instruction text
                <span className="ml-2 font-normal text-muted-foreground">
                  v{instruction.currentVersion}
                </span>
              </h2>
              <pre className="overflow-x-auto rounded-lg border border-border bg-muted/40 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap">
                {current?.text ?? "This instruction has no stored text."}
              </pre>
              <Alert>
                <RiErrorWarningLine aria-hidden="true" />
                <AlertDescription>
                  Your role ({role.replace(/_/g, " ")}) can read instructions but not change them.
                </AlertDescription>
              </Alert>
            </section>
          )}

          <section aria-labelledby="history-heading" className="flex flex-col gap-3">
            <div>
              <h2 id="history-heading" className="font-heading text-sm font-semibold">
                Version history
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Every version this instruction has ever had, oldest kept forever. An audit that
                used one still resolves to it word for word.
              </p>
            </div>

            {versions.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                No versions are stored for this instruction.
              </p>
            ) : (
              <ol className="flex flex-col gap-2">
                {versions.map((version) => {
                  const isCurrent = version.version === instruction.currentVersion;
                  const audits = auditsBy.get(version.id) ?? 0;
                  const authorEmail = version.createdBy
                    ? emails.get(version.createdBy)
                    : undefined;
                  return (
                    <li key={version.id}>
                      <Collapsible
                        defaultOpen={isCurrent}
                        className="rounded-lg border border-border"
                      >
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-2.5">
                          <Badge
                            variant={isCurrent ? "default" : "ghost"}
                            className="tabular-nums"
                          >
                            v{version.version}
                          </Badge>
                          {isCurrent ? (
                            <span className="text-xs font-medium">Current</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Superseded</span>
                          )}

                          <span className="text-xs text-muted-foreground">
                            <time dateTime={version.createdAt.toISOString()}>
                              {dateTimeFormat.format(version.createdAt)}
                            </time>
                            {authorEmail ? (
                              <>
                                {" · "}
                                <span title={authorEmail}>{displayName(authorEmail)}</span>
                              </>
                            ) : null}
                          </span>

                          <span className="ms-auto text-xs tabular-nums text-muted-foreground">
                            {audits === 0
                              ? "No audits pinned"
                              : `${audits} audit${audits === 1 ? "" : "s"} pinned`}
                          </span>

                          <CollapsibleTrigger
                            render={<Button variant="outline" size="sm" />}
                            className="shrink-0"
                          >
                            <span>
                              Text
                              <span className="sr-only"> of version {version.version}</span>
                            </span>
                          </CollapsibleTrigger>
                        </div>

                        <CollapsibleContent>
                          <div className="flex flex-col gap-2 border-t border-border px-3 py-3">
                            {version.changelog ? (
                              <p className="text-xs text-muted-foreground">
                                <span className="font-medium text-foreground">What changed:</span>{" "}
                                {version.changelog}
                              </p>
                            ) : null}
                            <pre className="overflow-x-auto rounded-lg bg-muted/40 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap">
                              {version.text}
                            </pre>
                            {!isCurrent && audits > 0 ? (
                              <p className="text-xs text-muted-foreground">
                                {audits} finished audit{audits === 1 ? "" : "s"} still{" "}
                                {audits === 1 ? "reads" : "read"} exactly this text. Editing the
                                instruction cannot reach {audits === 1 ? "it" : "them"}.
                              </p>
                            ) : null}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          <AuthorityHierarchy highlight={authority} />

          <p className="text-xs text-muted-foreground">
            Created {dateTimeFormat.format(instruction.createdAt)} · last changed{" "}
            {dateTimeFormat.format(instruction.updatedAt)} ·{" "}
            <Link
              href={`/w/${slug}/instructions`}
              className="underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              Back to the library
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}
