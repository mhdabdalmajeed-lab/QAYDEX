"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { RiLock2Line, RiSearchLine } from "@remixicon/react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { INSTRUCTION_CATEGORY_LABEL } from "@/components/audit/labels";
import { toggleInstruction } from "@/server/actions/audit";

export type InstructionOption = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  mandatory: boolean;
  priority: number;
  version: number;
  text: string;
  selected: boolean;
};

/**
 * Choosing which reusable instructions apply to this audit (PRD §8.3).
 *
 * A mandatory instruction is shown but not toggleable: it applies whether or not anyone
 * selects it, and pretending otherwise would misrepresent what the audit will actually run
 * against.
 */
export function InstructionPicker({
  auditId,
  options,
  disabled,
}: {
  auditId: string;
  options: InstructionOption[];
  disabled: boolean;
}) {
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (option) =>
        option.name.toLowerCase().includes(q) ||
        (option.description ?? "").toLowerCase().includes(q) ||
        option.text.toLowerCase().includes(q),
    );
  }, [options, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, InstructionOption[]>();
    for (const option of filtered) {
      const list = map.get(option.category) ?? [];
      list.push(option);
      map.set(option.category, list);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  function toggle(option: InstructionOption) {
    setError(null);
    setBusyId(option.id);
    const formData = new FormData();
    formData.set("auditId", auditId);
    formData.set("instructionId", option.id);
    startTransition(async () => {
      try {
        await toggleInstruction(formData);
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : "Could not change that instruction selection.",
        );
      } finally {
        setBusyId(null);
      }
    });
  }

  if (options.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
        Your instruction library is empty. Instructions are how the platform learns your audit
        method — write one and every audit afterwards can use it.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative max-w-xs">
        <RiSearchLine
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search your instructions"
          aria-label="Search saved instructions"
          className="pl-8"
        />
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {grouped.length === 0 ? (
        <p className="text-sm text-muted-foreground">No saved instruction matches “{query}”.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {grouped.map(([category, items]) => (
            <section key={category} className="flex flex-col gap-1.5">
              <h4 className="font-heading text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                {INSTRUCTION_CATEGORY_LABEL[category] ?? category.replace(/_/g, " ")}
              </h4>
              <ul className="divide-y divide-border rounded-lg border border-border">
                {items.map((option) => {
                  const busy = busyId === option.id;
                  return (
                    <li key={option.id} className="flex items-start gap-3 px-3 py-2.5">
                      <div className="mt-0.5 shrink-0">
                        {option.mandatory ? (
                          <RiLock2Line
                            aria-hidden="true"
                            className="size-4 text-muted-foreground"
                          />
                        ) : busy ? (
                          <Spinner aria-hidden="true" className="size-4" />
                        ) : (
                          <Switch
                            checked={option.selected}
                            disabled={disabled}
                            onCheckedChange={() => toggle(option)}
                            aria-label={`Apply “${option.name}” to this audit`}
                          />
                        )}
                      </div>

                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-sm font-medium">{option.name}</span>
                          <Badge variant="outline">v{option.version}</Badge>
                          {option.mandatory ? (
                            <Badge variant="secondary">Mandatory — always applied</Badge>
                          ) : null}
                        </div>
                        {option.description ? (
                          <p className="text-xs text-muted-foreground">{option.description}</p>
                        ) : null}
                        <p className="line-clamp-2 text-xs text-muted-foreground/80">
                          {option.text}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        The version shown is pinned to this audit when you select it. Editing the instruction
        later will not change this audit.
      </p>
    </div>
  );
}

/** Small helper so pages can link back to the library without repeating the path shape. */
export function InstructionLibraryLink({ slug }: { slug: string }) {
  return (
    <Link
      href={`/w/${slug}/instructions`}
      className="text-xs underline underline-offset-3 hover:text-foreground"
    >
      Manage instruction library
    </Link>
  );
}
