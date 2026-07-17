"use client";

import {
  RiChat3Line,
  RiCheckLine,
  RiCornerDownRightLine,
  RiLoader4Line,
  RiUserLine,
} from "@remixicon/react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { ClaimBadge, SeverityBadge, formatMoney } from "@/components/blocks/shared";
import { formatDateTime, formatDay } from "@/components/audit/meta";
import { addComment, setFindingState } from "@/server/actions/audit";
import type { ClaimType, Severity } from "@/lib/ai/blocks/types";
import { cn } from "@/lib/utils";

/**
 * Finding follow-up (PRD §21.2, §18.4).
 *
 * Everything here writes to `finding_states` and `comments` — never to the finding itself. That
 * separation is the whole point: the revision is the record of what the model concluded from a
 * given set of evidence, and a reviewer disputing it must not be able to rewrite it. Triage is
 * a layer on top, and it survives across revisions because findings carry a stable `key`.
 */

export type TriageAssignee = { userId: string; email: string | null; role: string };

export type TriageComment = {
  id: string;
  body: string;
  authorEmail: string | null;
  createdAt: string;
};

export type TriageFinding = {
  id: string;
  key: string;
  title: string;
  summary: string;
  detail: string;
  riskCategory: string;
  severity: Severity;
  confidence: "high" | "medium" | "low";
  confidenceNote: string | null;
  claimType: ClaimType;
  financialImpact: string | null;
  financialImpactCurrency: string | null;
  impactBasis: string | null;
  affectedPeriods: string[];
  affectedEntities: string[];
  affectedAccounts: string[];
  potentialExplanations: string[];
  recommendedFollowup: string | null;
  recommendedRemediation: string | null;
  instructionsReferenced: string[];
  evidence: { label: string; locator: string | null; inputName: string | null }[];
  state: {
    status: "open" | "in_progress" | "accepted" | "disputed" | "resolved";
    ownerId: string | null;
    dueDate: string | null;
    managementResponse: string | null;
    updatedAt: string | null;
    updatedByEmail: string | null;
  } | null;
  comments: TriageComment[];
};

const STATUS_LABEL: Record<string, string> = {
  open: "Open",
  in_progress: "In progress",
  accepted: "Accepted",
  disputed: "Disputed",
  resolved: "Resolved",
};

export function FindingTriageList({
  findings,
  assignees,
  slug,
  auditId,
  can,
}: {
  findings: TriageFinding[];
  assignees: TriageAssignee[];
  slug: string;
  auditId: string;
  can: { assign: boolean; respond: boolean; comment: boolean };
}) {
  if (findings.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        This revision raised no findings. That is a result, not an empty state — the model
        examined the evidence and did not conclude that anything was wrong.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {findings.map((finding) => (
        <li key={finding.id}>
          <FindingRow
            finding={finding}
            assignees={assignees}
            slug={slug}
            auditId={auditId}
            can={can}
          />
        </li>
      ))}
    </ul>
  );
}

