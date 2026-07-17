import {
  RiAlarmWarningLine,
  RiArrowLeftRightLine,
  RiCheckboxCircleLine,
  RiDatabase2Line,
  RiErrorWarningLine,
  RiForbid2Line,
  RiInboxUnarchiveLine,
  RiInformationLine,
  RiLightbulbLine,
  RiListCheck2,
  RiSearchEyeLine,
  RiShieldCheckLine,
  RiSignpostLine,
} from "@remixicon/react";

import {
  BlockShell,
  ClaimBadge,
  EvidenceChips,
  MissingEvidenceNote,
  SeverityBadge,
  formatMoney,
  formatNumber,
  formatPercent,
} from "@/components/blocks/shared";
import type { EvidenceInput } from "@/lib/ai/blocks/primitives";
import type { BlockOf } from "@/lib/ai/blocks/schemas";
import type { ClaimType, Confidence } from "@/lib/ai/blocks/types";
import { cn } from "@/lib/utils";

/**
 * The findings-and-callouts renderers (11 of the 55 block types).
 *
 * Two product rules are enforced structurally here rather than left to each block:
 *
 *  - **Severity is never colour alone** (PRD §26.4). Colour is only ever an echo of a
 *    `<SeverityBadge>`, which always carries an icon and a word.
 *  - **A guess must never look like a fact** (PRD §10.5, §31). Anything that is not
 *    `evidence_supported` gets a dashed shell — a signal that survives greyscale and
 *    colour-blindness — on top of the always-present `<ClaimBadge>`.
 */

/* -------------------------------------------------------------------------- */
/* Local presentation primitives                                              */
/* -------------------------------------------------------------------------- */

/**
 * Only a cited claim gets a solid edge. Everything else — an interpretation, a
 * hypothesis, a gap, a user's assertion — reads as provisional at a glance.
 */
function claimShellClass(claimType: ClaimType): string {
  return claimType === "evidence_supported"
    ? ""
    : "border-dashed border-amber-500/40 bg-amber-500/[0.02]";
}

const CONFIDENCE_LABELS: Record<Confidence, string> = {
  high: "High confidence",
  medium: "Medium confidence",
  low: "Low confidence",
};

function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium",
        confidence === "low"
          ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
          : "border-border bg-muted/60 text-muted-foreground",
      )}
    >
      <RiSearchEyeLine className="size-3.5 shrink-0" aria-hidden />
      {CONFIDENCE_LABELS[confidence]}
    </span>
  );
}

/** A neutral key/value chip for scalar metadata (domain, urgency, cause, …). */
function MetaChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2 py-0.5 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </span>
  );
}

function Section({
  title,
  icon: Icon,
  children,
  className,
}: {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {Icon ? <Icon className="size-3.5 shrink-0" aria-hidden /> : null}
        {title}
      </h4>
      {children}
    </div>
  );
}

/** A titled list. Renders nothing at all when empty — an empty array is not a heading. */
function ListSection({
  title,
  icon,
  items,
  className,
}: {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  items: string[];
  className?: string;
}) {
  if (items.length === 0) return null;
  return (
    <Section title={title} icon={icon} className={className}>
      <ul className="space-y-1 text-sm text-foreground">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-2 size-1 shrink-0 rounded-full bg-muted-foreground/60" aria-hidden />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </Section>
  );
}

/** Inline chips for cross-references (periods, entities, accounts, finding refs). */
function TagSection({
  title,
  items,
  mono = false,
}: {
  title: string;
  items: string[];
  mono?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <Section title={title}>
      <ul className="flex flex-wrap gap-1.5">
        {items.map((item, i) => (
          <li
            key={i}
            className={cn(
              "rounded-md border border-border bg-muted/40 px-1.5 py-0.5 text-xs text-foreground",
              mono && "font-mono",
            )}
          >
            {item}
          </li>
        ))}
      </ul>
    </Section>
  );
}

function Prose({ children, className }: { children: string; className?: string }) {
  return <p className={cn("text-sm leading-relaxed text-foreground", className)}>{children}</p>;
}

