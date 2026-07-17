import Link from "next/link";
import {
  RiBuilding2Line,
  RiCalendarLine,
  RiFileCopyLine,
  RiFlagLine,
  RiTimeLine,
  RiUserLine,
} from "@remixicon/react";

import { RiskBadge, StatusBadge } from "@/components/audit/badges";
import { Badge } from "@/components/ui/badge";
import { DOMAIN_LABELS, type AuditStatus, type RiskLevel } from "@/lib/audit-filters";
import type { AuditDomain } from "@/lib/ai/blocks/types";

/** Every field PRD §20 requires an audit card to display. */
export type AuditCardData = {
  id: string;
  name: string;
  domain: AuditDomain;
  subcategory: string | null;
  entityName: string | null;
  clientName: string | null;
  periodLabel: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  overallRisk: RiskLevel | null;
  findingCount: number;
  creatorEmail: string | null;
  reviewerEmail: string | null;
  updatedAt: Date;
  status: AuditStatus;
  templateName: string | null;
};

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

export function formatDay(value: Date | string | null): string | null {
  if (!value) return null;
  const date = typeof value === "string" ? new Date(`${value}T00:00:00Z`) : value;
  if (Number.isNaN(date.getTime())) return null;
  return dateFormat.format(date);
}

export function periodText(audit: {
  periodLabel: string | null;
  periodStart: string | null;
  periodEnd: string | null;
}): string | null {
  if (audit.periodLabel) return audit.periodLabel;
  const from = formatDay(audit.periodStart);
  const to = formatDay(audit.periodEnd);
  if (from && to) return `${from} – ${to}`;
  return from ?? to;
}

function Fact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof RiUserLine;
  label: string;
  value: string;
}) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1">
      <Icon aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground/70" />
      <span className="sr-only">{label}: </span>
      <span className="truncate">{value}</span>
    </span>
  );
}

export function AuditCard({ audit, slug }: { audit: AuditCardData; slug: string }) {
  const period = periodText(audit);
  const owner = audit.clientName ?? audit.entityName;

  return (
    <li className="relative rounded-lg border border-border bg-card transition-colors focus-within:ring-2 focus-within:ring-ring hover:bg-accent/40">
      <article className="flex flex-col gap-2.5 p-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <h3 className="truncate font-heading text-sm font-semibold tracking-tight">
              <Link
                href={`/w/${slug}/audits/${audit.id}`}
                className="outline-none after:absolute after:inset-0 focus-visible:underline"
              >
                {audit.name}
              </Link>
            </h3>
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <Badge variant="outline">{DOMAIN_LABELS[audit.domain]}</Badge>
              {audit.subcategory ? <span className="truncate">{audit.subcategory}</span> : null}
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <StatusBadge status={audit.status} />
            {audit.overallRisk ? <RiskBadge risk={audit.overallRisk} /> : null}
          </div>
        </div>

        <dl className="sr-only">
          <dt>Findings</dt>
          <dd>{audit.findingCount}</dd>
        </dl>

        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground sm:grid-cols-3">
          <Fact
            icon={RiFileCopyLine}
            label="Template"
            value={audit.templateName ?? "No template"}
          />
          <Fact icon={RiBuilding2Line} label="Entity or client" value={owner ?? "Not assigned"} />
          <Fact icon={RiCalendarLine} label="Period" value={period ?? "No period"} />
          <Fact
            icon={RiFlagLine}
            label="Findings"
            value={`${audit.findingCount} finding${audit.findingCount === 1 ? "" : "s"}`}
          />
          <Fact icon={RiUserLine} label="Creator" value={audit.creatorEmail ?? "Unknown"} />
          <Fact
            icon={RiTimeLine}
            label="Last updated"
            value={formatDay(audit.updatedAt) ?? "Unknown"}
          />
        </div>

        {audit.reviewerEmail ? (
          <p className="text-xs text-muted-foreground">
            <span className="text-muted-foreground/70">Reviewer:</span> {audit.reviewerEmail}
          </p>
        ) : null}
      </article>
    </li>
  );
}