function FindingRow({
  finding,
  assignees,
  slug,
  auditId,
  can,
}: {
  finding: TriageFinding;
  assignees: TriageAssignee[];
  slug: string;
  auditId: string;
  can: { assign: boolean; respond: boolean; comment: boolean };
}) {
  const status = finding.state?.status ?? "open";
  const owner = assignees.find((a) => a.userId === finding.state?.ownerId);
  const impact =
    finding.financialImpact !== null && finding.financialImpact !== ""
      ? Number(finding.financialImpact)
      : null;

  return (
    <article
      id={`finding-${finding.id}`}
      className="scroll-mt-16 rounded-xl border border-border bg-card"
    >
      <div className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold leading-tight">{finding.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{finding.summary}</p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-1.5">
            <SeverityBadge severity={finding.severity} />
            <ClaimBadge claimType={finding.claimType} />
          </div>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <Badge variant="outline">{STATUS_LABEL[status]}</Badge>
          <span>{finding.riskCategory}</span>
          <span>Confidence: {finding.confidence}</span>
          {impact !== null && !Number.isNaN(impact) ? (
            <span>
              Impact {formatMoney(impact, finding.financialImpactCurrency ?? "USD")}
              {finding.impactBasis ? ` · ${finding.impactBasis}` : ""}
            </span>
          ) : null}
          {owner?.email ? (
            <span className="inline-flex items-center gap-1">
              <RiUserLine className="size-3" aria-hidden />
              {owner.email}
            </span>
          ) : null}
          {finding.state?.dueDate ? <span>Due {formatDay(finding.state.dueDate)}</span> : null}
        </div>

        <Collapsible>
          <CollapsibleTrigger
            render={<Button variant="ghost" size="sm" className="mt-2 -ml-2 h-7 px-2 text-xs" />}
          >
            Expand finding
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-3 space-y-3 border-t border-border pt-3 text-sm">
              <p className="whitespace-pre-wrap leading-relaxed">{finding.detail}</p>

              {finding.confidenceNote ? (
                <p className="text-xs text-muted-foreground">
                  Confidence note: {finding.confidenceNote}
                </p>
              ) : null}

              <Facts
                items={[
                  ["Affected periods", finding.affectedPeriods],
                  ["Affected entities", finding.affectedEntities],
                  ["Affected accounts", finding.affectedAccounts],
                  ["Driven by instructions", finding.instructionsReferenced],
                ]}
              />

              {finding.potentialExplanations.length > 0 ? (
                <Section title="Other explanations the model considered">
                  <ul className="list-disc space-y-0.5 pl-4 text-sm text-muted-foreground">
                    {finding.potentialExplanations.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </Section>
              ) : null}

              {finding.recommendedFollowup ? (
                <Section title="Recommended follow-up">
                  <p className="text-sm text-muted-foreground">{finding.recommendedFollowup}</p>
                </Section>
              ) : null}

              {finding.recommendedRemediation ? (
                <Section title="Recommended remediation">
                  <p className="text-sm text-muted-foreground">{finding.recommendedRemediation}</p>
                </Section>
              ) : null}

              <Section title={`Supporting evidence (${finding.evidence.length})`}>
                {finding.evidence.length === 0 ? (
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    No evidence was cited for this finding. Weigh it accordingly.
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {finding.evidence.map((item, index) => (
                      <li
                        key={`${item.label}-${index}`}
                        className="flex items-start gap-1.5 text-sm text-muted-foreground"
                      >
                        <RiCornerDownRightLine className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                        <span>
                          {item.inputName ? (
                            <span className="font-medium text-foreground">{item.inputName}</span>
                          ) : null}
                          {item.locator ? ` — ${item.locator}` : ""}
                          {item.label && item.label !== item.inputName ? ` · ${item.label}` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>

              <Button
                variant="outline"
                size="sm"
                render={
                  <Link
                    href={`/w/${slug}/chat/new?audit=${auditId}&finding=${finding.id}&q=${encodeURIComponent(
                      `Explain the finding "${finding.title}" and show me the evidence behind it.`,
                    )}`}
                  />
                }
              >
                <RiChat3Line className="size-4" />
                Ask AI about this finding
              </Button>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {can.assign || can.respond || can.comment ? (
        <div className="border-t border-border bg-muted/30 p-4">
          <TriageForm finding={finding} assignees={assignees} can={can} />
          <CommentThread
            finding={finding}
            auditId={auditId}
            canComment={can.comment}
          />
        </div>
      ) : null}
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h4>
      {children}
    </section>
  );
}

function Facts({ items }: { items: [string, string[] | null][] }) {
  const present = items.filter(([, values]) => values && values.length > 0);
  if (present.length === 0) return null;
  return (
    <dl className="grid gap-2 sm:grid-cols-2">
      {present.map(([label, values]) => (
        <div key={label}>
          <dt className="text-xs text-muted-foreground">{label}</dt>
          <dd className="text-sm">{(values ?? []).join(", ")}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Assign / set status / record a management response.
 *
 * A `client_user` holds `findings.respond` but not `findings.assign`, so for them the form is
 * the response box alone — and it must submit *without* a status field, or the server would
 * (correctly) demand the assign permission.
 */
function TriageForm({
  finding,
  assignees,
  can,
}: {
  finding: TriageFinding;
  assignees: TriageAssignee[];
  can: { assign: boolean; respond: boolean; comment: boolean };
}) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  if (!can.assign && !can.respond) return null;

  return (
    <form
      action={(formData: FormData) => {
        startTransition(async () => {
          await setFindingState(formData);
          setSaved(true);
        });
      }}
      onChange={() => setSaved(false)}
      className="space-y-3"
    >
      <input type="hidden" name="findingId" value={finding.id} />

      {can.assign ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <Field>
            <FieldLabel htmlFor={`status-${finding.id}`}>Status</FieldLabel>
            <NativeSelect
              id={`status-${finding.id}`}
              name="status"
              defaultValue={finding.state?.status ?? "open"}
            >
              {Object.entries(STATUS_LABEL).map(([value, label]) => (
                <NativeSelectOption key={value} value={value}>
                  {label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>

          <Field>
            <FieldLabel htmlFor={`owner-${finding.id}`}>Owner</FieldLabel>
            <NativeSelect
              id={`owner-${finding.id}`}
              name="ownerId"
              defaultValue={finding.state?.ownerId ?? ""}
            >
              <NativeSelectOption value="">Unassigned</NativeSelectOption>
              {assignees.map((assignee) => (
                <NativeSelectOption key={assignee.userId} value={assignee.userId}>
                  {assignee.email ?? assignee.userId}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>

          <Field>
            <FieldLabel htmlFor={`due-${finding.id}`}>Due date</FieldLabel>
            <Input
              id={`due-${finding.id}`}
              name="dueDate"
              type="date"
              defaultValue={finding.state?.dueDate ?? ""}
            />
          </Field>
        </div>
      ) : null}

      {can.respond ? (
        <Field>
          <FieldLabel htmlFor={`response-${finding.id}`}>Management response</FieldLabel>
          <Textarea
            id={`response-${finding.id}`}
            name="managementResponse"
            rows={2}
            defaultValue={finding.state?.managementResponse ?? ""}
            placeholder="What is your answer to this finding?"
          />
        </Field>
      ) : null}

      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          {pending ? <RiLoader4Line className="size-4 animate-spin" /> : null}
          Save follow-up
        </Button>
        <p aria-live="polite" className="text-xs text-muted-foreground">
          {saved && !pending ? (
            <span className="inline-flex items-center gap-1">
              <RiCheckLine className="size-3.5" aria-hidden />
              Saved
            </span>
          ) : finding.state?.updatedAt ? (
            <>
              Last changed {formatDateTime(finding.state.updatedAt)}
              {finding.state.updatedByEmail ? ` by ${finding.state.updatedByEmail}` : ""}
            </>
          ) : (
            "Kept separately from the revision, so the published finding stays as it was."
          )}
        </p>
      </div>
    </form>
  );
}

function CommentThread({
  finding,
  auditId,
  canComment,
}: {
  finding: TriageFinding;
  auditId: string;
  canComment: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [body, setBody] = useState("");

  if (!canComment && finding.comments.length === 0) return null;

  return (
    <div className={cn("mt-4 border-t border-border pt-3")}>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Discussion ({finding.comments.length})
      </h4>

      {finding.comments.length > 0 ? (
        <ul className="mb-3 space-y-2">
          {finding.comments.map((comment) => (
            <li key={comment.id} className="rounded-lg border border-border bg-background p-2.5">
              <p className="text-xs text-muted-foreground">
                {comment.authorEmail ?? "Removed user"} · {formatDateTime(comment.createdAt)}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm">{comment.body}</p>
            </li>
          ))}
        </ul>
      ) : null}

      {canComment ? (
        <form
          action={(formData: FormData) => {
            startTransition(async () => {
              await addComment(formData);
              setBody("");
            });
          }}
          className="flex items-start gap-2"
        >
          <input type="hidden" name="auditId" value={auditId} />
          <input type="hidden" name="findingId" value={finding.id} />
          <Textarea
            name="body"
            rows={1}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Add a comment"
            aria-label={`Comment on ${finding.title}`}
            className="min-h-9 flex-1 text-sm"
          />
          <Button type="submit" size="sm" variant="outline" disabled={pending || !body.trim()}>
            {pending ? <RiLoader4Line className="size-4 animate-spin" /> : null}
            Comment
          </Button>
        </form>
      ) : null}
    </div>
  );
}
