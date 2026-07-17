import {
  RiAlertLine,
  RiCheckboxCircleLine,
  RiCloseCircleLine,
  RiCornerDownRightLine,
  RiErrorWarningLine,
  RiFileTextLine,
  RiFlashlightLine,
  RiIndeterminateCircleLine,
  RiInformationLine,
  RiListCheck2,
  RiPriceTag3Line,
  RiQuestionLine,
  RiScales3Line,
  RiSearchEyeLine,
  RiShieldCheckLine,
  RiShieldLine,
  RiSpam3Line,
  RiTimeLine,
  RiToolsLine,
  RiUserLine,
  RiUserVoiceLine,
} from "@remixicon/react";
import type { ComponentType, ReactNode } from "react";

import {
  BlockShell,
  ClaimBadge,
  Empty,
  EvidenceChips,
  MissingEvidenceNote,
  SeverityBadge,
  describeLocator,
  formatMoney,
  formatValue,
} from "@/components/blocks/shared";
import type { EvidenceInput } from "@/lib/ai/blocks/primitives";
import type { BlockOf } from "@/lib/ai/blocks/schemas";
import type { Confidence } from "@/lib/ai/blocks/types";
import { cn } from "@/lib/utils";

/**
 * The action blocks: what the auditor should do about what was found, and the evidence
 * apparatus that lets a reviewer check it.
 *
 * These blocks are where an audit stops describing and starts recommending, so the epistemic
 * rules bite hardest here. Two are enforced structurally rather than left to each renderer:
 *
 *  - **A recommendation built on a hypothesis must not read like one built on a fact**
 *    (PRD §10.5, §31). Every block leads with its ClaimBadge, and anything weaker than
 *    `evidence_supported` gets an explicit banner above the content — not a subtle tint.
 *  - **Severity, priority and verification are never colour alone** (PRD §26.4). Every state
 *    pill pairs an icon with a word; colour is the third signal, never the first.
 *
 * None of these blocks charts anything, so the whole file stays a server component.
 */

/* -------------------------------------------------------------------------- */
/* Types derived from the schemas (so this file cannot drift from them)        */
/* -------------------------------------------------------------------------- */

type Priority = BlockOf<"recommendation_card">["priority"];
type Effort = BlockOf<"recommendation_card">["effort"];
type ClaimType = BlockOf<"recommendation_card">["claimType"];
type ControlType = BlockOf<"control_weakness">["controlType"];
type ControlOperation = BlockOf<"control_weakness">["operation"];
type DeficiencyType = BlockOf<"control_weakness">["deficiencyType"];
type RiskLevelValue = BlockOf<"control_recommendation">["residualRiskAfter"];
type Reliability = BlockOf<"evidence_list">["items"][number]["reliability"];
type VerificationStatus = BlockOf<"source_citation">["verificationStatus"];
type AnalysisMethod = BlockOf<"root_cause_analysis">["analysisMethod"];
type CauseCategory = BlockOf<"root_cause_analysis">["rootCauses"][number]["category"];

type Icon = ComponentType<{ className?: string }>;

/* -------------------------------------------------------------------------- */
/* Local presentation vocabulary                                              */
/* -------------------------------------------------------------------------- */

const PILL_BASE =
  "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap";

const TONE = {
  danger: "border-destructive/40 bg-destructive/10 text-destructive",
  warn: "border-orange-500/40 bg-orange-500/10 text-orange-700 dark:text-orange-300",
  caution: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  good: "border-emerald-600/40 bg-emerald-600/10 text-emerald-700 dark:text-emerald-300",
  neutral: "border-border bg-muted text-muted-foreground",
  quiet: "border-border bg-transparent text-muted-foreground",
} as const;

type Tone = keyof typeof TONE;

/** One pill = icon + word + colour, in that order of importance (PRD §26.4). */
function Pill({
  icon: PillIcon,
  children,
  tone = "neutral",
  srSuffix,
  className,
}: {
  icon: Icon;
  children: ReactNode;
  tone?: Tone;
  /** Says what the word means, e.g. "priority", so a screen reader hears "High priority". */
  srSuffix?: string;
  className?: string;
}) {
  return (
    <span className={cn(PILL_BASE, TONE[tone], className)}>
      <PillIcon className="size-3.5 shrink-0" aria-hidden />
      <span>{children}</span>
      {srSuffix ? <span className="sr-only">{srSuffix}</span> : null}
    </span>
  );
}

const PRIORITY_META: Record<Priority, { label: string; icon: Icon; tone: Tone }> = {
  immediate: { label: "Immediate", icon: RiFlashlightLine, tone: "danger" },
  high: { label: "High", icon: RiAlertLine, tone: "warn" },
  medium: { label: "Medium", icon: RiInformationLine, tone: "caution" },
  low: { label: "Low", icon: RiInformationLine, tone: "neutral" },
};

