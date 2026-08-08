import Link from "next/link";

import { LogoMark } from "@/components/logo";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-svh flex-1 flex-col items-center justify-center gap-8 bg-muted/40 px-6 py-12">
      <Link
        href="/"
        className="flex items-center gap-2 rounded-md text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <LogoMark className="size-7" label={null} />
        <span className="text-base font-semibold tracking-wide">QAYDEX</span>
      </Link>

      <main className="w-full max-w-sm">{children}</main>

      <p className="max-w-sm text-center text-xs leading-relaxed text-muted-foreground">
        Evidence-linked audits. Every finding traces back to the input it came from.
      </p>
    </div>
  );
}
