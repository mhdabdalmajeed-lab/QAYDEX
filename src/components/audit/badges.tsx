import {
  RiAlarmWarningLine,
  RiArchiveLine,
  RiCheckDoubleLine,
  RiCheckboxCircleLine,
  RiCloseCircleLine,
  RiDraftLine,
  RiErrorWarningLine,
  RiEyeLine,
  RiInformationLine,
  RiLoader4Line,
  RiQuestionLine,
  RiShieldCheckLine,
  RiTimeLine,
  type RemixiconComponentType,
} from "@remixicon/react";

import { Badge } from "@/components/ui/badge";
import {
  RISK_LABELS,
  SEVERITY_LABELS,
  STATUS_LABELS,
  type AuditStatus,
  type RiskLevel,
  type SeverityLevel,
} from "@/lib/audit-filters";
import { cn } from "@/lib/utils";

/**
 * Status, risk and severity are **never** communicated by colour alone: each badge
 * carries an icon and a word (PRD §26.4 / WCAG 1.4.1). Colour is the third signal, not
 * the first.
 */

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

const STATUS_ICONS: Record<AuditStatus, RemixiconComponentType> = {
  draft: RiDraftLine,
  queued: RiTimeLine,
  processing: RiLoader4Line,
  needs_input: RiQuestionLine,
  completed: RiCheckboxCircleLine,
  review_needed: RiEyeLine,
  approved: RiShieldCheckLine,
  failed: RiCloseCircleLine,
  archived: RiArchiveLine,
};

const STATUS_VARIANTS: Record<AuditStatus, BadgeVariant> = {
  draft: "outline",
  queued: "outline",
  processing: "secondary",
  needs_input: "secondary",
  completed: "secondary",
  review_needed: "secondary",
  approved: "default",
  failed: "destructive",
  archived: "outline",
};

export function StatusBadge({ status, className }: { status: AuditStatus; className?: string }) {
  const Icon = STATUS_ICONS[status];
  return (
    <Badge variant={STATUS_VARIANTS[status]} className={cn("gap-1", className)}>
      <Icon aria-hidden="true" className={status === "processing" ? "animate-spin" : undefined} />
      {STATUS_LABELS[status]}
    </Badge>
  );
}

const RISK_ICONS: Record<RiskLevel, RemixiconComponentType> = {
  critical: RiAlarmWarningLine,
  high: RiErrorWarningLine,
  medium: RiInformationLine,
  low: RiCheckboxCircleLine,
  none: RiCheckDoubleLine,
};

const RISK_VARIANTS: Record<RiskLevel, BadgeVariant> = {
  critical: "destructive",
  high: "destructive",
  medium: "secondary",
  low: "outline",
  none: "outline",
};

export function RiskBadge({ risk, className }: { risk: RiskLevel; className?: string }) {
  const Icon = RISK_ICONS[risk];
  return (
    <Badge variant={RISK_VARIANTS[risk]} className={cn("gap-1", className)}>
      <Icon aria-hidden="true" />
      {RISK_LABELS[risk]}
    </Badge>
  );
}

const SEVERITY_ICONS: Record<SeverityLevel, RemixiconComponentType> = {
  critical: RiAlarmWarningLine,
  high: RiErrorWarningLine,
  medium: RiInformationLine,
  low: RiInformationLine,
  info: RiInformationLine,
};

/**
 * Inline severity marker for dense rows. The word is `sr-only` where the surrounding
 * text already names the severity; pass `showLabel` when it does not.
 */
export function SeverityMark({
  severity,
  showLabel = true,
  className,
}: {
  severity: SeverityLevel;
  showLabel?: boolean;
  className?: string;
}) {
  const Icon = SEVERITY_ICONS[severity];
  const emphasised = severity === "critical" || severity === "high";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs",
        emphasised ? "text-destructive" : "text-muted-foreground",
        className,
      )}
    >
      <Icon aria-hidden="true" className="size-3.5 shrink-0" />
      <span className={showLabel ? undefined : "sr-only"}>{SEVERITY_LABELS[severity]}</span>
    </span>
  );
}