function PriorityPill({ priority, className }: { priority: Priority; className?: string }) {
  const meta = PRIORITY_META[priority];
  return (
    <Pill icon={meta.icon} tone={meta.tone} srSuffix="priority" className={className}>
      {meta.label} priority
    </Pill>
  );
}

const EFFORT_LABEL: Record<Effort, string> = { low: "Low", medium: "Medium", high: "High" };

function EffortPill({ effort, noun = "Effort" }: { effort: Effort; noun?: string }) {
  return (
    <Pill icon={RiToolsLine} tone="quiet">
      {noun}: {EFFORT_LABEL[effort]}
    </Pill>
  );
}

const RISK_META: Record<RiskLevelValue, { label: string; icon: Icon; tone: Tone }> = {
  critical: { label: "Critical", icon: RiErrorWarningLine, tone: "danger" },
  high: { label: "High", icon: RiAlertLine, tone: "warn" },
  medium: { label: "Medium", icon: RiAlertLine, tone: "caution" },
  low: { label: "Low", icon: RiInformationLine, tone: "neutral" },
  none: { label: "None", icon: RiCheckboxCircleLine, tone: "good" },
};

const CONFIDENCE_META: Record<Confidence, { label: string; icon: Icon; tone: Tone }> = {
  high: { label: "High confidence", icon: RiCheckboxCircleLine, tone: "quiet" },
  medium: { label: "Medium confidence", icon: RiScales3Line, tone: "quiet" },
  low: { label: "Low confidence", icon: RiQuestionLine, tone: "caution" },
};

const CONTROL_TYPE_LABEL: Record<ControlType, string> = {
  preventive: "Preventive",
  detective: "Detective",
  corrective: "Corrective",
};

const OPERATION_LABEL: Record<ControlOperation, string> = {
  manual: "Manual",
  automated: "Automated",
  hybrid: "Hybrid",
};

/* -------------------------------------------------------------------------- */
/* Small layout primitives                                                    */
/* -------------------------------------------------------------------------- */

/** A labelled definition row. Numeric values are tabular so columns of them line up. */
function Meta({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm text-foreground">{children}</dd>
    </div>
  );
}

function MetaGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <dl className={cn("grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4", className)}>{children}</dl>
  );
}

/** A right-aligned figure. Never a raw float — callers format first. */
function Figure({ children }: { children: ReactNode }) {
  return <span className="tabular-nums">{children}</span>;
}

function Prose({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</h4>
      <p className="mt-1 text-sm leading-relaxed text-foreground">{children}</p>
    </div>
  );
}

