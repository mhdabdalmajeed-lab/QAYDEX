import type { Metadata } from "next";

import { LogoMark } from "@/components/logo";

/**
 * Standalone chrome for the public share view (PRD §24).
 *
 * The person reading this is not a member of the workspace and has not signed in, so none of
 * the app shell applies: no sidebar, no workspace switcher, no navigation into anything else.
 * There is deliberately nowhere to go from here — the only thing this URL grants is one
 * revision of one audit.
 *
 * `robots: noindex` matters more than it looks. A share token is a bearer credential in a URL;
 * if a crawler follows a pasted link into an index, the "unguessable" part stops being
 * unguessable. It is not a security boundary (crawlers may ignore it) but it removes the
 * likeliest accidental leak.
 */

export const metadata: Metadata = {
  title: "Shared audit",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
};

export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col bg-background">
      <a
        href="#share-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:ring-2 focus:ring-ring"
      >
        Skip to the audit
      </a>

      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <span className="flex items-center gap-2 text-sm font-semibold tracking-wide">
            <LogoMark className="size-5" label={null} />
            QAYDEX
          </span>
          <span className="text-xs text-muted-foreground">Shared audit · read-only</span>
        </div>
      </header>

      <main id="share-main" className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto w-full max-w-4xl px-4 py-6 text-xs leading-relaxed text-muted-foreground sm:px-6">
          <p>
            This audit was produced with AI assistance. It is an analysis to be reviewed by a
            qualified professional, not an assurance opinion, an audit report under any auditing
            standard, or accounting, tax or legal advice. Conclusions depend entirely on the
            evidence that was supplied and may be incomplete.
          </p>
        </div>
      </footer>
    </div>
  );
}
