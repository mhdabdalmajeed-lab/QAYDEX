import {
  RiAlertLine,
  RiArchiveLine,
  RiArrowRightDownLine,
  RiArrowRightUpLine,
  RiBuilding2Line,
  RiCalendarLine,
  RiCheckboxCircleLine,
  RiCloseCircleLine,
  RiCompassLine,
  RiErrorWarningLine,
  RiEqualLine,
  RiFocus3Line,
  RiForbid2Line,
  RiInformationLine,
  RiMailSendLine,
  RiMicroscopeLine,
  RiPriceTag3Line,
  RiQuestionLine,
  RiShieldCheckLine,
  RiSubtractLine,
  RiUserStarLine,
} from "@remixicon/react";
import type { ComponentType, ReactNode } from "react";

import { BlockShell, ClaimBadge, EvidenceChips, MissingEvidenceNote, SeverityBadge } from "@/components/blocks/shared";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { EvidenceInput } from "@/lib/ai/blocks/primitives";
import type { BlockOf } from "@/lib/ai/blocks/schemas";
import type { Confidence, RiskLevel } from "@/lib/ai/blocks/types";
import { cn } from "@/lib/utils";

/**
 * The narrative frame and closing blocks (PRD §18.2): the prose an auditor reads first and last.
 *
 * These blocks carry no charts, so they render on the server. Three rules bind every component
 * in this file:
 *
 *  - **Colour is never the only signal** (PRD §26.4). Risk, confidence and conclusion state each
 *    ship an icon and a word alongside their tint.
 *  - **A guess must not look like a fact** (PRD §10.5, §31). Every block shows its `claimType`,
 *    and anything weaker than `evidence_supported` is additionally framed so a skimming reader
 *    cannot mistake it for a finding.
 *  - **Numbers are formatted, never raw.** Counts go through `Intl.NumberFormat`; money goes
 *    through the shared helpers.
 */

/* -------------------------------------------------------------------------- */
/* Local presentation vocabulary                                              */
/* -------------------------------------------------------------------------- */

const countFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });

function formatCount(value: number): string {
  return countFormatter.format(value);
}

/**
 * `RiskLevel` includes `none`, which `Severity` does not, so severity's badge cannot be reused
 * here. Same contract though: icon + word + tint, never tint alone.
 */
const RISK_META: Record<
  RiskLevel,
  { label: string; icon: ComponentType<{ className?: string }>; className: string }
> = {
  critical: {
    label: "Critical",
    icon: RiErrorWarningLine,
    className: "border-destructive/40 bg-destructive/10 text-destructive",
  },
  high: {
    label: "High",
    icon: RiAlertLine,
    className: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  medium: {
    label: "Medium",
    icon: RiInformationLine,
    className: "border-border bg-muted text-foreground",
  },
  low: {
    label: "Low",
    icon: RiCheckboxCircleLine,
    className: "border-border bg-muted/50 text-muted-foreground",
  },
  none: {
    label: "None",
    icon: RiShieldCheckLine,
    className: "border-border bg-transparent text-muted-foreground",
  },
};

function RiskBadge({
  risk,
  className,
  size = "default",
}: {
  risk: RiskLevel;
  className?: string;
  size?: "default" | "lg";
}) {
  const meta = RISK_META[risk];
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border font-medium",
        size === "lg" ? "gap-2 px-3 py-1.5 text-sm" : "px-2 py-0.5 text-xs",
        meta.className,
        className,
      )}
    >
      <Icon className={cn("shrink-0", size === "lg" ? "size-4" : "size-3.5")} aria-hidden />
      <span>{meta.label}</span>
      <span className="sr-only">risk</span>
    </span>
  );
}

const CONFIDENCE_META: Record<Confidence, { label: string; icon: ComponentType<{ className?: string }> }> = {
  high: { label: "High confidence", icon: RiCheckboxCircleLine },
  medium: { label: "Medium confidence", icon: RiInformationLine },
  low: { label: "Low confidence", icon: RiQuestionLine },
};

function ConfidenceBadge({ confidence, className }: { confidence: Confidence; className?: string }) {
  const meta = CONFIDENCE_META[confidence];
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium",
        confidence === "low"
          ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
          : "border-border bg-muted/50 text-muted-foreground",
        className,
      )}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {meta.label}
    </span>
  );
}