/**
 * `requireEvidence` is false for blocks whose whole point is an absence — an assumption,
 * a limitation, a data request. Nagging about a missing citation there would be noise.
 */
function BlockFooter({
  commentary,
  evidence,
  requireEvidence = true,
}: {
  commentary: string | null;
  evidence: EvidenceInput[];
  requireEvidence?: boolean;
}) {
  const showNote = requireEvidence && evidence.length === 0;
  if (commentary === null && evidence.length === 0 && !showNote) return null;

  return (
    <div className="mt-4 space-y-2 border-t border-border pt-3">
      {commentary !== null ? (
        <p className="text-sm leading-relaxed text-muted-foreground">{commentary}</p>
      ) : null}
      {evidence.length > 0 ? <EvidenceChips evidence={evidence} /> : null}
      {showNote ? <MissingEvidenceNote /> : null}
    </div>
  );
}

/** "1,204 of 8,000 (15.1%)" — never a bare count when the denominator is known. */
function countOfTotal(count: number | null, total: number | null): string | null {
  if (count === null) return null;
  if (total === null || total === 0) return formatNumber(count);
  return `${formatNumber(count)} of ${formatNumber(total)} (${formatPercent((count / total) * 100)})`;
}

/* -------------------------------------------------------------------------- */
/* finding_card                                                               */
/* -------------------------------------------------------------------------- */

const DOMAIN_LABELS: Record<BlockOf<"finding_card">["domain"], string> = {
  general: "General",
  ledger: "Ledger",
  budgets: "Budgets",
  cash: "Cash",
  customers: "Customers",
  suppliers: "Suppliers",
};

