import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, count, desc, eq, inArray, isNull, or } from "drizzle-orm";
import {
  RiAddLine,
  RiChat3Line,
  RiErrorWarningLine,
  RiSearchEyeLine,
} from "@remixicon/react";

import { NewAuditDialog } from "@/components/audit/new-audit-dialog";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import { db } from "@/db";
import { audits, findingStates, findings, workspaces } from "@/db/schema";
import { AccessDenied, requireMember } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Overview" };

type Params = { params: Promise<{ slug: string }> };

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  queued: "Queued",
  processing: "Processing",
  needs_input: "Needs input",
  completed: "Completed",
  review_needed: "Review needed",
  approved: "Approved",
  failed: "Failed",
  archived: "Archived",
};

/** The statuses worth surfacing on the overview, in the order an auditor triages them. */
const HEADLINE_STATUSES = [
  "needs_input",
  "review_needed",
  "processing",
  "completed",
  "approved",
  "draft",
] as const;

const RISK_VARIANT: Record<string, "destructive" | "secondary" | "outline"> = {
  critical: "destructive",
  high: "destructive",
  medium: "secondary",
  low: "outline",
  none: "outline",
};

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(value);
}

export default async function WorkspaceHomePage({ params }: Params) {
  const { slug } = await params;

  const [workspace] = await db
    .select({ id: workspaces.id, name: workspaces.name })
    .from(workspaces)
    .where(eq(workspaces.slug, slug))
    .limit(1);

  if (!workspace) notFound();

  // The layout guards too, but a page is its own request: it re-establishes access
  // rather than trusting that something upstream did.
  try {
    await requireMember(workspace.id);
  } catch (error) {
    if (error instanceof AccessDenied) notFound();
    throw error;
  }

  const workspaceId = workspace.id;

  const [statusRows, recentAudits, openFindings] = await Promise.all([
    db
      .select({ status: audits.status, total: count() })
      .from(audits)
      .where(eq(audits.workspaceId, workspaceId))
      .groupBy(audits.status),

    db
      .select({
        id: audits.id,
        name: audits.name,
        domain: audits.domain,
        status: audits.status,
        overallRisk: audits.overallRisk,
        findingCount: audits.findingCount,
        periodLabel: audits.periodLabel,
        updatedAt: audits.updatedAt,
      })
      .from(audits)
      .where(and(eq(audits.workspaceId, workspaceId), isNull(audits.archivedAt)))
      .orderBy(desc(audits.updatedAt))
      .limit(6),

    // Only findings from each audit's *current* revision count as open: superseded
    // revisions stay in the database for reproducibility but are not live work.
    db
      .select({
        id: findings.id,
        title: findings.title,
        severity: findings.severity,
        auditId: findings.auditId,
        auditName: audits.name,
      })
      .from(findings)
      .innerJoin(
        audits,
        and(
          eq(audits.id, findings.auditId),
          eq(audits.workspaceId, workspaceId),
          eq(audits.currentRevisionId, findings.revisionId),
        ),
      )
      .leftJoin(findingStates, eq(findingStates.findingId, findings.id))
      .where(
        and(
          eq(findings.workspaceId, workspaceId),
          inArray(findings.severity, ["critical", "high"]),
          or(
            isNull(findingStates.status),
            inArray(findingStates.status, ["open", "in_progress", "disputed"]),
          ),
        ),
      )
      .orderBy(desc(findings.createdAt))
      .limit(8),
  ]);

  const byStatus = new Map(statusRows.map((row) => [row.status, row.total]));
  const totalAudits = statusRows.reduce((sum, row) => sum + row.total, 0);

  return (
    <>
      <PageHeader
        title="Overview"
        actions={
          <>
            <Button render={<Link href={`/w/${slug}/chat/new`} />} variant="outline">
              <RiChat3Line aria-hidden="true" />
              New chat
            </Button>
            <NewAuditDialog workspaceSlug={slug}>
              <Button>
                <RiAddLine aria-hidden="true" />
                New audit
              </Button>
            </NewAuditDialog>
          </>
        }
      />

      <main className="flex-1 px-4 py-5 md:px-6">
        {totalAudits === 0 ? (
          <Empty className="border border-dashed border-border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <RiSearchEyeLine aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>No audits yet</EmptyTitle>
              <EmptyDescription>
                An audit is the unit of work here: you write the instructions
                that describe how your organization audits, attach the evidence, and the
                model produces evidence-linked findings. Everything you upload stays inside
                the audit it was uploaded for.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <NewAuditDialog workspaceSlug={slug}>
                <Button>
                  <RiAddLine aria-hidden="true" />
                  Create your first audit
                </Button>
              </NewAuditDialog>
            </EmptyContent>
          </Empty>
        ) : (
          <div className="flex flex-col gap-5">
            <section aria-labelledby="audit-status-heading">
              <h2 id="audit-status-heading" className="sr-only">
                Audits by status
              </h2>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
                {/* Counts, not links: audits are read from their domain library now, and
                    there is no unfiltered list left to send a status to. */}
                {HEADLINE_STATUSES.map((status) => (
                  <div
                    key={status}
                    className="rounded-lg border border-border bg-card p-3"
                  >
                    <div className="text-2xl font-semibold tabular-nums">
                      {byStatus.get(status) ?? 0}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {STATUS_LABEL[status]}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <div className="grid gap-5 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Recent audits</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ul>
                    {recentAudits.map((audit, index) => (
                      <li key={audit.id}>
                        {index > 0 ? <Separator /> : null}
                        <Link
                          href={`/w/${slug}/audits/${audit.id}`}
                          className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        >
                          <span className="flex min-w-0 flex-1 flex-col">
                            <span className="truncate text-sm font-medium">{audit.name}</span>
                            <span className="truncate text-xs text-muted-foreground">
                              {audit.domain} · {audit.periodLabel ?? "No period"} ·{" "}
                              {audit.findingCount} findings · {formatDate(audit.updatedAt)}
                            </span>
                          </span>
                          {audit.overallRisk ? (
                            <Badge variant={RISK_VARIANT[audit.overallRisk]}>
                              {audit.overallRisk}
                            </Badge>
                          ) : null}
                          <Badge variant="outline">{STATUS_LABEL[audit.status]}</Badge>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">
                    Open high-severity findings
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {openFindings.length === 0 ? (
                    <p className="px-4 pb-4 text-sm text-muted-foreground">
                      Nothing critical or high is open right now.
                    </p>
                  ) : (
                    <ul>
                      {openFindings.map((finding, index) => (
                        <li key={finding.id}>
                          {index > 0 ? <Separator /> : null}
                          <Link
                            href={`/w/${slug}/audits/${finding.auditId}#finding-${finding.id}`}
                            className="flex items-start gap-2.5 px-4 py-2.5 transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                          >
                            <RiErrorWarningLine
                              aria-hidden="true"
                              className={
                                finding.severity === "critical"
                                  ? "mt-0.5 size-4 shrink-0 text-destructive"
                                  : "mt-0.5 size-4 shrink-0 text-muted-foreground"
                              }
                            />
                            <span className="flex min-w-0 flex-col">
                              <span className="truncate text-sm">{finding.title}</span>
                              <span className="truncate text-xs text-muted-foreground">
                                {finding.auditName}
                              </span>
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
