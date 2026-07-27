import { and, desc, eq } from "drizzle-orm";
import { authUsers } from "drizzle-orm/supabase";
import type { Metadata } from "next";
import Link from "next/link";
import { RiArrowLeftSLine, RiFileLine, RiLockLine } from "@remixicon/react";

import { ExportForm, type ExportRevisionOption } from "@/components/audit/export-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
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
import { exports } from "@/db/schema";
import { FORMAT_META, fmtFileSize, kindMeta } from "@/lib/export/types";
import { getAuditContext, listRevisions } from "@/server/queries/audit";

/**
 * The export page (PRD §24).
 *
 * Reads the audit's revisions and its export history, then hands the composer to the client.
 * Two things are deliberate:
 *
 *  - A role without `audits.export` gets a plain refusal panel, not a 403 interrupt. The audit
 *    is still readable to them; only the deliverable is not theirs to produce, and the page says
 *    which role restriction did it.
 *  - The history lists failed exports with their error. An export that crashed leaves a trace
 *    rather than vanishing (PRD §25.3), and hiding the failures here would undo that.
 *
 * Drizzle bypasses RLS, so every query below carries its own workspace predicate.
 */

type Params = { params: Promise<{ slug: string; id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug, id } = await params;
  const { audit } = await getAuditContext(slug, id);
  return { title: `Export · ${audit.name}` };
}

export default async function ExportPage({ params }: Params) {
  const { slug, id } = await params;
  const { audit, workspace, membership, can } = await getAuditContext(slug, id);

  const back = `/w/${slug}/audits/${audit.id}`;

  const header = (
    <div className="px-4 py-4 md:px-6">
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2 mb-1 h-7 text-muted-foreground"
        render={<Link href={back} />}
      >
        <RiArrowLeftSLine aria-hidden />
        Back to audit
      </Button>
      <div className="flex min-w-0 items-center gap-1.5">
        <SidebarTrigger className="-ml-1.5 shrink-0 text-muted-foreground" />
        <h1 className="text-xl font-semibold">Export</h1>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{audit.name}</p>
    </div>
  );

  if (!can("audits.export")) {
    return (
      <main className="flex min-w-0 flex-1 flex-col">
        {header}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="mx-auto w-full max-w-3xl">
            <Empty className="rounded-xl border border-border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <RiLockLine aria-hidden />
                </EmptyMedia>
                <EmptyTitle>You cannot export this audit</EmptyTitle>
                <EmptyDescription>
                  Your role in {workspace.name} is{" "}
                  <span className="font-medium text-foreground">
                    {membership.role.replace(/_/g, " ")}
                  </span>
                  , which can read this audit but not produce a deliverable from it. An owner or
                  administrator can change that in Settings › Members.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        </div>
      </main>
    );
  }

  const revisions = await listRevisions(workspace.id, audit.id);

  const options: ExportRevisionOption[] = revisions.map((r) => ({
    id: r.id,
    revision: r.revision,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    isCurrent: r.id === audit.currentRevisionId,
  }));

  const defaultRevisionId =
    options.find((r) => r.isCurrent)?.id ??
    options.find((r) => r.status === "approved")?.id ??
    options[0]?.id ??
    "";

  const history = await db
    .select({
      id: exports.id,
      kind: exports.kind,
      format: exports.format,
      status: exports.status,
      fileSize: exports.fileSize,
      error: exports.error,
      createdAt: exports.createdAt,
      createdByEmail: authUsers.email,
    })
    .from(exports)
    .leftJoin(authUsers, eq(authUsers.id, exports.createdBy))
    .where(and(eq(exports.workspaceId, workspace.id), eq(exports.auditId, audit.id)))
    .orderBy(desc(exports.createdAt))
    .limit(50);

  return (
    <main className="flex min-w-0 flex-1 flex-col">
      {header}

      <div className="flex-1 overflow-y-auto px-6 pb-16 pt-6">
        <div className="mx-auto w-full max-w-3xl space-y-10">
          {options.length === 0 ? (
            <Empty className="rounded-xl border border-border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <RiFileLine aria-hidden />
                </EmptyMedia>
                <EmptyTitle>Nothing to export yet</EmptyTitle>
                <EmptyDescription>
                  An export is rendered from a revision, and this audit has not produced one. Run
                  the audit first.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ExportForm
              auditId={audit.id}
              revisions={options}
              defaultRevisionId={defaultRevisionId}
            />
          )}

          <section aria-labelledby="export-history" className="space-y-3">
            <div>
              <h2 id="export-history" className="text-sm font-medium">
                Past exports
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Every attempt is recorded, including the ones that failed.
              </p>
            </div>

            {history.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
                No exports have been generated from this audit.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Deliverable</TableHead>
                      <TableHead>Format</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Size</TableHead>
                      <TableHead>By</TableHead>
                      <TableHead>When</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{kindMeta(row.kind).label}</TableCell>
                        <TableCell>{FORMAT_META[row.format].label}</TableCell>
                        <TableCell>
                          <ExportStatus status={row.status} error={row.error} />
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {fmtFileSize(row.fileSize)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {row.createdByEmail ?? "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          <time dateTime={row.createdAt.toISOString()}>
                            {row.createdAt.toLocaleString("en-GB", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </time>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

/** Status never rides on colour alone — the word carries it (PRD §26.4). */
function ExportStatus({
  status,
  error,
}: {
  status: "pending" | "running" | "completed" | "failed";
  error: string | null;
}) {
  if (status === "failed") {
    return (
      <span className="space-y-1">
        <Badge variant="destructive">Failed</Badge>
        {error ? (
          <span className="block max-w-64 text-xs leading-relaxed text-muted-foreground">
            {error}
          </span>
        ) : null}
      </span>
    );
  }
  if (status === "completed") return <Badge variant="secondary">Completed</Badge>;
  if (status === "running") return <Badge variant="outline">Running</Badge>;
  return <Badge variant="outline">Pending</Badge>;
}