export function FindingCardBlock({ block }: { block: BlockOf<"finding_card"> }) {
  return (
    <BlockShell
      title={block.title}
      className={claimShellClass(block.claimType)}
      claim={<ClaimBadge claimType={block.claimType} />}
      actions={
        <span className="rounded-md border border-border bg-muted/60 px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
          {block.findingRef}
        </span>
      }
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SeverityBadge severity={block.severity} />
        <ConfidenceBadge confidence={block.confidence} />
        <MetaChip label="Domain" value={DOMAIN_LABELS[block.domain]} />
        <MetaChip label="Category" value={block.riskCategory} />
      </div>

      <p className="text-sm font-medium leading-relaxed text-foreground">{block.summary}</p>

      <div className="mt-3 space-y-4">
        <Prose className="text-muted-foreground">{block.detail}</Prose>

        {block.financialImpact !== null ? (
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Estimated financial impact
              </h4>
              <p className="font-mono text-lg font-semibold tabular-nums text-foreground">
                {formatMoney(block.financialImpact.amount, block.financialImpact.currency)}
              </p>
            </div>
            {block.impactBasis !== null ? (
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                {block.impactBasis}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <TagSection title="Periods" items={block.affectedPeriods} />
          <TagSection title="Entities" items={block.affectedEntities} />
          <TagSection title="Accounts" items={block.affectedAccounts} mono />
          <TagSection title="Driving instructions" items={block.relevantInstructions} />
        </div>

        <ListSection
          title="Potential explanations"
          icon={RiLightbulbLine}
          items={block.potentialExplanations}
        />
        <ListSection
          title="Recommended follow-up"
          icon={RiSearchEyeLine}
          items={block.recommendedFollowup}
        />
        <ListSection
          title="Recommended remediation"
          icon={RiShieldCheckLine}
          items={block.recommendedRemediation}
        />

        {block.suggestedOwnerRole !== null ? (
          <MetaChip label="Suggested owner" value={block.suggestedOwnerRole} />
        ) : null}
      </div>

      <BlockFooter commentary={block.commentary} evidence={block.evidence} />
    </BlockShell>
  );
}

/* -------------------------------------------------------------------------- */
/* risk_highlight                                                             */
/* -------------------------------------------------------------------------- */

const LIKELIHOOD_LABELS: Record<BlockOf<"risk_highlight">["likelihood"], string> = {
  almost_certain: "Almost certain",
  likely: "Likely",
  possible: "Possible",
  unlikely: "Unlikely",
  rare: "Rare",
};

const URGENCY_LABELS: Record<BlockOf<"risk_highlight">["urgency"], string> = {
  immediate: "Immediate",
  this_period: "This period",
  next_period: "Next period",
  monitor: "Monitor",
};

export function RiskHighlightBlock({ block }: { block: BlockOf<"risk_highlight"> }) {
  return (
    <BlockShell
      title={block.title}
      className={claimShellClass(block.claimType)}
      claim={<ClaimBadge claimType={block.claimType} />}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SeverityBadge severity={block.severity} />
        <MetaChip label="Likelihood" value={LIKELIHOOD_LABELS[block.likelihood]} />
        <MetaChip label="Act by" value={URGENCY_LABELS[block.urgency]} />
      </div>

      <div className="space-y-4">
        <div className="flex gap-2.5">
          <RiAlarmWarningLine className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
          <p className="text-sm font-medium leading-relaxed text-foreground">{block.riskStatement}</p>
        </div>

        <Section title="Why it matters">
          <Prose className="text-muted-foreground">{block.whyItMatters}</Prose>
        </Section>

        {block.exposure !== null ? (
          <div className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-border bg-muted/30 p-3">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Exposure if it materialises
            </h4>
            <p className="font-mono text-lg font-semibold tabular-nums text-foreground">
              {formatMoney(block.exposure.amount, block.exposure.currency)}
            </p>
          </div>
        ) : null}

        <TagSection title="Related findings" items={block.relatedFindingRefs} mono />
      </div>

      <BlockFooter commentary={block.commentary} evidence={block.evidence} />
    </BlockShell>
  );
}

/* -------------------------------------------------------------------------- */
/* warning_box                                                                */
/* -------------------------------------------------------------------------- */

export function WarningBoxBlock({ block }: { block: BlockOf<"warning_box"> }) {
  return (
    <BlockShell
      title={block.title}
      className={claimShellClass(block.claimType)}
      claim={<ClaimBadge claimType={block.claimType} />}
    >
      <div className="mb-3">
        <SeverityBadge severity={block.severity} />
      </div>

      <div className="space-y-4">
        <div className="flex gap-2.5">
          <RiErrorWarningLine className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
          <p className="text-sm leading-relaxed text-foreground">{block.message}</p>
        </div>
        <ListSection title="What to check" icon={RiListCheck2} items={block.whatToCheck} />
      </div>

      <BlockFooter commentary={block.commentary} evidence={block.evidence} />
    </BlockShell>
  );
}

/* -------------------------------------------------------------------------- */
/* info_box                                                                   */
/* -------------------------------------------------------------------------- */

/** Carries no severity by design — do not add one here. */
export function InfoBoxBlock({ block }: { block: BlockOf<"info_box"> }) {
  return (
    <BlockShell
      title={block.title}
      className={claimShellClass(block.claimType)}
      claim={<ClaimBadge claimType={block.claimType} />}
    >
      <div className="space-y-4">
        <div className="flex gap-2.5">
          <RiInformationLine className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
          <p className="text-sm leading-relaxed text-foreground">{block.message}</p>
        </div>

        <ListSection title="Detail" items={block.bullets} />

        {block.relevance !== null ? (
          <Section title="Why this is here" icon={RiSignpostLine}>
            <Prose className="text-muted-foreground">{block.relevance}</Prose>
          </Section>
        ) : null}
      </div>

      <BlockFooter commentary={block.commentary} evidence={block.evidence} requireEvidence={false} />
    </BlockShell>
  );
}

/* -------------------------------------------------------------------------- */
/* success_box                                                                */
/* -------------------------------------------------------------------------- */

export function SuccessBoxBlock({ block }: { block: BlockOf<"success_box"> }) {
  return (
    <BlockShell
      title={block.title}
      className={claimShellClass(block.claimType)}
      claim={<ClaimBadge claimType={block.claimType} />}
    >
      <div className="space-y-4">
        <div className="flex gap-2.5">
          <RiCheckboxCircleLine
            className="mt-0.5 size-4 shrink-0 text-emerald-700 dark:text-emerald-400"
            aria-hidden
          />
          <p className="text-sm font-medium leading-relaxed text-foreground">
            <span className="sr-only">No exceptions found: </span>
            {block.message}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Section title="What was tested">
            <Prose className="text-muted-foreground">{block.whatWasTested}</Prose>
          </Section>
          <Section title="Basis for the result">
            <Prose className="text-muted-foreground">{block.resultBasis}</Prose>
          </Section>
        </div>

        {block.coverage !== null ? <MetaChip label="Coverage" value={block.coverage} /> : null}
      </div>

      <BlockFooter commentary={block.commentary} evidence={block.evidence} />
    </BlockShell>
  );
}

/* -------------------------------------------------------------------------- */
/* data_quality_warning                                                       */
/* -------------------------------------------------------------------------- */

const ISSUE_TYPE_LABELS: Record<BlockOf<"data_quality_warning">["issueType"], string> = {
  missing_values: "Missing values",
  duplicate_records: "Duplicate records",
  inconsistent_formats: "Inconsistent formats",
  out_of_range_values: "Out-of-range values",
  unbalanced_totals: "Unbalanced totals",
  stale_data: "Stale data",
  encoding_issues: "Encoding issues",
  unmapped_accounts: "Unmapped accounts",
  conflicting_sources: "Conflicting sources",
  other: "Other",
};

export function DataQualityWarningBlock({ block }: { block: BlockOf<"data_quality_warning"> }) {
  const affected = countOfTotal(block.affectedRecordCount, block.totalRecordCount);

  return (
    <BlockShell
      title={block.title}
      className={claimShellClass(block.claimType)}
      claim={<ClaimBadge claimType={block.claimType} />}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SeverityBadge severity={block.severity} />
        <MetaChip label="Issue" value={ISSUE_TYPE_LABELS[block.issueType]} />
      </div>

      <div className="space-y-4">
        <div className="flex gap-2.5">
          <RiDatabase2Line className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
          <p className="text-sm leading-relaxed text-foreground">{block.description}</p>
        </div>

        {affected !== null ? (
          <div className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-border bg-muted/30 p-3">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Records affected
            </h4>
            <p className="font-mono text-sm font-semibold tabular-nums text-foreground">{affected}</p>
          </div>
        ) : null}

        <TagSection title="Affected inputs" items={block.affectedInputIds} mono />

        <Section title="Impact on conclusions" icon={RiErrorWarningLine}>
          <Prose className="text-muted-foreground">{block.impactOnConclusions}</Prose>
        </Section>

        <Section title="Remediation" icon={RiShieldCheckLine}>
          <Prose className="text-muted-foreground">{block.remediation}</Prose>
        </Section>
      </div>

      <BlockFooter commentary={block.commentary} evidence={block.evidence} />
    </BlockShell>
  );
}

/* -------------------------------------------------------------------------- */
/* missing_evidence_notice                                                    */
/* -------------------------------------------------------------------------- */

export function MissingEvidenceNoticeBlock({ block }: { block: BlockOf<"missing_evidence_notice"> }) {
  return (
    <BlockShell
      title={block.title}
      className={claimShellClass(block.claimType)}
      claim={<ClaimBadge claimType={block.claimType} />}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SeverityBadge severity={block.severity} />
        {block.requestedFrom !== null ? (
          <MetaChip label="Requested from" value={block.requestedFrom} />
        ) : null}
      </div>

      <div className="space-y-4">
        <div className="flex gap-2.5">
          <RiInboxUnarchiveLine className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
          <p className="text-sm font-medium leading-relaxed text-foreground">{block.whatIsMissing}</p>
        </div>

        <Section title="Why it is needed">
          <Prose className="text-muted-foreground">{block.whyItIsNeeded}</Prose>
        </Section>

        <ListSection
          title="Procedures blocked"
          icon={RiListCheck2}
          items={block.blockedProcedures}
        />
        <ListSection
          title="Conclusions affected"
          icon={RiErrorWarningLine}
          items={block.conclusionsAffected}
        />

        {block.whatWasAssumedInstead !== null ? (
          <div className="rounded-lg border border-dashed border-amber-500/40 bg-amber-500/[0.06] p-3">
            <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
              <RiLightbulbLine className="size-3.5 shrink-0" aria-hidden />
              Assumed in the gap
            </h4>
            <p className="mt-1.5 text-sm leading-relaxed text-foreground">
              {block.whatWasAssumedInstead}
            </p>
          </div>
        ) : null}
      </div>

      <BlockFooter commentary={block.commentary} evidence={block.evidence} requireEvidence={false} />
    </BlockShell>
  );
}

/* -------------------------------------------------------------------------- */
/* contradiction_alert                                                        */
/* -------------------------------------------------------------------------- */

const CONFLICT_LABELS: Record<BlockOf<"contradiction_alert">["natureOfConflict"], string> = {
  value_mismatch: "Value mismatch",
  timing_mismatch: "Timing mismatch",
  classification_mismatch: "Classification mismatch",
  policy_vs_practice: "Policy vs practice",
  statement_vs_data: "Statement vs data",
  instruction_conflict: "Instruction conflict",
};

/** One side of the disagreement. `verdict` is stated in words, never implied by styling. */
function ContradictionSide({
  side,
  claim,
  sourceLabel,
  verdict,
}: {
  side: "A" | "B";
  claim: string;
  sourceLabel: string;
  verdict: "preferred" | "outweighed" | "undetermined";
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-3",
        verdict === "preferred"
          ? "border-border bg-muted/40"
          : "border-dashed border-border bg-transparent",
      )}
    >
      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        <span className="rounded-md border border-border bg-background px-1.5 py-0.5 font-mono text-xs font-medium text-foreground">
          {side}
        </span>
        {verdict === "preferred" ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-foreground">
            <RiCheckboxCircleLine className="size-3.5 shrink-0" aria-hidden />
            Weighted more reliable
          </span>
        ) : null}
        {verdict === "outweighed" ? (
          <span className="text-xs text-muted-foreground">Weighted less reliable</span>
        ) : null}
      </div>
      <p className="text-sm leading-relaxed text-foreground">{claim}</p>
      <p className="mt-1.5 text-xs text-muted-foreground">Source: {sourceLabel}</p>
    </div>
  );
}

export function ContradictionAlertBlock({ block }: { block: BlockOf<"contradiction_alert"> }) {
  const undetermined = block.whichIsMoreReliable === "undetermined";
  const verdictA = undetermined
    ? "undetermined"
    : block.whichIsMoreReliable === "a"
      ? "preferred"
      : "outweighed";
  const verdictB = undetermined
    ? "undetermined"
    : block.whichIsMoreReliable === "b"
      ? "preferred"
      : "outweighed";

  return (
    <BlockShell
      title={block.title}
      className={claimShellClass(block.claimType)}
      claim={<ClaimBadge claimType={block.claimType} />}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SeverityBadge severity={block.severity} />
        <MetaChip label="Conflict" value={CONFLICT_LABELS[block.natureOfConflict]} />
        {undetermined ? <MetaChip label="Verdict" value="Undetermined" /> : null}
      </div>

      <div className="space-y-4">
        <div className="grid items-stretch gap-3 sm:grid-cols-[1fr_auto_1fr]">
          <ContradictionSide
            side="A"
            claim={block.statementAClaim}
            sourceLabel={block.statementASourceLabel}
            verdict={verdictA}
          />
          <div className="flex items-center justify-center" aria-hidden>
            <RiArrowLeftRightLine className="size-4 text-muted-foreground" />
          </div>
          <ContradictionSide
            side="B"
            claim={block.statementBClaim}
            sourceLabel={block.statementBSourceLabel}
            verdict={verdictB}
          />
        </div>

        {block.magnitude !== null ? (
          <div className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-border bg-muted/30 p-3">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Size of the disagreement
            </h4>
            <p className="font-mono text-lg font-semibold tabular-nums text-foreground">
              {formatMoney(block.magnitude.amount, block.magnitude.currency)}
            </p>
          </div>
        ) : null}

        <Section title="Reliability rationale">
          <Prose className="text-muted-foreground">{block.reliabilityRationale}</Prose>
        </Section>

        <Section title="What would settle it" icon={RiSignpostLine}>
          <Prose className="text-muted-foreground">{block.resolutionNeeded}</Prose>
        </Section>
      </div>

      <BlockFooter commentary={block.commentary} evidence={block.evidence} />
    </BlockShell>
  );
}

/* -------------------------------------------------------------------------- */
/* assumption_box                                                             */
/* -------------------------------------------------------------------------- */

export function AssumptionBoxBlock({ block }: { block: BlockOf<"assumption_box"> }) {
  const materialCount = block.assumptions.filter((a) => a.materialToConclusion).length;

  return (
    <BlockShell
      title={block.title}
      className={claimShellClass(block.claimType)}
      claim={<ClaimBadge claimType={block.claimType} />}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <MetaChip label="Assumptions" value={formatNumber(block.assumptions.length)} />
        {materialCount > 0 ? (
          <MetaChip label="Material to conclusions" value={formatNumber(materialCount)} />
        ) : null}
      </div>

      <ol className="space-y-3">
        {block.assumptions.map((item, i) => (
          <li
            key={i}
            className={cn(
              "rounded-lg border p-3",
              item.materialToConclusion
                ? "border-amber-500/40 bg-amber-500/[0.06]"
                : "border-border bg-muted/20",
            )}
          >
            <div className="flex gap-2.5">
              <RiLightbulbLine className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-sm font-medium leading-relaxed text-foreground">
                    {item.assumption}
                  </p>
                  {item.materialToConclusion ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-amber-500/40 px-1.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                      <RiAlarmWarningLine className="size-3 shrink-0" aria-hidden />
                      Material
                    </span>
                  ) : null}
                </div>

                <dl className="grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Basis
                    </dt>
                    <dd className="mt-0.5 leading-relaxed text-foreground">{item.basis}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      If wrong, then
                    </dt>
                    <dd className="mt-0.5 leading-relaxed text-foreground">{item.ifWrongThen}</dd>
                  </div>
                </dl>

                {item.validationSuggestion !== null ? (
                  <p className="flex gap-1.5 text-xs leading-relaxed text-muted-foreground">
                    <RiSearchEyeLine className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                    <span>
                      <span className="font-medium">To validate: </span>
                      {item.validationSuggestion}
                    </span>
                  </p>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ol>

      <BlockFooter commentary={block.commentary} evidence={block.evidence} requireEvidence={false} />
    </BlockShell>
  );
}

/* -------------------------------------------------------------------------- */
/* limitation_box                                                             */
/* -------------------------------------------------------------------------- */

const LIMITATION_CAUSE_LABELS: Record<
  BlockOf<"limitation_box">["limitations"][number]["cause"],
  string
> = {
  data_unavailable: "Data unavailable",
  data_quality: "Data quality",
  scope_restriction: "Scope restriction",
  time_constraint: "Time constraint",
  system_access: "System access",
  tooling: "Tooling",
  expertise_required: "Expertise required",
};

const OVERALL_EFFECT_META: Record<
  BlockOf<"limitation_box">["overallEffect"],
  { label: string; icon: React.ComponentType<{ className?: string }>; className: string }
> = {
  none: {
    label: "No effect on conclusions",
    icon: RiCheckboxCircleLine,
    className: "border-border bg-muted/60 text-muted-foreground",
  },
  minor: {
    label: "Minor effect on conclusions",
    icon: RiInformationLine,
    className: "border-border bg-muted/60 text-muted-foreground",
  },
  significant: {
    label: "Significant effect on conclusions",
    icon: RiAlarmWarningLine,
    className: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  conclusions_qualified: {
    label: "Conclusions qualified",
    icon: RiErrorWarningLine,
    className: "border-destructive/40 bg-destructive/10 text-destructive",
  },
};

export function LimitationBoxBlock({ block }: { block: BlockOf<"limitation_box"> }) {
  const effect = OVERALL_EFFECT_META[block.overallEffect];
  const EffectIcon = effect.icon;

  return (
    <BlockShell
      title={block.title}
      className={claimShellClass(block.claimType)}
      claim={<ClaimBadge claimType={block.claimType} />}
    >
      <div className="mb-3">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium",
            effect.className,
          )}
        >
          <EffectIcon className="size-3.5 shrink-0" aria-hidden />
          {effect.label}
        </span>
      </div>

      <ul className="space-y-3">
        {block.limitations.map((item, i) => (
          <li key={i} className="rounded-lg border border-border bg-muted/20 p-3">
            <div className="flex gap-2.5">
              <RiForbid2Line className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-sm font-medium leading-relaxed text-foreground">
                    {item.limitation}
                  </p>
                  <MetaChip label="Cause" value={LIMITATION_CAUSE_LABELS[item.cause]} />
                </div>

                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Effect on conclusions
                  </h4>
                  <p className="mt-0.5 text-sm leading-relaxed text-foreground">
                    {item.effectOnConclusions}
                  </p>
                </div>

                {item.workaroundApplied !== null ? (
                  <p className="flex gap-1.5 text-xs leading-relaxed text-muted-foreground">
                    <RiShieldCheckLine className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                    <span>
                      <span className="font-medium">Workaround applied: </span>
                      {item.workaroundApplied}
                    </span>
                  </p>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ul>

      <BlockFooter commentary={block.commentary} evidence={block.evidence} requireEvidence={false} />
    </BlockShell>
  );
}

/* -------------------------------------------------------------------------- */
/* follow_up_request                                                          */
/* -------------------------------------------------------------------------- */

export function FollowUpRequestBlock({ block }: { block: BlockOf<"follow_up_request"> }) {
  const blockingCount = block.requestedItems.filter((i) => i.blocking).length;

  return (
    <BlockShell
      title={block.title}
      className={claimShellClass(block.claimType)}
      claim={<ClaimBadge claimType={block.claimType} />}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <MetaChip label="Items requested" value={formatNumber(block.requestedItems.length)} />
        {blockingCount > 0 ? (
          <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
            <RiAlarmWarningLine className="size-3.5 shrink-0" aria-hidden />
            {formatNumber(blockingCount)} blocking
          </span>
        ) : null}
        {block.targetTimeframe !== null ? (
          <MetaChip label="Needed by" value={block.targetTimeframe} />
        ) : null}
      </div>

      <ol className="space-y-3">
        {block.requestedItems.map((item, i) => (
          <li
            key={i}
            className={cn(
              "rounded-lg border p-3",
              item.blocking
                ? "border-amber-500/40 bg-amber-500/[0.06]"
                : "border-border bg-muted/20",
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="text-sm font-medium leading-relaxed text-foreground">{item.item}</p>
              {item.blocking ? (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-amber-500/40 px-1.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                  <RiAlarmWarningLine className="size-3 shrink-0" aria-hidden />
                  Blocking
                </span>
              ) : null}
            </div>

            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.purpose}</p>

            {item.fromRole !== null || item.format !== null ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {item.fromRole !== null ? <MetaChip label="From" value={item.fromRole} /> : null}
                {item.format !== null ? <MetaChip label="Format" value={item.format} /> : null}
              </div>
            ) : null}
          </li>
        ))}
      </ol>

      <div className="mt-4 space-y-4">
        <ListSection
          title="What this would enable"
          icon={RiListCheck2}
          items={block.wouldEnable}
        />

        <div className="rounded-lg border border-dashed border-border p-3">
          <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <RiErrorWarningLine className="size-3.5 shrink-0" aria-hidden />
            If not provided
          </h4>
          <p className="mt-1.5 text-sm leading-relaxed text-foreground">{block.ifNotProvided}</p>
        </div>
      </div>

      <BlockFooter commentary={block.commentary} evidence={block.evidence} requireEvidence={false} />
    </BlockShell>
  );
}
