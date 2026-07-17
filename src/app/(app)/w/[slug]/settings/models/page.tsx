import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, isNull, or } from "drizzle-orm";
import { RiCheckLine, RiErrorWarningLine, RiLock2Line, RiStarLine } from "@remixicon/react";

import { PageHeader } from "@/components/layout/page-header";
import {
  MODEL_STATUS_DESCRIPTIONS,
  MODEL_STATUS_LABELS,
} from "@/components/settings/options";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { db } from "@/db";
import { approvedModels, workspaces } from "@/db/schema";
import { BLOCK_SCHEMA_VERSION, FALLBACK_MODEL_ID, PROMPT_VERSION } from "@/lib/ai/models";
import { firstParam } from "@/lib/audit-filters";
import { AccessDenied, requireMember, roleHas } from "@/lib/auth/guards";
import { clearModelOverride, setDefaultModel, setModelStatus } from "@/server/actions/settings";

/**
 * Approved models (PRD §23).
 *
 * The rule this page exists to enforce: **an audit must not silently change because a new
 * model shipped this morning.** The engine's `resolveModel` never asks for "the latest" —
 * it reads this table, prefers the workspace's own default, and falls back to the
 * platform's. Every completed audit records the exact model id, prompt version and schema
 * version it used, so a finding can always be traced to the machinery that produced it.
 *
 * A workspace never edits the platform's rows. Approving or deprecating here writes an
 * override of this workspace's own, which is why "Return to platform decision" exists.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Approved models" };

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const SAVED_MESSAGES: Record<string, string> = {
  status: "The model's status was changed. Audits already completed keep the model they recorded.",
  default:
    "The default was changed. It applies to runs started from now on — no existing audit is re-run or rewritten.",
  cleared: "This workspace's decision was removed. The platform registry governs the model again.",
};

function statusBadge(status: "approved" | "candidate" | "deprecated") {
  const variant = status === "approved" ? "outline" : status === "candidate" ? "secondary" : "ghost";
  return <Badge variant={variant}>{MODEL_STATUS_LABELS[status]}</Badge>;
}

export default async function ModelsSettingsPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = await searchParams;

  const [workspace] = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.slug, slug))
    .limit(1);
  if (!workspace) notFound();

  let canApprove = false;
  try {
    const { membership } = await requireMember(workspace.id);
    canApprove = roleHas(membership.role, "models.approve");
  } catch (error) {
    if (error instanceof AccessDenied) notFound();
    throw error;
  }

  // Platform rows plus this workspace's overrides — and nothing from any other tenant.
  const scopeFilter = or(
    isNull(approvedModels.workspaceId),
    eq(approvedModels.workspaceId, workspace.id),
  );
  const rows = scopeFilter
    ? await db.select().from(approvedModels).where(scopeFilter).orderBy(approvedModels.label)
    : [];

  const platformRows = rows.filter((row) => row.workspaceId === null);
  const scopedRows = rows.filter((row) => row.workspaceId === workspace.id);
  const scopedBy = new Map(scopedRows.map((row) => [row.modelId, row]));

  // Exactly the choice `resolveModel` makes, computed the same way rather than guessed at.
  const approved = rows.filter((row) => row.status === "approved");
  const approvedScoped = approved.filter((row) => row.workspaceId === workspace.id);
  const approvedGlobal = approved.filter((row) => row.workspaceId === null);
  const effective =
    approvedScoped.find((row) => row.isDefault) ??
    approvedGlobal.find((row) => row.isDefault) ??
    approvedGlobal[0] ??
    null;

  type ModelStatus = (typeof approvedModels.$inferSelect)["status"];

  type RegistryEntry = {
    modelId: string;
    label: string;
    contextWindow: number | null;
    evalNotes: string | null;
    /** Null when this workspace approved a model the platform registry does not carry. */
    platformStatus: ModelStatus | null;
    /** Null when this workspace has recorded no decision of its own. */
    scopedStatus: ModelStatus | null;
    status: ModelStatus;
    scopedDefault: boolean;
    platformDefault: boolean;
    approvedAt: Date | null;
  };

  const registry: RegistryEntry[] = platformRows.map((platform) => {
    const scoped = scopedBy.get(platform.modelId) ?? null;
    return {
      modelId: platform.modelId,
      label: scoped?.label ?? platform.label,
      contextWindow: scoped?.contextWindow ?? platform.contextWindow,
      evalNotes: scoped?.evalNotes ?? platform.evalNotes,
      platformStatus: platform.status,
      scopedStatus: scoped?.status ?? null,
      status: scoped?.status ?? platform.status,
      scopedDefault: scoped?.isDefault ?? false,
      platformDefault: platform.isDefault,
      approvedAt: scoped?.approvedAt ?? null,
    };
  });

  // A workspace override for a model the platform no longer ships would otherwise vanish.
  for (const scoped of scopedRows) {
    if (registry.some((entry) => entry.modelId === scoped.modelId)) continue;
    registry.push({
      modelId: scoped.modelId,
      label: scoped.label,
      contextWindow: scoped.contextWindow,
      evalNotes: scoped.evalNotes,
      platformStatus: null,
      scopedStatus: scoped.status,
      status: scoped.status,
      scopedDefault: scoped.isDefault,
      platformDefault: false,
      approvedAt: scoped.approvedAt,
    });
  }

  const saved = firstParam(query.saved);
  const error = firstParam(query.error);

  return (
    <>
      <PageHeader
        breadcrumb={[
          { label: "Settings", href: `/w/${slug}/settings` },
          { label: "Approved models" },
        ]}
        title="Approved models"
        description="Which models this workspace's audits may run on, and which one they use by default."
      />

      <main className="flex flex-1 flex-col gap-5 px-4 py-5 md:px-6">
        <Alert>
          <RiStarLine aria-hidden="true" />
          <AlertTitle>Why this page exists</AlertTitle>
          <AlertDescription>
            Audits must not change because a newer model shipped. The engine never asks a
            provider for its latest model — it reads this table, and prefers this
            workspace&rsquo;s default over the platform&rsquo;s. Every completed audit records
            the exact model it ran on, so a finding stays traceable to the machinery that
            produced it. Changing anything here moves future runs only.
          </AlertDescription>
        </Alert>

        {saved && SAVED_MESSAGES[saved] ? (
          <Alert>
            <RiCheckLine aria-hidden="true" />
            <AlertTitle>Saved</AlertTitle>
            <AlertDescription>{SAVED_MESSAGES[saved]}</AlertDescription>
          </Alert>
        ) : null}

        {error ? (
          <Alert variant="destructive">
            <RiErrorWarningLine aria-hidden="true" />
            <AlertTitle>Nothing was changed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {!canApprove ? (
          <Alert>
            <RiLock2Line aria-hidden="true" />
            <AlertTitle>You can read the registry but not change it</AlertTitle>
            <AlertDescription>
              Approving, deprecating or defaulting a model needs the{" "}
              <code>models.approve</code> permission, which your role does not have.
            </AlertDescription>
          </Alert>
        ) : null}

        <dl className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-3">
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">Model the next run will use</dt>
            <dd className="font-mono text-sm font-medium">
              {effective ? effective.modelId : FALLBACK_MODEL_ID}
              {!effective ? (
                <span className="ml-1.5 font-sans text-xs font-normal text-muted-foreground">
                  (fallback — nothing is approved)
                </span>
              ) : effective.workspaceId === workspace.id ? (
                <span className="ml-1.5 font-sans text-xs font-normal text-muted-foreground">
                  (this workspace&rsquo;s default)
                </span>
              ) : (
                <span className="ml-1.5 font-sans text-xs font-normal text-muted-foreground">
                  (platform default)
                </span>
              )}
            </dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">Prompt version</dt>
            <dd className="font-mono text-sm font-medium">{PROMPT_VERSION}</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">Block schema version</dt>
            <dd className="font-mono text-sm font-medium">{BLOCK_SCHEMA_VERSION}</dd>
          </div>
        </dl>

        {registry.length === 0 ? (
          <Empty className="border border-dashed border-border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <RiErrorWarningLine aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>The model registry is empty</EmptyTitle>
              <EmptyDescription>
                No model is recorded on this deployment, so runs fall back to{" "}
                <code>{FALLBACK_MODEL_ID}</code>. The registry is populated by the platform
                seed, not from this page.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-64">Model</TableHead>
                  <TableHead className="w-32">Status</TableHead>
                  <TableHead className="w-36">Decided by</TableHead>
                  <TableHead className="w-28 text-right">Context</TableHead>
                  <TableHead className="min-w-72">Evaluation</TableHead>
                  <TableHead className="w-56">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registry.map((entry) => {
                  const isEffective = effective?.modelId === entry.modelId;
                  return (
                    <TableRow key={entry.modelId}>
                      <TableCell className="align-top">
                        <span className="block text-sm font-medium">{entry.label}</span>
                        <code className="block font-mono text-[11px] text-muted-foreground">
                          {entry.modelId}
                        </code>
                        {entry.scopedDefault ? (
                          <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium">
                            <RiStarLine aria-hidden="true" className="size-3.5" />
                            Workspace default
                          </span>
                        ) : isEffective ? (
                          <span className="mt-1 block text-xs text-muted-foreground">
                            In use — inherited from the platform
                          </span>
                        ) : null}
                      </TableCell>

                      <TableCell className="align-top">
                        {statusBadge(entry.status)}
                        <span className="mt-1 block text-[11px] text-muted-foreground">
                          {MODEL_STATUS_DESCRIPTIONS[entry.status]}
                        </span>
                      </TableCell>

                      <TableCell className="align-top text-xs">
                        {entry.scopedStatus ? (
                          <>
                            <span className="block font-medium">This workspace</span>
                            {entry.platformStatus ? (
                              <span className="block text-muted-foreground">
                                Platform says {MODEL_STATUS_LABELS[entry.platformStatus]}
                              </span>
                            ) : (
                              <span className="block text-muted-foreground">
                                Not in the platform registry
                              </span>
                            )}
                            {entry.approvedAt ? (
                              <time
                                dateTime={entry.approvedAt.toISOString()}
                                className="block text-muted-foreground tabular-nums"
                              >
                                {entry.approvedAt.toLocaleDateString("en-GB", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </time>
                            ) : null}
                          </>
                        ) : (
                          <span className="text-muted-foreground">Platform registry</span>
                        )}
                      </TableCell>

                      <TableCell className="text-right align-top text-xs tabular-nums">
                        {entry.contextWindow ? (
                          <>
                            {Math.round(entry.contextWindow / 1000).toLocaleString("en-GB")}K
                            <span className="sr-only"> tokens</span>
                          </>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      <TableCell className="align-top">
                        <p className="max-w-lg text-xs leading-relaxed text-muted-foreground">
                          {entry.evalNotes ?? "No evaluation recorded."}
                        </p>
                      </TableCell>

                      <TableCell className="align-top">
                        {canApprove ? (
                          <div className="flex flex-wrap items-center gap-1.5">
                            {entry.status !== "approved" ? (
                              <form action={setModelStatus}>
                                <input type="hidden" name="workspaceSlug" value={slug} />
                                <input type="hidden" name="modelId" value={entry.modelId} />
                                <input type="hidden" name="status" value="approved" />
                                <Button type="submit" variant="outline" size="sm" className="h-7">
                                  Approve
                                </Button>
                              </form>
                            ) : (
                              <>
                                {!entry.scopedDefault ? (
                                  <form action={setDefaultModel}>
                                    <input type="hidden" name="workspaceSlug" value={slug} />
                                    <input type="hidden" name="modelId" value={entry.modelId} />
                                    <Button
                                      type="submit"
                                      variant="outline"
                                      size="sm"
                                      className="h-7"
                                    >
                                      Make default
                                    </Button>
                                  </form>
                                ) : null}
                                <form action={setModelStatus}>
                                  <input type="hidden" name="workspaceSlug" value={slug} />
                                  <input type="hidden" name="modelId" value={entry.modelId} />
                                  <input type="hidden" name="status" value="deprecated" />
                                  <Button type="submit" variant="ghost" size="sm" className="h-7">
                                    Deprecate
                                  </Button>
                                </form>
                              </>
                            )}

                            {entry.scopedStatus && entry.platformStatus ? (
                              <form action={clearModelOverride}>
                                <input type="hidden" name="workspaceSlug" value={slug} />
                                <input type="hidden" name="modelId" value={entry.modelId} />
                                <Button type="submit" variant="ghost" size="sm" className="h-7">
                                  Return to platform decision
                                </Button>
                              </form>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        <p className="max-w-3xl text-xs text-muted-foreground">
          Deprecating a model never hides the audits that ran on it: they keep their recorded
          model id and stay readable and comparable. Every change here is written to the{" "}
          <Link
            href={`/w/${slug}/settings/activity?type=approved_model`}
            className="underline underline-offset-4"
          >
            audit trail
          </Link>
          .
        </p>
      </main>
    </>
  );
}
