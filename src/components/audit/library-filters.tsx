"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { RiCloseLine, RiFilterLine } from "@remixicon/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";

export type FilterOption = { value: string; label: string };

export type FilterField =
  | { kind: "select"; name: string; label: string; options: FilterOption[]; anyLabel: string }
  | { kind: "date"; name: string; label: string }
  | { kind: "search"; name: string; label: string; placeholder: string };

/**
 * The PRD §20 filter bar, driven entirely by the URL.
 *
 * Every control writes a search param and navigates; the page is a Server Component that
 * re-queries from those params. That keeps filtered views linkable and back/forward
 * honest, and means no filter state exists in two places at once.
 *
 * `status` is owned by the tabs above, so it is preserved rather than reset here.
 */
export function LibraryFilters({
  fields,
  preserve = [],
}: {
  fields: FilterField[];
  /** Params the tabs (or the nav) own — never cleared by "Clear filters". */
  preserve?: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const active = fields.filter((field) => (searchParams.get(field.name) ?? "") !== "");

  function apply(name: string, value: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(name, value);
    else next.delete(name);
    // Any filter change invalidates the page cursor.
    next.delete("page");
    startTransition(() => {
      router.replace(next.size > 0 ? `${pathname}?${next}` : pathname, { scroll: false });
    });
  }

  function clearAll() {
    const next = new URLSearchParams();
    for (const key of preserve) {
      const value = searchParams.get(key);
      if (value) next.set(key, value);
    }
    startTransition(() => {
      router.replace(next.size > 0 ? `${pathname}?${next}` : pathname, { scroll: false });
    });
  }

  return (
    <section aria-labelledby="filters-heading" className="border-b border-border bg-muted/30">
      <h2 id="filters-heading" className="sr-only">
        Filter audits
      </h2>
      <div className="flex flex-wrap items-end gap-x-3 gap-y-2 px-4 py-3 md:px-6">
        <div className="flex h-8 items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <RiFilterLine aria-hidden="true" className="size-3.5" />
          Filters
          {pending ? <Spinner className="size-3" /> : null}
        </div>

        {fields.map((field) => {
          const id = `filter-${field.name}`;
          const value = searchParams.get(field.name) ?? "";

          if (field.kind === "select") {
            return (
              <div key={field.name} className="flex flex-col gap-1">
                <Label htmlFor={id} className="text-[11px] font-normal text-muted-foreground">
                  {field.label}
                </Label>
                <NativeSelect
                  id={id}
                  size="sm"
                  className="w-40"
                  value={value}
                  onChange={(event) => apply(field.name, event.target.value)}
                >
                  <NativeSelectOption value="">{field.anyLabel}</NativeSelectOption>
                  {field.options.map((option) => (
                    <NativeSelectOption key={option.value} value={option.value}>
                      {option.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
            );
          }

          if (field.kind === "date") {
            return (
              <div key={field.name} className="flex flex-col gap-1">
                <Label htmlFor={id} className="text-[11px] font-normal text-muted-foreground">
                  {field.label}
                </Label>
                <Input
                  id={id}
                  type="date"
                  className="h-7 w-36 text-sm"
                  defaultValue={value}
                  onChange={(event) => apply(field.name, event.target.value)}
                />
              </div>
            );
          }

          return (
            <form
              key={field.name}
              className="flex flex-col gap-1"
              onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                apply(field.name, String(data.get(field.name) ?? "").trim());
              }}
            >
              <Label htmlFor={id} className="text-[11px] font-normal text-muted-foreground">
                {field.label}
              </Label>
              <Input
                id={id}
                name={field.name}
                type="search"
                className="h-7 w-48 text-sm"
                placeholder={field.placeholder}
                defaultValue={value}
              />
              <button type="submit" className="sr-only">
                Apply {field.label}
              </button>
            </form>
          );
        })}

        {active.length > 0 ? (
          <Button variant="ghost" size="sm" className="h-7" onClick={clearAll}>
            <RiCloseLine aria-hidden="true" />
            Clear {active.length} filter{active.length === 1 ? "" : "s"}
          </Button>
        ) : null}
      </div>
    </section>
  );
}
