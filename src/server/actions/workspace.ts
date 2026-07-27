"use server";

import { like } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/db";
import { activityLog, workspaceMembers, workspaceTypeEnum, workspaces } from "@/db/schema";
import { requireUser } from "@/lib/auth/guards";
import {
  ACCOUNTING_STANDARD_VALUES,
  BASE_CURRENCIES,
  standardFieldName,
  type AccountingStandard,
} from "@/lib/workspace-options";

/**
 * Creating the first workspace is the one moment a signed-in user has no
 * membership yet, so `requireMember` cannot apply — `requireUser` is the whole
 * guard, and the creator is inserted as `owner` in the same transaction that
 * creates the workspace. A workspace with no owner would be unreachable forever.
 *
 * Ids are always passed explicitly: drizzle connects as `postgres`, where
 * `auth.uid()` is NULL.
 */

export type WorkspaceFieldErrors = Partial<
  Record<"name" | "industry" | "baseCurrency" | "fiscalYearStartMonth", string>
>;

export type WorkspaceFormState = {
  error?: string;
  fieldErrors?: WorkspaceFieldErrors;
};

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

const createWorkspaceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Give the workspace a name of at least 2 characters.")
    .max(80, "Keep the name under 80 characters."),
  industry: z.string().trim().max(80, "Keep the industry under 80 characters."),
  baseCurrency: z.enum(BASE_CURRENCIES, { error: "Choose a base currency." }),
  fiscalYearStartMonth: z
    .number()
    .int()
    .min(1, "Choose the month the fiscal year starts.")
    .max(12, "Choose the month the fiscal year starts."),
});

function toFieldErrors(issues: readonly z.core.$ZodIssue[]): WorkspaceFieldErrors {
  const fieldErrors: WorkspaceFieldErrors = {};
  for (const issue of issues) {
    const key = issue.path[0];
    if (
      (key === "name" ||
        key === "industry" ||
        key === "baseCurrency" ||
        key === "fiscalYearStartMonth") &&
      !fieldErrors[key]
    ) {
      fieldErrors[key] = issue.message;
    }
  }
  return fieldErrors;
}

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

/** Checkboxes submit nothing when unchecked, so presence is the whole signal. */
function readAccountingStandards(formData: FormData): AccountingStandard[] {
  return ACCOUNTING_STANDARD_VALUES.filter(
    (standard) => formData.get(standardFieldName(standard)) !== null,
  );
}

function slugify(value: string): string {
  const slug = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
  return slug || "workspace";
}

/**
 * Reads the slugs already taken in this transaction and picks the first free
 * suffix. Two concurrent creations can still pick the same one, which is why the
 * unique index — not this function — is the real guarantee; the caller retries
 * on a unique violation.
 */
async function nextFreeSlug(tx: Transaction, base: string): Promise<string> {
  // `base` is slugified to [a-z0-9-], so it carries no LIKE wildcards.
  const taken = await tx
    .select({ slug: workspaces.slug })
    .from(workspaces)
    .where(like(workspaces.slug, `${base}%`));

  const used = new Set(taken.map((row) => row.slug));
  if (!used.has(base)) return base;

  for (let suffix = 2; suffix <= 500; suffix += 1) {
    const candidate = `${base}-${suffix}`;
    if (!used.has(candidate)) return candidate;
  }

  return `${base}-${Date.now().toString(36)}`;
}

/** Postgres `unique_violation`. */
function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("code" in error)) return false;
  return error.code === "23505";
}

export async function createWorkspace(
  _previous: WorkspaceFormState,
  formData: FormData,
): Promise<WorkspaceFormState> {
  // Re-checked here rather than trusting /onboarding to have done it: this
  // function answers a direct POST just as happily as it answers our own form.
  const user = await requireUser();

  const monthRaw = readString(formData, "fiscalYearStartMonth");
  const parsed = createWorkspaceSchema.safeParse({
    name: readString(formData, "name"),
    industry: readString(formData, "industry"),
    baseCurrency: readString(formData, "baseCurrency"),
    fiscalYearStartMonth: Number.parseInt(monthRaw, 10),
  });

  if (!parsed.success) {
    return { fieldErrors: toFieldErrors(parsed.error.issues) };
  }

  const { name, industry, baseCurrency, fiscalYearStartMonth } = parsed.data;
  // Every workspace is an internal company auditing itself; the firm flavour is
  // no longer offered, so the type is fixed rather than read from the form.
  const type: (typeof workspaceTypeEnum.enumValues)[number] = "internal";
  const accountingStandards = readAccountingStandards(formData);
  const base = slugify(name);

  const requestHeaders = await headers();
  const ip =
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    requestHeaders.get("x-real-ip");
  const userAgent = requestHeaders.get("user-agent");

  let created: { id: string; slug: string } | null = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      created = await db.transaction(async (tx) => {
        const slug = await nextFreeSlug(tx, base);

        const [workspace] = await tx
          .insert(workspaces)
          .values({
            name,
            slug,
            type,
            industry: industry || null,
            baseCurrency,
            accountingStandards: accountingStandards.length > 0 ? accountingStandards : null,
            fiscalYearStartMonth,
            createdBy: user.id,
          })
          .returning({ id: workspaces.id, slug: workspaces.slug });

        // The creator must exist as a member before the transaction commits,
        // otherwise the workspace they just made would deny them access.
        await tx.insert(workspaceMembers).values({
          workspaceId: workspace.id,
          userId: user.id,
          role: "owner",
        });

        await tx.insert(activityLog).values({
          workspaceId: workspace.id,
          actorId: user.id,
          actorEmail: user.email,
          action: "workspace.created",
          targetType: "workspace",
          targetId: workspace.id,
          metadata: {
            name,
            type,
            slug: workspace.slug,
            baseCurrency,
            fiscalYearStartMonth,
            accountingStandards,
            industry: industry || null,
          },
          ip,
          userAgent,
        });

        return { id: workspace.id, slug: workspace.slug };
      });
      break;
    } catch (error) {
      // Someone else took the slug between our read and our insert: recompute it.
      if (isUniqueViolation(error) && attempt < 2) continue;
      console.error("createWorkspace failed", error);
      return { error: "The workspace could not be created. Please try again." };
    }
  }

  if (!created) {
    return { error: "The workspace could not be created. Please try again." };
  }

  revalidatePath("/", "layout");
  // Outside the try/catch above: redirect() reports success by throwing.
  redirect(`/w/${created.slug}`);
}
