import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { RiFileList3Line } from "@remixicon/react";

import { PageHeader } from "@/components/layout/page-header";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { db } from "@/db";
import { workspaces } from "@/db/schema";
import { AccessDenied, requireMember } from "@/lib/auth/guards";

/**
 * Customer invoices — the whole of the invoicing platform for now.
 *
 * The workspace shell gates this route already, but the guard is repeated here on purpose:
 * Drizzle bypasses row level security, so every page that reads workspace-scoped data
 * establishes membership itself rather than trusting the layout that rendered it.
 *
 * There is no invoice table in the schema yet, so the page has nothing to list. It exists as
 * the platform's landing route: the switcher needs somewhere to land, and a real page that
 * says "none yet" is honest in a way that a stub route is not.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Customer invoices",
};

export default async function CustomerInvoicesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [workspace] = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.slug, slug))
    .limit(1);
  if (!workspace) notFound();

  try {
    await requireMember(workspace.id);
  } catch (error) {
    if (error instanceof AccessDenied) notFound();
    throw error;
  }

  return (
    <>
      <PageHeader title="Customer invoices" />

      <main className="flex flex-1 flex-col gap-5 px-4 py-5 md:px-6">
        <section aria-label="Customer invoices">
          <Empty className="border border-dashed border-border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <RiFileList3Line aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>No customer invoices yet</EmptyTitle>
              <EmptyDescription>
                Invoices you issue to your customers will be listed here.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </section>
      </main>
    </>
  );
}
