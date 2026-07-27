import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { RiCheckLine, RiErrorWarningLine, RiLock2Line } from "@remixicon/react";

import { PageHeader } from "@/components/layout/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { db } from "@/db";
import { workspaces } from "@/db/schema";
import { firstParam } from "@/lib/audit-filters";
import { AccessDenied, requireMember, roleHas } from "@/lib/auth/guards";
import {
  ACCOUNTING_STANDARDS,
  BASE_CURRENCIES,
  INDUSTRIES,
  MONTHS,
  WORKSPACE_TYPES,
  standardFieldName,
} from "@/lib/workspace-options";
import { updateWorkspaceDetails } from "@/server/actions/settings";

/**
 * Workspace details (PRD §27 "Workspace").
 *
 * None of these fields is decoration. The base currency and the accounting standards are
 * put in front of the model on every run, and the fiscal year start decides what
 * "period-end" means to an audit. So the page says what each one *does* rather than
 * labelling it and hoping.
 *
 * The slug is not editable, and the page says so: it is in every link ever shared out of
 * this workspace.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Workspace settings" };

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function WorkspaceSettingsPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = await searchParams;

  const [workspace] = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      slug: workspaces.slug,
      type: workspaces.type,
      industry: workspaces.industry,
      baseCurrency: workspaces.baseCurrency,
      accountingStandards: workspaces.accountingStandards,
      fiscalYearStartMonth: workspaces.fiscalYearStartMonth,
      createdAt: workspaces.createdAt,
    })
    .from(workspaces)
    .where(eq(workspaces.slug, slug))
    .limit(1);
  if (!workspace) notFound();

  let canManage = false;
  try {
    const { membership } = await requireMember(workspace.id);
    canManage = roleHas(membership.role, "workspace.manage");
  } catch (error) {
    if (error instanceof AccessDenied) notFound();
    throw error;
  }

  const saved = firstParam(query.saved);
  const error = firstParam(query.error);

  const standards = new Set(workspace.accountingStandards ?? []);
  // A workspace created before an industry was in the list, or with a custom one, must
  // still see its own value — otherwise saving anything would silently discard it.
  const industries = workspace.industry && !INDUSTRIES.includes(workspace.industry as (typeof INDUSTRIES)[number])
      ? [workspace.industry, ...INDUSTRIES]
      : [...INDUSTRIES];

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: "Settings", href: `/w/${slug}/settings` }, { label: "General" }]}
        title="Workspace"
      />

      <main className="flex flex-1 flex-col gap-5 px-4 py-5 md:px-6">
        {saved === "details" ? (
          <Alert>
            <RiCheckLine aria-hidden="true" />
            <AlertTitle>Workspace details saved</AlertTitle>
            <AlertDescription>
              Audits started from now on inherit these. Audits already completed keep the
              context they ran under.
            </AlertDescription>
          </Alert>
        ) : null}

        {error ? (
          <Alert variant="destructive">
            <RiErrorWarningLine aria-hidden="true" />
            <AlertTitle>Nothing was saved</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {!canManage ? (
          <Alert>
            <RiLock2Line aria-hidden="true" />
            <AlertTitle>You can read these settings but not change them</AlertTitle>
            <AlertDescription>
              Changing workspace details needs the <code>workspace.manage</code> permission,
              which your role does not have. An owner or administrator can make the change.
            </AlertDescription>
          </Alert>
        ) : null}

        <form action={updateWorkspaceDetails} className="max-w-2xl">
          <input type="hidden" name="workspaceSlug" value={slug} />

          <FieldGroup>
            <FieldSet>
              <FieldLegend>Identity</FieldLegend>

              <Field>
                <FieldLabel htmlFor="workspace-name">Name</FieldLabel>
                <Input
                  id="workspace-name"
                  name="name"
                  required
                  minLength={2}
                  maxLength={80}
                  defaultValue={workspace.name}
                  disabled={!canManage}
                />
                <FieldDescription>
                  Shown in the sidebar, the workspace switcher, and on every export.
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel htmlFor="workspace-slug">Address</FieldLabel>
                <Input
                  id="workspace-slug"
                  value={`/w/${workspace.slug}`}
                  readOnly
                  disabled
                  className="font-mono"
                />
                <FieldDescription>
                  Fixed. It is in every link anyone has shared out of this workspace, so
                  renaming it would break them.
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel htmlFor="workspace-type">Type</FieldLabel>
                <NativeSelect
                  id="workspace-type"
                  name="type"
                  className="w-full"
                  defaultValue={workspace.type}
                  disabled={!canManage}
                >
                  {WORKSPACE_TYPES.map((type) => (
                    <NativeSelectOption key={type.value} value={type.value}>
                      {type.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <FieldDescription>
                  {WORKSPACE_TYPES.find((type) => type.value === workspace.type)?.description}
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel htmlFor="workspace-industry">Industry</FieldLabel>
                <NativeSelect
                  id="workspace-industry"
                  name="industry"
                  className="w-full"
                  defaultValue={workspace.industry ?? ""}
                  disabled={!canManage}
                >
                  <NativeSelectOption value="">Not stated</NativeSelectOption>
                  {industries.map((industry) => (
                    <NativeSelectOption key={industry} value={industry}>
                      {industry}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <FieldDescription>
                  Given to the model as context, so it can weigh what is normal for the sector
                  rather than in the abstract.
                </FieldDescription>
              </Field>
            </FieldSet>

            <FieldSet>
              <FieldLegend>Accounting context</FieldLegend>
              <FieldDescription>
                Every audit run in this workspace is told these. Changing them changes what
                future audits are told — never what a finished audit was told.
              </FieldDescription>

              <Field>
                <FieldLabel htmlFor="workspace-currency">Base currency</FieldLabel>
                <NativeSelect
                  id="workspace-currency"
                  name="baseCurrency"
                  className="w-full"
                  defaultValue={workspace.baseCurrency}
                  disabled={!canManage}
                >
                  {BASE_CURRENCIES.map((currency) => (
                    <NativeSelectOption key={currency} value={currency}>
                      {currency}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <FieldDescription>
                  The currency amounts are reported in when an audit does not state its own.
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel htmlFor="workspace-fiscal">Fiscal year starts</FieldLabel>
                <NativeSelect
                  id="workspace-fiscal"
                  name="fiscalYearStartMonth"
                  className="w-full"
                  defaultValue={String(workspace.fiscalYearStartMonth)}
                  disabled={!canManage}
                >
                  {MONTHS.map((month) => (
                    <NativeSelectOption key={month.value} value={String(month.value)}>
                      {month.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <FieldDescription>
                  Decides which months a period-end, quarter or year-end audit covers.
                </FieldDescription>
              </Field>

              <FieldSet>
                <FieldLegend variant="label">Accounting standards</FieldLegend>
                <FieldDescription>
                  Optional. Audits cite the standards selected here when they judge a
                  treatment. Selecting none leaves the model to infer one, which it will say
                  it has done.
                </FieldDescription>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {ACCOUNTING_STANDARDS.map((standard) => (
                    <FieldLabel
                      key={standard.value}
                      htmlFor={`standard-${standard.value}`}
                      className="flex-row items-center gap-2"
                    >
                      <Checkbox
                        id={`standard-${standard.value}`}
                        name={standardFieldName(standard.value)}
                        defaultChecked={standards.has(standard.value)}
                        disabled={!canManage}
                      />
                      <FieldTitle>{standard.label}</FieldTitle>
                    </FieldLabel>
                  ))}
                </div>
              </FieldSet>
            </FieldSet>

            {canManage ? (
              <Field orientation="horizontal">
                <Button type="submit">Save workspace details</Button>
                <FieldDescription>Recorded in the audit trail.</FieldDescription>
              </Field>
            ) : null}
          </FieldGroup>
        </form>

        <p className="text-xs text-muted-foreground">
          Workspace created{" "}
          <time dateTime={workspace.createdAt.toISOString()}>
            {workspace.createdAt.toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </time>
          .
        </p>
      </main>
    </>
  );
}
