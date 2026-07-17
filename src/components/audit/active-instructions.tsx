import { RiLock2Line } from "@remixicon/react";

import { Badge } from "@/components/ui/badge";
import {
  SOURCE_EXPLANATION,
  SOURCE_LABEL,
  SOURCE_ORDER,
  type InstructionSource,
} from "@/components/audit/labels";
import type { InstructionSnapshotEntry } from "@/db/schema";

/**
 * The instruction set this audit will actually run against, in authority order (PRD §8.3, §9.3).
 *
 * Rendered on the server from the same `resolveInstructions` call the run uses, so what the
 * user reads here is what the model will read — not a client-side approximation of it.
 */
export function ActiveInstructions({ entries }: { entries: InstructionSnapshotEntry[] }) {
  const grouped = SOURCE_ORDER.map((source) => ({
    source,
    rank: SOURCE_ORDER.indexOf(source) + 1,
    entries: entries.filter((entry) => entry.source === source),
  })).filter((group) => group.entries.length > 0);

  return (
    <div className="flex flex-col gap-3">
      <ol className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        {SOURCE_ORDER.slice(0, 6).map((source, index) => (
          <li key={source} className="flex items-center gap-1">
            {index > 0 ? (
              <span aria-hidden="true" className="text-muted-foreground/60">
                ›
              </span>
            ) : null}
            <span
              className={
                entries.some((entry) => entry.source === source)
                  ? "rounded-4xl bg-muted px-2 py-0.5 font-medium text-foreground"
                  : "rounded-4xl px-2 py-0.5"
              }
            >
              {SOURCE_LABEL[source]}
            </span>
          </li>
        ))}
      </ol>
      <p className="text-xs text-muted-foreground">
        Higher authority first. When two instructions disagree, the higher one wins — but only
        after you have told us which, on the conflicts step below.
      </p>

      <div className="flex flex-col gap-4">
        {grouped.map((group) => (
          <section key={group.source} className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-baseline gap-2">
              <h4 className="font-heading text-sm font-semibold">
                {SOURCE_LABEL[group.source as InstructionSource]}
              </h4>
              <Badge variant="outline">Authority rank {group.rank}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {SOURCE_EXPLANATION[group.source as InstructionSource]}
            </p>

            <ul className="flex flex-col gap-1.5">
              {group.entries.map((entry, index) => (
                <li
                  key={`${entry.instructionId ?? entry.name}-${index}`}
                  className="rounded-lg border border-border p-2.5"
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-sm font-medium">{entry.name}</span>
                    {entry.version !== undefined ? (
                      <Badge variant="outline">v{entry.version}</Badge>
                    ) : null}
                    {entry.mandatory ? (
                      <Badge variant="secondary">
                        <RiLock2Line aria-hidden="true" />
                        Mandatory
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 line-clamp-4 text-xs whitespace-pre-wrap text-muted-foreground">
                    {entry.text}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
