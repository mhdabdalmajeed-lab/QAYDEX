"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RiCloseLine, RiSearchLine } from "@remixicon/react";

import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";

/**
 * Conversation search (PRD §10.4).
 *
 * The query lives in the URL, not in component state: a filtered list is a thing an auditor
 * shares and comes back to. Typing is debounced and replaces the history entry, so the back
 * button steps out of the search rather than through every keystroke.
 */
export function ConversationSearch({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(initialQuery);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  // The URL is authoritative: a filter link or the back button must win over stale local state.
  // Adjusted during render rather than in an effect — React re-runs this component immediately
  // with the new state and never commits the stale value, so there is no flash of the old query
  // and no cascading render. (react.dev: "Adjusting some state when a prop changes".)
  const [syncedQuery, setSyncedQuery] = useState(initialQuery);
  if (syncedQuery !== initialQuery) {
    setSyncedQuery(initialQuery);
    setValue(initialQuery);
  }

  useEffect(() => {
    if (value === initialQuery) return;
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value.trim()) params.set("q", value.trim());
      else params.delete("q");
      const query = params.toString();
      startTransition(() => {
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
      });
    }, 250);
    return () => clearTimeout(timer);
  }, [value, initialQuery, pathname, router, searchParams]);

  return (
    <search className="w-full sm:max-w-xs">
      <InputGroup>
        <InputGroupAddon>
          {pending ? <Spinner aria-hidden="true" /> : <RiSearchLine aria-hidden="true" />}
        </InputGroupAddon>
        <InputGroupInput
          ref={inputRef}
          type="search"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Search conversations"
          aria-label="Search conversations by title or message"
          aria-busy={pending}
        />
        {value ? (
          <InputGroupAddon align="inline-end">
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="Clear search"
              onClick={() => {
                setValue("");
                inputRef.current?.focus();
              }}
            >
              <RiCloseLine aria-hidden="true" />
            </Button>
          </InputGroupAddon>
        ) : null}
      </InputGroup>
    </search>
  );
}
