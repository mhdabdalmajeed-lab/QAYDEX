import Link from "next/link";

import { cn } from "@/lib/utils";

export type LibraryTab = {
  value: string;
  label: string;
  href: string;
  count: number;
};

/**
 * Status tabs as real links rather than a JS tab widget: each tab is a distinct,
 * shareable URL, works without JavaScript, and marks itself with `aria-current` so a
 * screen reader announces which view is open.
 */
export function LibraryTabs({ tabs, active }: { tabs: LibraryTab[]; active: string }) {
  return (
    <nav aria-label="Filter by status" className="border-b border-border px-4 md:px-6">
      <ul className="-mb-px flex flex-wrap gap-1 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = tab.value === active;
          return (
            <li key={tab.value}>
              <Link
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "inline-flex items-center gap-1.5 border-b-2 px-2.5 py-2 text-sm whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  isActive
                    ? "border-foreground font-medium text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
                <span
                  className={cn(
                    "rounded-4xl px-1.5 py-px text-[11px] tabular-nums",
                    isActive ? "bg-foreground/10" : "bg-muted text-muted-foreground",
                  )}
                >
                  {tab.count}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
