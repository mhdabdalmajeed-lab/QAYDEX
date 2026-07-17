import { RiLock2Line } from "@remixicon/react";

import {
  AUTHORITY_BLURBS,
  AUTHORITY_LABELS,
  AUTHORITY_ORDER,
  type InstructionSource,
} from "@/components/instructions/labels";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

/**
 * PRD §9.3, stated rather than implied.
 *
 * Auditors need to know *why* one instruction won, and the product's own answer is that
 * conflicts are never resolved silently — they are put to the user before the audit runs.
 * Saying so here is the only place a reader can learn it without opening an audit.
 */
export function AuthorityHierarchy({ highlight }: { highlight?: InstructionSource }) {
  return (
    <section aria-labelledby="authority-heading" className="rounded-lg border border-border">
      <Accordion>
        <AccordionItem value="authority">
          <AccordionTrigger>
            <h2 id="authority-heading" className="font-heading text-sm font-semibold">
              How instructions are ranked when they disagree
            </h2>
          </AccordionTrigger>
          <AccordionContent>
            <div className="flex flex-col gap-4 pb-1 text-sm">
              <p className="text-muted-foreground">
                An audit is usually told several things at once. When two of them cannot both be
                followed, the one higher in this list wins.
              </p>

              <ol className="flex flex-col gap-px overflow-hidden rounded-lg border border-border">
                {AUTHORITY_ORDER.map((source, index) => {
                  const isHighlighted = source === highlight;
                  return (
                    <li
                      key={source}
                      aria-current={isHighlighted ? "true" : undefined}
                      className={
                        isHighlighted
                          ? "flex gap-3 border-l-2 border-l-foreground bg-accent px-3 py-2"
                          : "flex gap-3 border-l-2 border-l-transparent bg-card px-3 py-2"
                      }
                    >
                      <span className="w-4 shrink-0 text-right text-xs font-medium tabular-nums text-muted-foreground">
                        {index + 1}
                      </span>
                      <span className="flex min-w-0 flex-col">
                        <span className="text-xs font-medium">
                          {AUTHORITY_LABELS[source]}
                          {isHighlighted ? (
                            <span className="ml-1.5 font-normal text-muted-foreground">
                              — where this instruction sits
                            </span>
                          ) : null}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {AUTHORITY_BLURBS[source]}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ol>

              <div className="flex gap-2.5 rounded-lg border border-border bg-muted/40 p-3">
                <RiLock2Line aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Mandatory</span> means the
                  instruction applies to every audit it is scoped to, whether or not anyone
                  selects it — and it cannot be removed from that audit. A non-mandatory
                  instruction only reaches an audit when someone attaches it, which is why it
                  ranks below template instructions.
                </p>
              </div>

              <p className="text-xs text-muted-foreground">
                Conflicts are identified before an audit starts and put to you to settle. The
                product does not quietly pick a side.
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </section>
  );
}
