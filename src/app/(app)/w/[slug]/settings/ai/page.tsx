import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { RiCheckLine, RiErrorWarningLine, RiLock2Line, RiShieldCheckLine } from "@remixicon/react";

import { PageHeader } from "@/components/layout/page-header";
import {
  AI_PROVIDERS,
  AI_REGIONS,
  FILE_TYPES,
  ROLE_LABELS,
  ROLE_ORDER,
} from "@/components/settings/options";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field";
import { db } from "@/db";
import { workspaces } from "@/db/schema";
import { firstParam } from "@/lib/audit-filters";
import { AccessDenied, requireMember, roleHas } from "@/lib/auth/guards";
import { CATEGORY_LABELS, INTEGRATION_CATEGORIES, INTEGRATION_PROVIDERS } from "@/lib/integrations/catalog";
import { updateAiControls } from "@/server/actions/settings";

/**
 * AI data controls (PRD §25.2).
 *
 * Two of these settings are load-bearing *today*: `requireCanRunAudit` reads
 * `allowExternalModels` and `rolesAllowedToRunAudits` before every run, and refuses the run
 * if either says no. The page marks those two as enforced, and is equally explicit that the
 * rest are recorded policy — a compliance page that implies a control it does not exert is
 * worse than one that admits the boundary.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "AI data controls" };

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function Enforced() {
  return (
    <Badge variant="outline" className="gap-1">
      <RiShieldCheckLine aria-hidden="true" />
      Enforced on every run
    </Badge>
  );
}

function Recorded() {
  return <Badge variant="ghost">Recorded policy</Badge>;
}

export default async function AiSettingsPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = await searchParams;

  const [workspace] = await db
    .select({ id: workspaces.id, settings: workspaces.settings })
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

  const ai = workspace.settings.ai;
  const saved = firstParam(query.saved);
  const error = firstParam(query.error);

  // `requireCanRunAudit` blocks only on an explicit `false`, so an unset workspace allows
  // runs. The checkbox mirrors that rather than inventing a stricter default it does not have.
  const allowExternalModels = ai?.allowExternalModels !== false;
  const providers = new Set(ai?.permittedProviders ?? AI_PROVIDERS.map((provider) => provider.value));
  const regions = new Set(ai?.permittedRegions ?? []);
  // Conversations are stored today, so an unset workspace is retaining them.
  const retainConversations = ai?.retainConversations !== false;
  const allowProductImprovement = ai?.allowProductImprovement === true;
  const fileTypes = new Set(ai?.permittedFileTypes ?? FILE_TYPES.map((type) => type.value));
  const integrations = new Set(
    ai?.permittedIntegrations ?? INTEGRATION_PROVIDERS.map((provider) => provider.key),
  );

  /** Roles below this line cannot run an audit whatever is ticked — they have no `audits.run`. */
  const runCapableRoles = ROLE_ORDER.filter((role) => roleHas(role, "audits.run"));
  const storedRunRoles = ai?.rolesAllowedToRunAudits;
  // An empty list means "no restriction beyond the role itself" to the guard, which is the
  // same set as every run-capable role being ticked.
  const runRoles = new Set(
    storedRunRoles && storedRunRoles.length > 0 ? storedRunRoles : runCapableRoles,
  );

  return (
    <>
      <PageHeader
        breadcrumb={[
          { label: "Settings", href: `/w/${slug}/settings` },
          { label: "AI data controls" },
        ]}
        title="AI data controls"
        description="What may leave this workspace, where it may go, and who may send it."
      />

      <main className="flex flex-1 flex-col gap-5 px-4 py-5 md:px-6">
        {saved === "ai" ? (
          <Alert>
            <RiCheckLine aria-hidden="true" />
            <AlertTitle>AI data controls saved</AlertTitle>
            <AlertDescription>
              The two enforced controls take effect on the next run attempt — including runs
              started through the API. The change is in the{" "}
              <Link href={`/w/${slug}/settings/activity?action=workspace.ai_controls_updated`}>
                audit trail
              </Link>
              , with the values recorded.
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
            <AlertTitle>You can read these controls but not change them</AlertTitle>
            <AlertDescription>
              Changing AI data controls needs the <code>workspace.manage</code> permission,
              which your role does not have.
            </AlertDescription>
          </Alert>
        ) : null}

        {!allowExternalModels ? (
          <Alert>
            <RiShieldCheckLine aria-hidden="true" />
            <AlertTitle>No audit in this workspace can run right now</AlertTitle>
            <AlertDescription>
              External models are disallowed, so every run is refused before any data leaves.
              Existing audits and their findings are unaffected and stay readable.
            </AlertDescription>
          </Alert>
        ) : null}

        <form action={updateAiControls} className="max-w-3xl">
          <input type="hidden" name="workspaceSlug" value={slug} />

          <FieldGroup>
            <FieldSet>
              <FieldLegend>External models</FieldLegend>
              <FieldDescription>
                <Enforced /> Read by the run guard before an audit is dispatched. Which model
                a permitted provider may be asked for is governed separately, in{" "}
                <Link href={`/w/${slug}/settings/models`} className="underline underline-offset-4">
                  approved models
                </Link>
                .
              </FieldDescription>

              <FieldLabel htmlFor="allow-external" className="flex-row items-start gap-2">
                <Checkbox
                  id="allow-external"
                  name="allowExternalModels"
                  defaultChecked={allowExternalModels}
                  disabled={!canManage}
                />
                <div className="flex flex-col gap-0.5">
                  <FieldTitle>Allow audit data to be sent to an external model provider</FieldTitle>
                  <FieldDescription>
                    Untick and every run in this workspace is refused with an explanation,
                    including runs started through the API. Nothing already generated is
                    removed.
                  </FieldDescription>
                </div>
              </FieldLabel>

              <FieldSet>
                <FieldLegend variant="label">Permitted providers</FieldLegend>
                <FieldDescription>
                  Audits and chat may only be sent to a provider ticked here.
                </FieldDescription>
                <div className="flex flex-col gap-2">
                  {AI_PROVIDERS.map((provider) => (
                    <FieldLabel
                      key={provider.value}
                      htmlFor={`provider-${provider.value}`}
                      className="flex-row items-start gap-2"
                    >
                      <Checkbox
                        id={`provider-${provider.value}`}
                        name="provider"
                        value={provider.value}
                        defaultChecked={providers.has(provider.value)}
                        disabled={!canManage}
                      />
                      <div className="flex flex-col gap-0.5">
                        <FieldTitle>{provider.label}</FieldTitle>
                        <FieldDescription>{provider.description}</FieldDescription>
                      </div>
                    </FieldLabel>
                  ))}
                </div>
              </FieldSet>

              <FieldSet>
                <FieldLegend variant="label">Permitted processing regions</FieldLegend>
                <FieldDescription>
                  <Recorded /> The platform calls the provider from wherever this deployment
                  runs and does not choose a region per request. Ticking a region states the
                  policy the deployment must satisfy; it does not route anything.
                </FieldDescription>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {AI_REGIONS.map((region) => (
                    <FieldLabel
                      key={region.value}
                      htmlFor={`region-${region.value}`}
                      className="flex-row items-center gap-2"
                    >
                      <Checkbox
                        id={`region-${region.value}`}
                        name="region"
                        value={region.value}
                        defaultChecked={regions.has(region.value)}
                        disabled={!canManage}
                      />
                      <FieldTitle>{region.label}</FieldTitle>
                    </FieldLabel>
                  ))}
                </div>
              </FieldSet>
            </FieldSet>

            <FieldSet>
              <FieldLegend>Who may run audits</FieldLegend>
              <FieldDescription>
                <Enforced /> A member must both hold <code>audits.run</code> and be ticked
                here. Roles without <code>audits.run</code> are not listed — no tick would
                give them the ability.
              </FieldDescription>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {runCapableRoles.map((role) => (
                  <FieldLabel
                    key={role}
                    htmlFor={`run-role-${role}`}
                    className="flex-row items-center gap-2"
                  >
                    <Checkbox
                      id={`run-role-${role}`}
                      name="runRole"
                      value={role}
                      defaultChecked={runRoles.has(role)}
                      disabled={!canManage}
                    />
                    <FieldTitle>{ROLE_LABELS[role]}</FieldTitle>
                  </FieldLabel>
                ))}
              </div>
              <FieldDescription>
                {storedRunRoles && storedRunRoles.length > 0
                  ? "This workspace narrows running to the roles ticked above."
                  : "No narrowing is recorded yet, so every role that holds audits.run may run — which is what is shown above."}
              </FieldDescription>
            </FieldSet>

            <FieldSet>
              <FieldLegend>Conversations and improvement</FieldLegend>
              <FieldDescription>
                <Recorded /> Stated here and carried into the audit trail. Deleting stored
                conversations is not done from this page.
              </FieldDescription>

              <FieldLabel htmlFor="retain-conversations" className="flex-row items-start gap-2">
                <Checkbox
                  id="retain-conversations"
                  name="retainConversations"
                  defaultChecked={retainConversations}
                  disabled={!canManage}
                />
                <div className="flex flex-col gap-0.5">
                  <FieldTitle>Retain AI conversations in this workspace</FieldTitle>
                  <FieldDescription>
                    Conversations are stored so an audit&rsquo;s reasoning can be reread later.
                    Untick to record that they should not be kept.
                  </FieldDescription>
                </div>
              </FieldLabel>

              <FieldLabel htmlFor="product-improvement" className="flex-row items-start gap-2">
                <Checkbox
                  id="product-improvement"
                  name="allowProductImprovement"
                  defaultChecked={allowProductImprovement}
                  disabled={!canManage}
                />
                <div className="flex flex-col gap-0.5">
                  <FieldTitle>Allow this workspace&rsquo;s data to be used to improve the product</FieldTitle>
                  <FieldDescription>
                    Off unless someone turns it on. Leaving it off is the position a financial
                    auditor is expected to hold.
                  </FieldDescription>
                </div>
              </FieldLabel>
            </FieldSet>

            <FieldSet>
              <FieldLegend>Permitted file types</FieldLegend>
              <FieldDescription>
                <Recorded /> The formats this workspace accepts as audit input. Only formats
                the platform can genuinely parse are listed.
              </FieldDescription>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {FILE_TYPES.map((type) => (
                  <FieldLabel
                    key={type.value}
                    htmlFor={`file-${type.value}`}
                    className="flex-row items-start gap-2"
                  >
                    <Checkbox
                      id={`file-${type.value}`}
                      name="fileType"
                      value={type.value}
                      defaultChecked={fileTypes.has(type.value)}
                      disabled={!canManage}
                    />
                    <div className="flex flex-col gap-0.5">
                      <FieldTitle>{type.label}</FieldTitle>
                      <FieldDescription className="font-mono text-[11px]">
                        {type.detail}
                      </FieldDescription>
                    </div>
                  </FieldLabel>
                ))}
              </div>
            </FieldSet>

            <FieldSet>
              <FieldLegend>Permitted integrations</FieldLegend>
              <FieldDescription>
                <Recorded /> Which systems may be connected to bring data into an audit. An
                integration never creates a standing dataset — the data it imports belongs to
                the audit that received it.
              </FieldDescription>
              {INTEGRATION_CATEGORIES.map((category) => {
                const inCategory = INTEGRATION_PROVIDERS.filter(
                  (provider) => provider.category === category,
                );
                if (inCategory.length === 0) return null;
                return (
                  <FieldSet key={category}>
                    <FieldLegend variant="label">{CATEGORY_LABELS[category]}</FieldLegend>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {inCategory.map((provider) => (
                        <FieldLabel
                          key={provider.key}
                          htmlFor={`integration-${provider.key}`}
                          className="flex-row items-center gap-2"
                        >
                          <Checkbox
                            id={`integration-${provider.key}`}
                            name="integration"
                            value={provider.key}
                            defaultChecked={integrations.has(provider.key)}
                            disabled={!canManage}
                          />
                          <FieldTitle>{provider.name}</FieldTitle>
                        </FieldLabel>
                      ))}
                    </div>
                  </FieldSet>
                );
              })}
            </FieldSet>

            {canManage ? (
              <Field orientation="horizontal">
                <Button type="submit">Save AI data controls</Button>
                <FieldDescription>
                  Recorded in the audit trail with every value, so a reviewer can reconstruct
                  what the policy was on the day an audit ran.
                </FieldDescription>
              </Field>
            ) : null}
          </FieldGroup>
        </form>
      </main>
    </>
  );
}