function FindingRefs({ refs, label = "Traces to" }: { refs: string[]; label?: string }) {
  if (refs.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <ul className="flex flex-wrap gap-1.5">
        {refs.map((ref) => (
          <li key={ref}>
            <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-1.5 py-0.5 font-mono text-xs text-foreground">
              <RiPriceTag3Line className="size-3 shrink-0" aria-hidden />
              {ref}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Bullets({ items, icon: BulletIcon = RiCornerDownRightLine }: { items: string[]; icon?: Icon }) {
  return (
    <ul className="space-y-1">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2 text-sm leading-relaxed text-foreground">
          <BulletIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * A recommendation resting on a hypothesis is the single most dangerous thing this file can
 * render, so weak claims are called out in words above the content rather than tinted.
 */
const WEAK_CLAIM_NOTICE: Partial<Record<ClaimType, string>> = {
  unverified_hypothesis:
    "This is an unverified hypothesis. It has not been tested against evidence — confirm it before acting on anything below.",
  missing_information:
    "The evidence needed to support this was not available. Treat everything below as provisional.",
  user_claim: "This rests on information supplied by a user that has not been independently corroborated.",
  judgment_required:
    "A qualified professional must decide this. It is put forward for their judgement, not as a conclusion.",
};

function ClaimNotice({ claimType }: { claimType: ClaimType }) {
  const notice = WEAK_CLAIM_NOTICE[claimType];
  if (!notice) return null;
  return (
    <p
      className={cn(
        "mb-4 flex gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm leading-relaxed",
        "text-amber-800 dark:text-amber-200",
      )}
    >
      <RiErrorWarningLine className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{notice}</span>
    </p>
  );
}

/** Commentary plus citations, in the same place on every block in this file. */
function BlockFooter({
  commentary,
  evidence,
  claimType,
}: {
  commentary: string | null;
  evidence: EvidenceInput[];
  claimType: ClaimType;
}) {
  const hasEvidence = evidence.length > 0;
  // Only a contradiction is worth flagging: an evidence-supported claim with nothing cited.
  const showMissing = !hasEvidence && claimType === "evidence_supported";
  if (!commentary && !hasEvidence && !showMissing) return null;

  return (
    <div className="mt-4 space-y-2 border-t border-border pt-3">
      {commentary ? <p className="text-sm leading-relaxed text-muted-foreground">{commentary}</p> : null}
      {hasEvidence ? <EvidenceChips evidence={evidence} /> : null}
      {showMissing ? <MissingEvidenceNote /> : null}
    </div>
  );
}

/** Yes/no facts that carry risk must read as words, never as a bare colour or a tick. */
function BooleanFlag({
  value,
  trueLabel,
  falseLabel,
  trueTone = "danger",
  falseTone = "quiet",
}: {
  value: boolean;
  trueLabel: string;
  falseLabel: string;
  trueTone?: Tone;
  falseTone?: Tone;
}) {
  return value ? (
    <Pill icon={RiAlertLine} tone={trueTone}>
      {trueLabel}
    </Pill>
  ) : (
    <Pill icon={RiCheckboxCircleLine} tone={falseTone}>
      {falseLabel}
    </Pill>
  );
}

/* -------------------------------------------------------------------------- */
/* evidence_list                                                              */
/* -------------------------------------------------------------------------- */

const RELIABILITY_META: Record<
  Reliability,
  { label: string; strength: string; icon: Icon; tone: Tone }
> = {
  source_system: {
    label: "Source system",
    strength: "Strongest",
    icon: RiShieldCheckLine,
    tone: "good",
  },
  third_party: { label: "Third party", strength: "Strong", icon: RiShieldLine, tone: "good" },
  client_prepared: {
    label: "Client-prepared",
    strength: "Moderate",
    icon: RiFileTextLine,
    tone: "neutral",
  },
  management_representation: {
    label: "Management representation",
    strength: "Weak — corroborates nothing alone",
    icon: RiUserVoiceLine,
    tone: "caution",
  },
  derived_by_analysis: {
    label: "Derived by analysis",
    strength: "Derived — no stronger than its inputs",
    icon: RiScales3Line,
    tone: "caution",
  },
};

export function EvidenceListBlock({ block }: { block: BlockOf<"evidence_list"> }) {
  return (
    <BlockShell title={block.title} claim={<ClaimBadge claimType={block.claimType} />}>
      <ClaimNotice claimType={block.claimType} />

      {block.items.length === 0 ? (
        <Empty>No evidence was relied on for this section.</Empty>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">
              Evidence relied on, graded by reliability. {block.items.length} item
              {block.items.length === 1 ? "" : "s"}.
            </caption>
            <thead>
              <tr className="border-b border-border text-left">
                <th scope="col" className="py-2 pr-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Source
                </th>
                <th scope="col" className="py-2 pr-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  What it shows
                </th>
                <th scope="col" className="py-2 pr-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Reliability
                </th>
                <th scope="col" className="py-2 pr-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Sufficient alone
                </th>
                <th scope="col" className="py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Findings
                </th>
              </tr>
            </thead>
            <tbody>
              {block.items.map((item, i) => {
                const meta = RELIABILITY_META[item.reliability];
                return (
                  <tr key={`${item.inputId}-${i}`} className="border-b border-border/60 align-top last:border-0">
                    <th scope="row" className="py-2.5 pr-4 text-left font-medium text-foreground">
                      <span className="block">{item.label}</span>
                      <span className="mt-0.5 block font-mono text-xs font-normal text-muted-foreground">
                        {item.inputId}
                        {item.documentId ? ` · ${item.documentId}` : ""}
                      </span>
                    </th>
                    <td className="py-2.5 pr-4 text-muted-foreground">{item.whatItShows}</td>
                    <td className="py-2.5 pr-4">
                      <Pill icon={meta.icon} tone={meta.tone} srSuffix="reliability">
                        {meta.label}
                      </Pill>
                      <span className="mt-1 block text-xs text-muted-foreground">{meta.strength}</span>
                    </td>
                    <td className="py-2.5 pr-4">
                      {item.sufficientAlone ? (
                        <Pill icon={RiCheckboxCircleLine} tone="good">
                          Yes
                        </Pill>
                      ) : (
                        <Pill icon={RiIndeterminateCircleLine} tone="caution">
                          No — needs corroboration
                        </Pill>
                      )}
                    </td>
                    <td className="py-2.5">
                      {item.relatedFindingRefs.length === 0 ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        <FindingRefs refs={item.relatedFindingRefs} label="" />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 rounded-lg border border-border bg-muted/40 p-3">
        <h4 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <RiScales3Line className="size-3.5 shrink-0" aria-hidden />
          Sufficiency of the evidence as a whole
        </h4>
        <p className="mt-1 text-sm leading-relaxed text-foreground">{block.sufficiencyAssessment}</p>
      </div>

      <BlockFooter commentary={block.commentary} evidence={block.evidence} claimType={block.claimType} />
    </BlockShell>
  );
}

/* -------------------------------------------------------------------------- */
/* source_citation                                                            */
/* -------------------------------------------------------------------------- */

const VERIFICATION_META: Record<VerificationStatus, { label: string; icon: Icon; tone: Tone }> = {
  verified_against_source: {
    label: "Verified against source",
    icon: RiCheckboxCircleLine,
    tone: "good",
  },
  not_verified: { label: "Not verified", icon: RiQuestionLine, tone: "caution" },
  source_unavailable: { label: "Source unavailable", icon: RiCloseCircleLine, tone: "danger" },
};

export function SourceCitationBlock({ block }: { block: BlockOf<"source_citation"> }) {
  const verification = VERIFICATION_META[block.verificationStatus];
  const locator = describeLocator(block.source);

  return (
    <BlockShell
      title={block.title}
      claim={<ClaimBadge claimType={block.claimType} />}
      actions={
        <Pill icon={verification.icon} tone={verification.tone} srSuffix="verification status">
          {verification.label}
        </Pill>
      }
    >
      <ClaimNotice claimType={block.claimType} />

      <figure className="rounded-lg border border-border bg-muted/30 p-3">
        <figcaption className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
            <RiFileTextLine className="size-3.5 shrink-0" aria-hidden />
            {block.source.label}
          </span>
          {locator ? <span>{locator}</span> : null}
          <span className="font-mono">
            {block.source.inputId}
            {block.source.documentId ? ` · ${block.source.documentId}` : ""}
          </span>
        </figcaption>

        {block.quotedText ? (
          <blockquote className="mt-2 border-l-2 border-border pl-3 text-sm italic leading-relaxed text-foreground">
            “{block.quotedText}”
          </blockquote>
        ) : null}

        {block.quotedValue !== null ? (
          <p className="mt-2 text-lg font-semibold tabular-nums text-foreground">
            {formatValue(block.quotedValue, "number")}
            <span className="ml-2 text-xs font-normal text-muted-foreground">as it appears in the source</span>
          </p>
        ) : null}

        {!block.quotedText && block.quotedValue === null ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No verbatim extract was captured from this source.
          </p>
        ) : null}
      </figure>

      <div className="mt-3 space-y-3">
        <Prose label="What this citation proves">{block.howUsed}</Prose>
        {block.retrievedAt ? (
          <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <RiTimeLine className="size-3.5 shrink-0" aria-hidden />
            Retrieved {formatValue(block.retrievedAt, "date")}
          </p>
        ) : null}
      </div>

      <BlockFooter commentary={block.commentary} evidence={block.evidence} claimType={block.claimType} />
    </BlockShell>
  );
}

/* -------------------------------------------------------------------------- */
/* recommendation_card                                                        */
/* -------------------------------------------------------------------------- */

export function RecommendationCardBlock({ block }: { block: BlockOf<"recommendation_card"> }) {
  return (
    <BlockShell
      title={block.title}
      claim={<ClaimBadge claimType={block.claimType} />}
      actions={<PriorityPill priority={block.priority} />}
    >
      <ClaimNotice claimType={block.claimType} />

      <p className="text-base font-medium leading-relaxed text-foreground">{block.recommendation}</p>

      <div className="mt-3 space-y-3">
        <Prose label="Rationale">{block.rationale}</Prose>
        <Prose label="Expected benefit">{block.expectedBenefit}</Prose>
      </div>

      <MetaGrid className="mt-4 border-t border-border pt-3">
        <Meta label="Effort">
          <EffortPill effort={block.effort} />
        </Meta>
        <Meta label="Quantified benefit">
          {block.benefitQuantified ? (
            <Figure>{formatMoney(block.benefitQuantified.amount, block.benefitQuantified.currency)}</Figure>
          ) : (
            <span className="text-muted-foreground">Not estimable</span>
          )}
        </Meta>
        <Meta label="Owner">
          {block.ownerRole ? (
            <span className="inline-flex items-center gap-1.5">
              <RiUserLine className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
              {block.ownerRole}
            </span>
          ) : (
            <span className="text-muted-foreground">Unassigned</span>
          )}
        </Meta>
        <Meta label="Timeframe">
          {block.timeframe ? (
            <span className="inline-flex items-center gap-1.5">
              <RiTimeLine className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
              {block.timeframe}
            </span>
          ) : (
            <span className="text-muted-foreground">Not stated</span>
          )}
        </Meta>
      </MetaGrid>

      {block.dependencies.length > 0 ? (
        <div className="mt-3">
          <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Dependencies</h4>
          <div className="mt-1">
            <Bullets items={block.dependencies} />
          </div>
        </div>
      ) : null}

      {block.relatedFindingRefs.length > 0 ? (
        <div className="mt-3">
          <FindingRefs refs={block.relatedFindingRefs} />
        </div>
      ) : (
        <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-300">
          <RiErrorWarningLine className="size-3.5 shrink-0" aria-hidden />
          This recommendation is not traced to a finding.
        </p>
      )}

      <BlockFooter commentary={block.commentary} evidence={block.evidence} claimType={block.claimType} />
    </BlockShell>
  );
}

/* -------------------------------------------------------------------------- */
/* action_plan                                                                */
/* -------------------------------------------------------------------------- */

export function ActionPlanBlock({ block }: { block: BlockOf<"action_plan"> }) {
  const steps = [...block.steps].sort((a, b) => a.order - b.order);

  return (
    <BlockShell
      title={block.title}
      claim={<ClaimBadge claimType={block.claimType} />}
      actions={
        block.estimatedDuration ? (
          <Pill icon={RiTimeLine} tone="quiet">
            {block.estimatedDuration}
          </Pill>
        ) : undefined
      }
    >
      <ClaimNotice claimType={block.claimType} />

      <Prose label="Objective">{block.objective}</Prose>

      {steps.length === 0 ? (
        <div className="mt-3">
          <Empty>No steps were specified for this plan.</Empty>
        </div>
      ) : (
        <ol className="mt-4 space-y-3">
          {steps.map((step) => (
            <li
              key={step.order}
              className="relative rounded-lg border border-border bg-muted/20 p-3 pl-11"
            >
              <span
                className="absolute left-3 top-3 inline-flex size-5 items-center justify-center rounded-full bg-foreground text-[0.625rem] font-semibold tabular-nums text-background"
                aria-hidden
              >
                {step.order}
              </span>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="text-sm font-medium leading-relaxed text-foreground">
                  <span className="sr-only">Step {step.order}. </span>
                  {step.action}
                </p>
                <PriorityPill priority={step.priority} />
              </div>

              <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-3">
                <Meta label="Owner">
                  {step.ownerRole ?? <span className="text-muted-foreground">Unassigned</span>}
                </Meta>
                <Meta label="Target">
                  {step.targetTimeframe ?? <span className="text-muted-foreground">Not stated</span>}
                </Meta>
                <Meta label="Depends on">
                  {step.dependsOnStep !== null ? (
                    <span className="tabular-nums">Step {step.dependsOnStep}</span>
                  ) : (
                    <span className="text-muted-foreground">Nothing</span>
                  )}
                </Meta>
              </dl>

              <p className="mt-2 flex gap-2 text-sm leading-relaxed text-muted-foreground">
                <RiCheckboxCircleLine className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                <span>
                  <span className="font-medium text-foreground">Done when: </span>
                  {step.successCriteria}
                </span>
              </p>
            </li>
          ))}
        </ol>
      )}

      {block.relatedFindingRefs.length > 0 ? (
        <div className="mt-3">
          <FindingRefs refs={block.relatedFindingRefs} label="Remediates" />
        </div>
      ) : null}

      <BlockFooter commentary={block.commentary} evidence={block.evidence} claimType={block.claimType} />
    </BlockShell>
  );
}

/* -------------------------------------------------------------------------- */
/* management_question                                                        */
/* -------------------------------------------------------------------------- */

export function ManagementQuestionBlock({ block }: { block: BlockOf<"management_question"> }) {
  const blockingCount = block.questions.filter((q) => q.blocksConclusion).length;

  return (
    <BlockShell
      title={block.title}
      claim={<ClaimBadge claimType={block.claimType} />}
      actions={
        blockingCount > 0 ? (
          <Pill icon={RiAlertLine} tone="warn">
            {blockingCount} of {block.questions.length} block a conclusion
          </Pill>
        ) : undefined
      }
    >
      {block.context ? (
        <p className="mb-3 text-sm leading-relaxed text-muted-foreground">{block.context}</p>
      ) : null}

      {block.questions.length === 0 ? (
        <Empty>No questions were raised for management.</Empty>
      ) : (
        <ol className="space-y-3">
          {block.questions.map((q, i) => (
            <li key={i} className="rounded-lg border border-border bg-muted/20 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h4 className="flex gap-2 text-sm font-medium leading-relaxed text-foreground">
                  <RiQuestionLine className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span>{q.question}</span>
                </h4>
                {q.blocksConclusion ? (
                  <Pill icon={RiAlertLine} tone="warn">
                    Blocks a conclusion
                  </Pill>
                ) : (
                  <Pill icon={RiInformationLine} tone="quiet">
                    Clarifying
                  </Pill>
                )}
              </div>

              <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-3">
                <Meta label="Why asked">
                  <span className="font-normal text-muted-foreground">{q.whyAsked}</span>
                </Meta>
                <Meta label="An adequate answer contains">
                  <span className="font-normal text-muted-foreground">{q.informationNeeded}</span>
                </Meta>
                <Meta label="Addressed to">
                  {q.addressedToRole ? (
                    <span className="inline-flex items-center gap-1.5">
                      <RiUserLine className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                      {q.addressedToRole}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Not addressed to a role</span>
                  )}
                </Meta>
              </dl>

              {q.relatedFindingRefs.length > 0 ? (
                <div className="mt-2">
                  <FindingRefs refs={q.relatedFindingRefs} label="Relates to" />
                </div>
              ) : null}
            </li>
          ))}
        </ol>
      )}

      <BlockFooter commentary={block.commentary} evidence={block.evidence} claimType={block.claimType} />
    </BlockShell>
  );
}

/* -------------------------------------------------------------------------- */
/* root_cause_analysis                                                        */
/* -------------------------------------------------------------------------- */

const ANALYSIS_METHOD_LABEL: Record<AnalysisMethod, string> = {
  five_whys: "Five whys",
  fishbone: "Fishbone",
  control_gap_trace: "Control gap trace",
  data_lineage: "Data lineage",
  hypothesis_elimination: "Hypothesis elimination",
};

const CAUSE_CATEGORY_LABEL: Record<CauseCategory, string> = {
  process: "Process",
  people: "People",
  system: "System",
  data: "Data",
  policy: "Policy",
  external: "External",
};

export function RootCauseAnalysisBlock({ block }: { block: BlockOf<"root_cause_analysis"> }) {
  const chain = [...block.causeChain].sort((a, b) => a.level - b.level);
  const unverifiedLinks = chain.filter((link) => !link.verified).length;

  return (
    <BlockShell
      title={block.title}
      claim={<ClaimBadge claimType={block.claimType} />}
      actions={
        <Pill icon={RiSearchEyeLine} tone="quiet">
          {ANALYSIS_METHOD_LABEL[block.analysisMethod]}
        </Pill>
      }
    >
      <ClaimNotice claimType={block.claimType} />

      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <Prose label="Symptom">{block.symptom}</Prose>
        </div>
        <BooleanFlag
          value={block.systemic}
          trueLabel="Systemic — expect this elsewhere"
          falseLabel="Isolated to this area"
          trueTone="warn"
        />
      </div>

      {chain.length > 0 ? (
        <div className="mt-4">
          <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Cause chain
            {unverifiedLinks > 0 ? (
              <span className="ml-2 font-normal normal-case text-amber-700 dark:text-amber-300">
                {unverifiedLinks} of {chain.length} link{chain.length === 1 ? "" : "s"} unverified
              </span>
            ) : null}
          </h4>
          <ol className="mt-2 space-y-2">
            {chain.map((link, i) => (
              <li key={i} className="flex gap-3">
                <span
                  className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-[0.625rem] font-semibold tabular-nums text-muted-foreground"
                  aria-hidden
                >
                  {link.level}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-relaxed text-foreground">
                    <span className="sr-only">Level {link.level}. </span>
                    {link.statement}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {link.verified ? (
                      <Pill icon={RiCheckboxCircleLine} tone="good">
                        Verified
                      </Pill>
                    ) : (
                      <Pill icon={RiQuestionLine} tone="caution">
                        Reasoning, not evidence
                      </Pill>
                    )}
                    {link.evidenceLabel ? (
                      <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground">
                        <RiFileTextLine className="size-3 shrink-0" aria-hidden />
                        {link.evidenceLabel}
                      </span>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      <div className="mt-4">
        <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Root causes</h4>
        {block.rootCauses.length === 0 ? (
          <div className="mt-1">
            <Empty>No root cause could be isolated.</Empty>
          </div>
        ) : (
          <ul className="mt-2 space-y-2">
            {block.rootCauses.map((cause, i) => {
              const conf = CONFIDENCE_META[cause.confidence];
              return (
                <li
                  key={i}
                  className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-border bg-muted/20 p-3"
                >
                  <p className="min-w-0 flex-1 text-sm font-medium leading-relaxed text-foreground">
                    {cause.statement}
                  </p>
                  <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                    <Pill icon={RiPriceTag3Line} tone="quiet" srSuffix="cause category">
                      {CAUSE_CATEGORY_LABEL[cause.category]}
                    </Pill>
                    <Pill icon={conf.icon} tone={conf.tone} srSuffix="in this root cause">
                      {conf.label}
                    </Pill>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {block.ruledOut.length > 0 ? (
        <div className="mt-4">
          <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Tested and ruled out
          </h4>
          <div className="mt-1">
            <Bullets items={block.ruledOut} icon={RiCloseCircleLine} />
          </div>
        </div>
      ) : null}

      {block.relatedFindingRefs.length > 0 ? (
        <div className="mt-3">
          <FindingRefs refs={block.relatedFindingRefs} label="Explains" />
        </div>
      ) : null}

      <BlockFooter commentary={block.commentary} evidence={block.evidence} claimType={block.claimType} />
    </BlockShell>
  );
}

/* -------------------------------------------------------------------------- */
/* control_weakness                                                           */
/* -------------------------------------------------------------------------- */

const DEFICIENCY_META: Record<DeficiencyType, { label: string; explanation: string }> = {
  design_deficiency: {
    label: "Design deficiency",
    explanation: "The control could not achieve its objective even if performed exactly as written.",
  },
  operating_deficiency: {
    label: "Operating deficiency",
    explanation: "The control is capable of working but was not performed properly.",
  },
  both: {
    label: "Design and operating deficiency",
    explanation: "The control is both wrongly designed and not performed properly.",
  },
};

export function ControlWeaknessBlock({ block }: { block: BlockOf<"control_weakness"> }) {
  const deficiency = DEFICIENCY_META[block.deficiencyType];
  const exceptionRate =
    block.populationTested !== null &&
    block.populationTested > 0 &&
    block.exceptionsFound !== null
      ? (block.exceptionsFound / block.populationTested) * 100
      : null;

  return (
    <BlockShell
      title={block.title}
      claim={<ClaimBadge claimType={block.claimType} />}
      actions={<SeverityBadge severity={block.severity} />}
    >
      <ClaimNotice claimType={block.claimType} />

      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <h4 className="text-sm font-semibold text-foreground">{block.controlName}</h4>
        {block.controlRef ? (
          <span className="font-mono text-xs text-muted-foreground">{block.controlRef}</span>
        ) : (
          <span className="text-xs text-muted-foreground">No client control reference</span>
        )}
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        <Pill icon={RiShieldLine} tone="quiet" srSuffix="control type">
          {CONTROL_TYPE_LABEL[block.controlType]}
        </Pill>
        <Pill icon={RiToolsLine} tone="quiet" srSuffix="control operation">
          {OPERATION_LABEL[block.operation]}
        </Pill>
        <Pill icon={RiAlertLine} tone="caution" srSuffix="deficiency type">
          {deficiency.label}
        </Pill>
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">{deficiency.explanation}</p>

      <div className="mt-3 space-y-3">
        <Prose label="Control objective">{block.controlObjective}</Prose>
        <Prose label="The gap">{block.gapDescription}</Prose>
        <Prose label="How it was identified">{block.howIdentified}</Prose>
      </div>

      <div className="mt-4 overflow-x-auto border-t border-border pt-3">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">Testing results for control {block.controlName}.</caption>
          <thead>
            <tr className="border-b border-border">
              <th scope="col" className="py-1.5 pr-4 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Measure
              </th>
              <th scope="col" className="py-1.5 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Value
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border/60">
              <th scope="row" className="py-1.5 pr-4 text-left font-normal text-muted-foreground">
                Population tested
              </th>
              <td className="py-1.5 text-right">
                {block.populationTested !== null ? (
                  <Figure>{formatValue(block.populationTested, "number")}</Figure>
                ) : (
                  <span className="text-muted-foreground">Not tested</span>
                )}
              </td>
            </tr>
            <tr className="border-b border-border/60">
              <th scope="row" className="py-1.5 pr-4 text-left font-normal text-muted-foreground">
                Exceptions found
              </th>
              <td className="py-1.5 text-right">
                {block.exceptionsFound !== null ? (
                  <Figure>{formatValue(block.exceptionsFound, "number")}</Figure>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
            </tr>
            {exceptionRate !== null ? (
              <tr className="border-b border-border/60">
                <th scope="row" className="py-1.5 pr-4 text-left font-normal text-muted-foreground">
                  Exception rate
                </th>
                <td className="py-1.5 text-right font-medium">
                  <Figure>{formatValue(exceptionRate, "percent")}</Figure>
                </td>
              </tr>
            ) : null}
            <tr className="border-b border-border/60">
              <th scope="row" className="py-1.5 pr-4 text-left font-normal text-muted-foreground">
                Failure frequency
              </th>
              <td className="py-1.5 text-right">
                {block.failureFrequency ?? <span className="text-muted-foreground">Not quantified</span>}
              </td>
            </tr>
            <tr>
              <th scope="row" className="py-1.5 pr-4 text-left font-normal text-muted-foreground">
                Exposure
              </th>
              <td className="py-1.5 text-right font-medium">
                {block.exposure ? (
                  <Figure>{formatMoney(block.exposure.amount, block.exposure.currency)}</Figure>
                ) : (
                  <span className="font-normal text-muted-foreground">Not estimable</span>
                )}
              </td>
            </tr>
          </tbody>
        </table>
        {block.exposure && block.exposureBasis ? (
          <p className="mt-1.5 text-xs text-muted-foreground">Exposure basis: {block.exposureBasis}</p>
        ) : null}
      </div>

      <div className="mt-4 space-y-2 border-t border-border pt-3">
        <div>
          <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Compensating controls
          </h4>
          {block.compensatingControls.length === 0 ? (
            <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-amber-700 dark:text-amber-300">
              <RiAlertLine className="size-3.5 shrink-0" aria-hidden />
              None — nothing else catches this.
            </p>
          ) : (
            <div className="mt-1">
              <Bullets items={block.compensatingControls} icon={RiShieldCheckLine} />
            </div>
          )}
        </div>

        <BooleanFlag
          value={block.couldEnableFraud}
          trueLabel="Could let a management override go undetected"
          falseLabel="Would not conceal an override"
          trueTone="danger"
        />
      </div>

      {block.relatedFindingRefs.length > 0 ? (
        <div className="mt-3">
          <FindingRefs refs={block.relatedFindingRefs} />
        </div>
      ) : null}

      <BlockFooter commentary={block.commentary} evidence={block.evidence} claimType={block.claimType} />
    </BlockShell>
  );
}

/* -------------------------------------------------------------------------- */
/* control_recommendation                                                     */
/* -------------------------------------------------------------------------- */

export function ControlRecommendationBlock({ block }: { block: BlockOf<"control_recommendation"> }) {
  const residual = RISK_META[block.residualRiskAfter];

  return (
    <BlockShell
      title={block.title}
      claim={<ClaimBadge claimType={block.claimType} />}
      actions={<PriorityPill priority={block.priority} />}
    >
      <ClaimNotice claimType={block.claimType} />

      {block.addressesControlRef ? (
        <p className="mb-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <RiCornerDownRightLine className="size-3.5 shrink-0" aria-hidden />
          Addresses control
          <span className="font-mono text-foreground">{block.addressesControlRef}</span>
        </p>
      ) : null}

      <blockquote className="rounded-lg border border-border bg-muted/30 p-3 text-sm font-medium leading-relaxed text-foreground">
        {block.recommendedControl}
      </blockquote>
      <p className="mt-1.5 text-xs text-muted-foreground">
        Stated as it should appear in the control matrix.
      </p>

      <MetaGrid className="mt-4">
        <Meta label="Control type">
          <Pill icon={RiShieldLine} tone="quiet" srSuffix="control type">
            {CONTROL_TYPE_LABEL[block.controlType]}
          </Pill>
        </Meta>
        <Meta label="Operation">
          <Pill icon={RiToolsLine} tone="quiet" srSuffix="control operation">
            {OPERATION_LABEL[block.operation]}
          </Pill>
        </Meta>
        <Meta label="Frequency">
          <span className="inline-flex items-center gap-1.5">
            <RiTimeLine className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
            {block.frequency}
          </span>
        </Meta>
        <Meta label="Cost to implement">
          <EffortPill effort={block.cost} noun="Cost" />
        </Meta>
      </MetaGrid>

      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/20 p-3">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Residual risk once operating as designed
        </span>
        <Pill icon={residual.icon} tone={residual.tone} srSuffix="residual risk">
          {residual.label}
        </Pill>
      </div>

      {block.implementationSteps.length > 0 ? (
        <div className="mt-4">
          <h4 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <RiListCheck2 className="size-3.5 shrink-0" aria-hidden />
            Implementation
          </h4>
          <ol className="mt-2 space-y-1.5">
            {block.implementationSteps.map((step, i) => (
              <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-foreground">
                <span
                  className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-[0.625rem] font-semibold tabular-nums text-muted-foreground"
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

      <MetaGrid className="mt-4 border-t border-border pt-3 sm:grid-cols-2">
        <Meta label="Owner">
          {block.ownerRole ? (
            <span className="inline-flex items-center gap-1.5">
              <RiUserLine className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
              {block.ownerRole}
            </span>
          ) : (
            <span className="text-muted-foreground">Unassigned</span>
          )}
        </Meta>
        <Meta label="How a future audit should test it">
          {block.testingApproach ? (
            <span className="font-normal text-muted-foreground">{block.testingApproach}</span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
              <RiSpam3Line className="size-3.5 shrink-0" aria-hidden />
              No testing approach specified
            </span>
          )}
        </Meta>
      </MetaGrid>

      <BlockFooter commentary={block.commentary} evidence={block.evidence} claimType={block.claimType} />
    </BlockShell>
  );
}
