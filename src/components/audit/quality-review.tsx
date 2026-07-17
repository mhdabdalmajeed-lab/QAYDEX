import { RiCheckboxCircleLine, RiErrorWarningLine, RiInformationLine } from "@remixicon/react";

import { SeverityBadge } from "@/components/blocks/shared";
import type { QualityReviewResult } from "@/db/schema";
import { cn } from "@/lib/utils";

/**
 * The quality review verdict (PRD §22.8).
 *
 * Stage 8 checks the model's own output before publication. When it fails, that is the single
 * most important thing on the page: it renders **above** the findings, at full weight, because a
 * reader who scrolls past a collapsed footnote will quote a finding the platform already knows
 * is suspect.
 *
 * A pass is stated too, quietly — "no news" is not the same claim as "we checked".
 */
export function QualityReviewNotice({
  review,
  className,
}: {
  review: QualityReviewResult | null;
  className?: string;
}) {
  if (!review) {
    return (
      <section
        className={cn(
          "flex items-start gap-2 rounded-xl border border-border bg-muted/40 p-4",
          className,
        )}
      >
        <RiInformationLine className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
        <div>
          <h2 className="text-sm font-medium">No quality review was recorded</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            This revision was published without a stored quality-review result. Treat its findings
            as unchecked by the platform.
          </p>
        </div>
      </section>
    );
  }

  const failed = review.checks.filter((check) => !check.passed);

  if (review.passed) {
    return (
      <section
        className={cn(
          "flex items-start gap-2 rounded-xl border border-border bg-muted/40 p-4",
          className,
        )}
        aria-label="Quality review"
      >
        <RiCheckboxCircleLine
          className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400"
          aria-hidden
        />
        <div className="min-w-0">
          <h2 className="text-sm font-medium">
            Quality review passed
            <span className="ml-1.5 font-normal text-muted-foreground">
              {review.checks.length} check{review.checks.length === 1 ? "" : "s"} · score{" "}
              {review.score}
            </span>
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{review.summary}</p>
          {failed.length > 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {failed.length} non-blocking check{failed.length === 1 ? "" : "s"} raised a note. See
              the list below.
            </p>
          ) : null}
          {failed.length > 0 ? <CheckList checks={failed} className="mt-2" /> : null}
        </div>
      </section>
    );
  }

  return (
    <section
      className={cn("rounded-xl border-2 border-destructive/50 bg-destructive/10 p-4", className)}
      aria-label="Quality review"
    >
      <div className="flex items-start gap-2">
        <RiErrorWarningLine className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-destructive">
            This revision did not pass quality review
          </h2>
          <p className="mt-1 text-sm">{review.summary}</p>
          <p className="mt-1.5 text-sm text-muted-foreground">
            It was published anyway so you can see exactly what the model produced — but the
            findings below have not met the platform&rsquo;s own bar. Read them as a draft to verify,
            not as a conclusion to act on. {review.reviewedFindingCount} finding
            {review.reviewedFindingCount === 1 ? "" : "s"} and {review.reviewedBlockCount} block
            {review.reviewedBlockCount === 1 ? "" : "s"} were reviewed; the score was{" "}
            {review.score}.
          </p>
          {failed.length > 0 ? <CheckList checks={failed} className="mt-3" /> : null}
        </div>
      </div>
    </section>
  );
}

function CheckList({
  checks,
  className,
}: {
  checks: QualityReviewResult["checks"];
  className?: string;
}) {
  return (
    <ul className={cn("space-y-2", className)}>
      {checks.map((check) => (
        <li key={check.key} className="rounded-lg border border-border bg-background p-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <SeverityBadge severity={check.severity} />
            <span className="text-sm font-medium">{check.label}</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{check.detail}</p>
        </li>
      ))}
    </ul>
  );
}