const AUDIENCE_LABELS: Record<"board" | "management" | "finance_team" | "auditor", string> = {
  board: "Written for the board",
  management: "Written for management",
  finance_team: "Written for the finance team",
  auditor: "Written for an auditor",
};

/** A muted meta chip: a fact about the block rather than a claim inside it. */
function MetaChip({ icon: Icon, children }: { icon?: ComponentType<{ className?: string }>; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground">
      {Icon ? <Icon className="size-3.5 shrink-0" aria-hidden /> : null}
      {children}
    </span>
  );
}

/** A small labelled section heading inside a block. Not an <h*> — the block owns the heading level. */
function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{children}</span>
  );
}

function Prose({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("text-sm leading-relaxed text-foreground", className)}>{children}</p>;
}

function BulletList({ items, className }: { items: readonly string[]; className?: string }) {
  if (items.length === 0) return null;
  return (
    <ul className={cn("space-y-1.5 text-sm leading-relaxed text-foreground", className)}>
      {items.map((item, i) => (
        <li key={`${i}-${item}`} className="flex gap-2">
          <span className="mt-2 size-1 shrink-0 rounded-full bg-muted-foreground" aria-hidden />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function ChipList({
  items,
  icon,
  emptyLabel,
}: {
  items: readonly string[];
  icon?: ComponentType<{ className?: string }>;
  emptyLabel: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm italic text-muted-foreground">{emptyLabel}</p>;
  }
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((item, i) => (
        <li key={`${i}-${item}`}>
          <MetaChip icon={icon}>{item}</MetaChip>
        </li>
      ))}
    </ul>
  );
}

/**
 * Commentary and citations close every block, in that order, so the reader always finds the
 * sources in the same place.
 */
function BlockFooter({
  commentary,
  evidence,
  requireEvidence = true,
}: {
  commentary: string | null;
  evidence: EvidenceInput[];
  /** Appendices and definitions legitimately cite nothing; a stated fact does not. */
  requireEvidence?: boolean;
}) {
  const hasCommentary = commentary !== null && commentary.trim() !== "";
  const hasEvidence = evidence.length > 0;
  if (!hasCommentary && !hasEvidence && !requireEvidence) return null;

  return (
    <div className="mt-4 space-y-2 border-t border-border pt-3">
      {hasCommentary ? <p className="text-sm leading-relaxed text-muted-foreground">{commentary}</p> : null}
      {hasEvidence ? <EvidenceChips evidence={evidence} /> : requireEvidence ? <MissingEvidenceNote /> : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* executive_summary                                                          */
/* -------------------------------------------------------------------------- */

const FINDING_COUNT_META: {
  key: "critical" | "high" | "medium" | "low" | "info";
  label: string;
  className: string;
}[] = [
  { key: "critical", label: "Critical", className: "text-destructive" },
  { key: "high", label: "High", className: "text-amber-700 dark:text-amber-300" },
  { key: "medium", label: "Medium", className: "text-foreground" },
  { key: "low", label: "Low", className: "text-muted-foreground" },
  { key: "info", label: "Info", className: "text-muted-foreground" },
];

export function ExecutiveSummaryBlock({ block }: { block: BlockOf<"executive_summary"> }) {
  const totalFindings = FINDING_COUNT_META.reduce((sum, meta) => sum + block.findingCounts[meta.key], 0);

  return (
    <BlockShell
      title={block.title}
      headingLevel={2}
      claim={<ClaimBadge claimType={block.claimType} />}
      actions={<RiskBadge risk={block.overallRisk} />}
    >
      <p className="text-lg font-medium leading-snug text-foreground">{block.headline}</p>

      <div className="mt-3">
        <MetaChip icon={RiUserStarLine}>{AUDIENCE_LABELS[block.audience]}</MetaChip>
      </div>

      {block.narrative.length > 0 ? (
        <div className="mt-4 space-y-3">
          {block.narrative.map((paragraph, i) => (
            <Prose key={i}>{paragraph}</Prose>
          ))}
        </div>
      ) : null}

      {block.keyTakeaways.length > 0 ? (
        <div className="mt-4 rounded-lg bg-muted/40 p-4">
          <FieldLabel>Key takeaways</FieldLabel>
          <ol className="mt-2 space-y-2 text-sm leading-relaxed text-foreground">
            {block.keyTakeaways.map((takeaway, i) => (
              <li key={i} className="flex gap-2.5">
                <span
                  className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-background text-xs font-medium tabular-nums text-muted-foreground ring-1 ring-border"
                  aria-hidden
                >
                  {i + 1}
                </span>
                <span>{takeaway}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      <div className="mt-4">
        <FieldLabel>Findings by severity</FieldLabel>
        <dl className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {FINDING_COUNT_META.map((meta) => (
            <div key={meta.key} className="rounded-lg border border-border px-3 py-2">
              <dt className="text-xs text-muted-foreground">{meta.label}</dt>
              <dd className={cn("mt-0.5 text-xl font-semibold tabular-nums", meta.className)}>
                {formatCount(block.findingCounts[meta.key])}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-2 text-xs text-muted-foreground">
          {formatCount(totalFindings)} finding{totalFindings === 1 ? "" : "s"} recorded in total.
        </p>
      </div>

      <BlockFooter commentary={block.commentary} evidence={block.evidence} />
    </BlockShell>
  );
}

/* -------------------------------------------------------------------------- */
/* audit_scope                                                                */
/* -------------------------------------------------------------------------- */

const COVERAGE_META: Record<
  BlockOf<"audit_scope">["coverageBasis"],
  { label: string; description: string; icon: ComponentType<{ className?: string }>; strong: boolean }
> = {
  full_population: {
    label: "Full population",
    description: "Every item in scope was examined.",
    icon: RiCheckboxCircleLine,
    strong: true,
  },
  sample: {
    label: "Sample",
    description: "A subset was examined; conclusions extrapolate beyond what was tested.",
    icon: RiFocus3Line,
    strong: false,
  },
  targeted: {
    label: "Targeted",
    description: "Only areas the instructions pointed at were examined. This is not a population test.",
    icon: RiFocus3Line,
    strong: false,
  },
  analytical_only: {
    label: "Analytical only",
    description: "Analytical procedures only — no items were vouched to source documents.",
    icon: RiCompassLine,
    strong: false,
  },
};

export function AuditScopeBlock({ block }: { block: BlockOf<"audit_scope"> }) {
  const coverage = COVERAGE_META[block.coverageBasis];
  const CoverageIcon = coverage.icon;

  return (
    <BlockShell title={block.title} claim={<ClaimBadge claimType={block.claimType} />}>
      <div className="space-y-1.5">
        <FieldLabel>Objective</FieldLabel>
        <Prose>{block.objective}</Prose>
      </div>

      <div
        className={cn(
          "mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded-lg border p-3 text-sm",
          coverage.strong
            ? "border-border bg-muted/40"
            : "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-100",
        )}
      >
        <span className="inline-flex items-center gap-1.5 font-medium">
          <CoverageIcon className="size-4 shrink-0" aria-hidden />
          Coverage: {coverage.label}
        </span>
        <span className={coverage.strong ? "text-muted-foreground" : undefined}>{coverage.description}</span>
      </div>

      {block.periods.length > 0 ? (
        <div className="mt-4 space-y-1.5">
          <FieldLabel>Periods</FieldLabel>
          <ul className="flex flex-wrap gap-1.5">
            {block.periods.map((period, i) => (
              <li key={`${i}-${period.label}`}>
                <MetaChip icon={RiCalendarLine}>
                  {period.label}
                  {period.from || period.to ? (
                    <span className="tabular-nums opacity-70">
                      ({period.from ?? "—"} → {period.to ?? "—"})
                    </span>
                  ) : null}
                </MetaChip>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <FieldLabel>Domains</FieldLabel>
          <ChipList items={block.domains} emptyLabel="No domain recorded." />
        </div>
        <div className="space-y-1.5">
          <FieldLabel>Entities in scope</FieldLabel>
          <ChipList items={block.entitiesInScope} icon={RiBuilding2Line} emptyLabel="No entity recorded." />
        </div>
      </div>

      <div className="mt-4 space-y-1.5">
        <FieldLabel>Accounts in scope</FieldLabel>
        <ChipList items={block.accountsInScope} icon={RiPriceTag3Line} emptyLabel="Not account-scoped." />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-border p-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <RiCheckboxCircleLine className="size-3.5 shrink-0" aria-hidden />
            Examined
          </span>
          <div className="mt-2">
            {block.inScope.length > 0 ? (
              <BulletList items={block.inScope} />
            ) : (
              <p className="text-sm italic text-muted-foreground">Nothing recorded as examined.</p>
            )}
          </div>
        </div>
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-amber-700 dark:text-amber-300">
            <RiForbid2Line className="size-3.5 shrink-0" aria-hidden />
            Not examined
          </span>
          <div className="mt-2">
            {block.outOfScope.length > 0 ? (
              <BulletList items={block.outOfScope} />
            ) : (
              <p className="text-sm italic text-muted-foreground">Nothing was excluded.</p>
            )}
          </div>
        </div>
      </div>

      {block.drivingInstructions.length > 0 ? (
        <div className="mt-4 space-y-1.5">
          <FieldLabel>Driven by instructions</FieldLabel>
          <ChipList items={block.drivingInstructions} emptyLabel="No instruction recorded." />
        </div>
      ) : null}

      <BlockFooter commentary={block.commentary} evidence={block.evidence} />
    </BlockShell>
  );
}

/* -------------------------------------------------------------------------- */
/* audit_methodology                                                          */
/* -------------------------------------------------------------------------- */

export function AuditMethodologyBlock({ block }: { block: BlockOf<"audit_methodology"> }) {
  return (
    <BlockShell title={block.title} claim={<ClaimBadge claimType={block.claimType} />}>
      {block.procedures.length > 0 ? (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead scope="col" className="w-10 text-right">
                  #
                </TableHead>
                <TableHead scope="col">Procedure</TableHead>
                <TableHead scope="col">Data used</TableHead>
                <TableHead scope="col">Tools</TableHead>
                <TableHead scope="col" className="text-right">
                  Population
                </TableHead>
                <TableHead scope="col" className="text-right">
                  Examined
                </TableHead>
                <TableHead scope="col" className="text-right">
                  Coverage
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {block.procedures.map((procedure, i) => {
                const coverage =
                  procedure.populationSize !== null &&
                  procedure.populationSize > 0 &&
                  procedure.itemsExamined !== null
                    ? (procedure.itemsExamined / procedure.populationSize) * 100
                    : null;
                return (
                  <TableRow key={`${i}-${procedure.name}`} className="align-top">
                    <TableCell className="text-right tabular-nums text-muted-foreground">{i + 1}</TableCell>
                    <TableCell>
                      <span className="font-medium">{procedure.name}</span>
                      <p className="mt-0.5 max-w-md text-xs leading-relaxed text-muted-foreground">
                        {procedure.description}
                      </p>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{procedure.dataUsed}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {procedure.toolsUsed ?? <span className="italic">None</span>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {procedure.populationSize !== null ? formatCount(procedure.populationSize) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {procedure.itemsExamined !== null ? formatCount(procedure.itemsExamined) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {coverage !== null
                        ? `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(coverage)}%`
                        : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="text-sm italic text-muted-foreground">No procedures were recorded.</p>
      )}

      <div className="mt-4 space-y-1.5">
        <FieldLabel>Sampling approach</FieldLabel>
        {block.samplingApproach !== null ? (
          <Prose>{block.samplingApproach}</Prose>
        ) : (
          <Prose className="text-muted-foreground">
            No sampling — the full population was examined.
          </Prose>
        )}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <FieldLabel>Standards referenced</FieldLabel>
          <ChipList items={block.standardsReferenced} emptyLabel="No standard was invoked by the inputs." />
        </div>
        <div className="space-y-1.5">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-amber-700 dark:text-amber-300">
            <RiAlertLine className="size-3.5 shrink-0" aria-hidden />
            Limitations acknowledged
          </span>
          {block.limitationsAcknowledged.length > 0 ? (
            <BulletList items={block.limitationsAcknowledged} />
          ) : (
            <p className="text-sm italic text-muted-foreground">None acknowledged.</p>
          )}
        </div>
      </div>

      <BlockFooter commentary={block.commentary} evidence={block.evidence} />
    </BlockShell>
  );
}

/* -------------------------------------------------------------------------- */
/* overall_risk_rating                                                        */
/* -------------------------------------------------------------------------- */

const CHANGE_META: Record<
  "improved" | "unchanged" | "deteriorated" | "not_comparable",
  { label: string; icon: ComponentType<{ className?: string }>; className: string }
> = {
  improved: {
    label: "Improved since prior period",
    icon: RiArrowRightDownLine,
    className: "border-border bg-muted/50 text-muted-foreground",
  },
  unchanged: {
    label: "Unchanged since prior period",
    icon: RiEqualLine,
    className: "border-border bg-muted/50 text-muted-foreground",
  },
  deteriorated: {
    label: "Deteriorated since prior period",
    icon: RiArrowRightUpLine,
    className: "border-destructive/40 bg-destructive/10 text-destructive",
  },
  not_comparable: {
    label: "Not comparable with prior period",
    icon: RiSubtractLine,
    className: "border-border bg-transparent text-muted-foreground",
  },
};

export function OverallRiskRatingBlock({ block }: { block: BlockOf<"overall_risk_rating"> }) {
  const change = block.changeSincePrior !== null ? CHANGE_META[block.changeSincePrior] : null;
  const ChangeIcon = change?.icon;

  return (
    <BlockShell title={block.title} claim={<ClaimBadge claimType={block.claimType} />}>
      <div className="flex flex-wrap items-center gap-2">
        <RiskBadge risk={block.rating} size="lg" />
        <ConfidenceBadge confidence={block.confidence} />
        {change && ChangeIcon ? (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium",
              change.className,
            )}
          >
            <ChangeIcon className="size-3.5 shrink-0" aria-hidden />
            {change.label}
          </span>
        ) : null}
      </div>

      <div className="mt-4 space-y-1.5">
        <FieldLabel>Basis for this rating</FieldLabel>
        <Prose>{block.ratingBasis}</Prose>
      </div>

      {block.dimensions.length > 0 ? (
        <div className="mt-4 space-y-1.5">
          <FieldLabel>Component ratings</FieldLabel>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Dimension</TableHead>
                  <TableHead scope="col" className="w-32">
                    Rating
                  </TableHead>
                  <TableHead scope="col">Rationale</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {block.dimensions.map((dimension, i) => (
                  <TableRow key={`${i}-${dimension.name}`} className="align-top">
                    <TableCell className="font-medium">{dimension.name}</TableCell>
                    <TableCell>
                      <RiskBadge risk={dimension.rating} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">{dimension.rationale}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : null}

      <BlockFooter commentary={block.commentary} evidence={block.evidence} />
    </BlockShell>
  );
}

/* -------------------------------------------------------------------------- */
/* methodology_explanation                                                    */
/* -------------------------------------------------------------------------- */

export function MethodologyExplanationBlock({ block }: { block: BlockOf<"methodology_explanation"> }) {
  return (
    <BlockShell
      title={block.title}
      claim={<ClaimBadge claimType={block.claimType} />}
      actions={<MetaChip icon={RiUserStarLine}>{AUDIENCE_LABELS[block.audience]}</MetaChip>}
    >
      <p className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
        <RiMicroscopeLine className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        {block.technique}
      </p>

      <div className="mt-4 space-y-4">
        <div className="space-y-1.5">
          <FieldLabel>In plain language</FieldLabel>
          <Prose>{block.plainLanguageExplanation}</Prose>
        </div>
        <div className="space-y-1.5">
          <FieldLabel>Why this technique</FieldLabel>
          <Prose>{block.whyThisTechnique}</Prose>
        </div>
        <div className="space-y-1.5 rounded-lg bg-muted/40 p-3">
          <FieldLabel>How to read the results</FieldLabel>
          <Prose>{block.howToReadResults}</Prose>
        </div>
      </div>

      {block.parameters.length > 0 ? (
        <div className="mt-4 space-y-1.5">
          <FieldLabel>Parameters</FieldLabel>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Parameter</TableHead>
                  <TableHead scope="col" className="text-right">
                    Value
                  </TableHead>
                  <TableHead scope="col">Why this value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {block.parameters.map((parameter, i) => (
                  <TableRow key={`${i}-${parameter.name}`} className="align-top">
                    <TableCell className="font-medium">{parameter.name}</TableCell>
                    <TableCell className="text-right font-mono text-xs tabular-nums">{parameter.value}</TableCell>
                    <TableCell className="text-muted-foreground">{parameter.rationale}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : null}

      <div className="mt-4 space-y-1.5">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-amber-700 dark:text-amber-300">
          <RiAlertLine className="size-3.5 shrink-0" aria-hidden />
          Where this technique can mislead
        </span>
        {block.knownLimitations.length > 0 ? (
          <BulletList items={block.knownLimitations} />
        ) : (
          <p className="text-sm italic text-muted-foreground">No limitations recorded.</p>
        )}
      </div>

      <BlockFooter commentary={block.commentary} evidence={block.evidence} />
    </BlockShell>
  );
}

/* -------------------------------------------------------------------------- */
/* audit_conclusion                                                           */
/* -------------------------------------------------------------------------- */

const CONCLUSION_META: Record<
  BlockOf<"audit_conclusion">["conclusionType"],
  { label: string; icon: ComponentType<{ className?: string }>; className: string }
> = {
  no_material_issues: {
    label: "No material issues",
    icon: RiCheckboxCircleLine,
    className: "border-border bg-muted/50 text-foreground",
  },
  issues_identified: {
    label: "Issues identified",
    icon: RiAlertLine,
    className: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  significant_issues_identified: {
    label: "Significant issues identified",
    icon: RiErrorWarningLine,
    className: "border-destructive/40 bg-destructive/10 text-destructive",
  },
  unable_to_conclude: {
    label: "Unable to conclude",
    icon: RiCloseCircleLine,
    className: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
};

export function AuditConclusionBlock({ block }: { block: BlockOf<"audit_conclusion"> }) {
  const conclusion = CONCLUSION_META[block.conclusionType];
  const ConclusionIcon = conclusion.icon;

  return (
    <BlockShell
      title={block.title}
      headingLevel={2}
      claim={<ClaimBadge claimType={block.claimType} />}
      actions={<RiskBadge risk={block.overallRisk} />}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium",
            conclusion.className,
          )}
        >
          <ConclusionIcon className="size-4 shrink-0" aria-hidden />
          {conclusion.label}
        </span>
        <ConfidenceBadge confidence={block.confidence} />
      </div>

      <p className="mt-4 text-base leading-relaxed text-foreground">{block.conclusion}</p>

      {block.professionalReviewRequired ? (
        <p
          role="note"
          className="mt-4 flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-100"
        >
          <RiAlertLine className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            <span className="font-medium">Professional review required. </span>
            A qualified professional must review and sign off on this conclusion before anyone relies on it.
            This is not a statutory audit opinion.
          </span>
        </p>
      ) : null}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <FieldLabel>Basis for the conclusion</FieldLabel>
          {block.basisForConclusion.length > 0 ? (
            <BulletList items={block.basisForConclusion} />
          ) : (
            <p className="text-sm italic text-muted-foreground">No supporting work recorded.</p>
          )}
        </div>
        <div className="space-y-1.5">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-amber-700 dark:text-amber-300">
            <RiQuestionLine className="size-3.5 shrink-0" aria-hidden />
            Residual uncertainties
          </span>
          {block.residualUncertainties.length > 0 ? (
            <BulletList items={block.residualUncertainties} />
          ) : (
            <p className="text-sm italic text-muted-foreground">None recorded.</p>
          )}
        </div>
      </div>

      {block.keyFindingRefs.length > 0 ? (
        <div className="mt-4 space-y-1.5">
          <FieldLabel>Key findings</FieldLabel>
          <ul className="flex flex-wrap gap-1.5">
            {block.keyFindingRefs.map((ref, i) => (
              <li key={`${i}-${ref}`}>
                <span className="inline-flex items-center rounded-md border border-border bg-muted/40 px-2 py-0.5 font-mono text-xs text-muted-foreground">
                  {ref}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {block.nextSteps.length > 0 ? (
        <div className="mt-4 rounded-lg bg-muted/40 p-4">
          <FieldLabel>Next steps</FieldLabel>
          <ol className="mt-2 space-y-2 text-sm leading-relaxed text-foreground">
            {block.nextSteps.map((step, i) => (
              <li key={i} className="flex gap-2.5">
                <span
                  className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-background text-xs font-medium tabular-nums text-muted-foreground ring-1 ring-border"
                  aria-hidden
                >
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      <BlockFooter commentary={block.commentary} evidence={block.evidence} />
    </BlockShell>
  );
}

/* -------------------------------------------------------------------------- */
/* management_letter_section                                                  */
/* -------------------------------------------------------------------------- */

const LETTER_FIELDS: {
  key: "criteria" | "condition" | "cause" | "effect" | "recommendation";
  label: string;
  hint: string;
}[] = [
  { key: "criteria", label: "Criteria", hint: "What should be the case" },
  { key: "condition", label: "Condition", hint: "What is actually the case" },
  { key: "cause", label: "Cause", hint: "Why the gap exists" },
  { key: "effect", label: "Effect", hint: "What the gap costs or risks" },
  { key: "recommendation", label: "Recommendation", hint: "What management should do" },
];

export function ManagementLetterSectionBlock({ block }: { block: BlockOf<"management_letter_section"> }) {
  return (
    <BlockShell
      title={block.title}
      claim={<ClaimBadge claimType={block.claimType} />}
      actions={<SeverityBadge severity={block.severity} />}
    >
      <div className="flex flex-wrap gap-1.5">
        {block.sectionRef !== null ? <MetaChip>Ref {block.sectionRef}</MetaChip> : null}
        {block.addresseeRole !== null ? <MetaChip icon={RiUserStarLine}>To: {block.addresseeRole}</MetaChip> : null}
        {block.responseRequestedBy !== null ? (
          <MetaChip icon={RiMailSendLine}>Response by {block.responseRequestedBy}</MetaChip>
        ) : null}
        {block.priorYearRepeat ? (
          <span className="inline-flex items-center gap-1.5 rounded-md border border-destructive/40 bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
            <RiErrorWarningLine className="size-3.5 shrink-0" aria-hidden />
            Repeat of a prior-year point
          </span>
        ) : null}
      </div>

      <dl className="mt-4 space-y-3">
        {LETTER_FIELDS.map((field) => (
          <div
            key={field.key}
            className={cn(
              "grid gap-1 border-l-2 pl-3 sm:grid-cols-[9rem_1fr] sm:gap-4",
              field.key === "recommendation" ? "border-foreground/40" : "border-border",
            )}
          >
            <dt>
              <span className="block text-sm font-medium text-foreground">{field.label}</span>
              <span className="block text-xs text-muted-foreground">{field.hint}</span>
            </dt>
            <dd className="text-sm leading-relaxed text-foreground">{block[field.key]}</dd>
          </div>
        ))}
      </dl>

      <BlockFooter commentary={block.commentary} evidence={block.evidence} />
    </BlockShell>
  );
}

/* -------------------------------------------------------------------------- */
/* appendix                                                                   */
/* -------------------------------------------------------------------------- */

const APPENDIX_CONTENT_LABELS: Record<BlockOf<"appendix">["contentType"], string> = {
  raw_data_extract: "Raw data extract",
  calculation_detail: "Calculation detail",
  definitions: "Definitions",
  full_transaction_list: "Full transaction list",
  instruction_text: "Instruction text",
  other: "Supporting detail",
};

/** Preformatted bodies (extracts, calculations) must keep their whitespace; prose must not. */
const PREFORMATTED_CONTENT: ReadonlySet<BlockOf<"appendix">["contentType"]> = new Set([
  "raw_data_extract",
  "calculation_detail",
  "full_transaction_list",
]);

export function AppendixBlock({ block }: { block: BlockOf<"appendix"> }) {
  const preformatted = PREFORMATTED_CONTENT.has(block.contentType);

  return (
    <BlockShell
      title={block.title}
      headingLevel={2}
      claim={<ClaimBadge claimType={block.claimType} />}
      actions={<MetaChip icon={RiArchiveLine}>{APPENDIX_CONTENT_LABELS[block.contentType]}</MetaChip>}
    >
      {block.referencedByBlockTitles.length > 0 ? (
        <p className="mb-4 text-xs text-muted-foreground">
          Referenced by: {block.referencedByBlockTitles.join(" · ")}
        </p>
      ) : null}

      {block.sections.length > 0 ? (
        <div className="space-y-5">
          {block.sections.map((section, i) => (
            <div key={`${i}-${section.heading}`}>
              <h3 className="text-sm font-semibold text-foreground">{section.heading}</h3>
              {preformatted ? (
                <pre className="mt-2 overflow-x-auto rounded-lg bg-muted/40 p-3 font-mono text-xs leading-relaxed text-foreground">
                  {section.body}
                </pre>
              ) : (
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground">{section.body}</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm italic text-muted-foreground">This appendix is empty.</p>
      )}

      {/* Definitions and instruction text quote themselves; they carry no independent assertion. */}
      <BlockFooter
        commentary={block.commentary}
        evidence={block.evidence}
        requireEvidence={block.contentType !== "definitions"}
      />
    </BlockShell>
  );
}
