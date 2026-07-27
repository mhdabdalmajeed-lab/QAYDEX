import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import {
  RiAddLine,
  RiAlertLine,
  RiDatabase2Line,
  RiErrorWarningLine,
  RiHistoryLine,
  RiInformationLine,
  RiKey2Line,
  RiLock2Line,
  RiPlugLine,
  RiPulseLine,
  RiShieldKeyholeLine,
} from "@remixicon/react";

import { PageHeader } from "@/components/layout/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { db } from "@/db";
import {
  audits,
  clients,
  entities,
  integrationConnections,
  integrationEvents,
  integrationImports,
  memberRoleEnum,
  workspaces,
} from "@/db/schema";
import { firstParam } from "@/lib/audit-filters";
import { AccessDenied, requireMember, roleHas, type MemberRole } from "@/lib/auth/guards";
import { encryptionAvailable, encryptionUnavailableReason } from "@/lib/crypto";
import {
  AUTH_TYPE_LABELS,
  CONNECTION_STATUS_DESCRIPTIONS,
  CONNECTION_STATUS_LABELS,
  credentialField,
  datasetLabel,
  providerAvailability,
} from "@/lib/integrations/availability";
import {
  CATEGORY_LABELS,
  INTEGRATION_CATEGORIES,
  INTEGRATION_PROVIDERS,
  getProvider,
} from "@/lib/integrations/catalog";
import { connectIntegration } from "@/server/actions/integration";

/**
 * Integrations (PRD §16).
 *
 * This is a connection-management page and nothing more. It does not, and must not, become a
 * view onto anyone's accounting data: an integration exists to carry records *into one
 * audit*, where they live (PRD "Revised navigation"). So there is no "synced data" tab here,
 * only connections, the imports made from them, and the audits those imports fed.
 *
 * The eight views below are the nav's eight sub-items. The nav points four of them at
 * sub-paths (`integrations/credentials`, `/imports`, `/activity`, `/permissions`, `/new`);
 * those land on the `[id]` route, which recognises them and redirects here with the matching
 * `?filter=`. One page, one set of queries, and the nav links keep working.
 *
 * Honesty note, because it is the whole point of the product: no OAuth client, bank poller
 * or vendor API client exists. Providers whose transport is not built are labelled "Not yet
 * available" and cannot be connected. The ones that can be are the ones where the user hands
 * us a secret and we encrypt it — a real, finished operation — and even those rest at
 * "Credential stored", never "Connected", because nothing has been fetched with them.
 *
 * Drizzle bypasses RLS, so every query below carries its own `workspace_id` predicate.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Integrations" };

const VIEWS = [
  "available",
  "connected",
  "credentials",
  "imports",
  "failed_imports",
  "activity",
  "permissions",
  "new",
] as const;

type View = (typeof VIEWS)[number];

function isView(value: string): value is View {
  return (VIEWS as readonly string[]).includes(value);
}

const VIEW_TITLES: Record<View, string> = {
  available: "Available integrations",
  connected: "Connected integrations",
  credentials: "Connection credentials",
  imports: "Import history",
  failed_imports: "Failed imports",
  activity: "Connection activity",
  permissions: "Integration permissions",
  new: "Add integration",
};

const ROW_LIMIT = 50;

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function dateTime(value: Date | null): string {
  if (!value) return "—";
  return value.toISOString().slice(0, 16).replace("T", " ") + " UTC";
}

function statusBadge(status: "connected" | "pending" | "error" | "disconnected") {
  // Never colour alone: each state carries its own word and its own icon.
  const variant =
    status === "error" ? "destructive" : status === "connected" ? "default" : "outline";
  const Icon =
    status === "error" ? RiErrorWarningLine : status === "pending" ? RiKey2Line : RiPlugLine;
  return (
    <Badge variant={variant} title={CONNECTION_STATUS_DESCRIPTIONS[status]}>
      <Icon aria-hidden="true" />
      {CONNECTION_STATUS_LABELS[status]}
    </Badge>
  );
}

function importStatusBadge(status: "pending" | "running" | "completed" | "failed") {
  const label =
    status === "pending"
      ? "Requested"
      : status === "running"
        ? "Running"
        : status === "completed"
          ? "Completed"
          : "Failed";
  const variant = status === "failed" ? "destructive" : status === "completed" ? "default" : "outline";
  return (
    <Badge variant={variant}>
      {status === "failed" ? <RiErrorWarningLine aria-hidden="true" /> : null}
      {label}
    </Badge>
  );
}

export default async function IntegrationsPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = await searchParams;

  const [workspace] = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.slug, slug))
    .limit(1);
  if (!workspace) notFound();

  let role;
  try {
    const { membership } = await requireMember(workspace.id);
    role = membership.role;
  } catch (error) {
    if (error instanceof AccessDenied) notFound();
    throw error;
  }

  const workspaceId = workspace.id;
  const canManage = roleHas(role, "integrations.manage");

  const rawFilter = firstParam(query.filter);
  const view: View = rawFilter && isView(rawFilter) ? rawFilter : "available";

  return (
    <>
      <PageHeader
        title="Integrations"
        actions={
          canManage ? (
            <Button render={<Link href={`/w/${slug}/integrations?filter=new`} />}>
              <RiAddLine aria-hidden="true" />
              Add integration
            </Button>
          ) : null
        }
      />

      <ViewTabs slug={slug} view={view} />

      <main className="flex flex-1 flex-col gap-5 px-4 py-5 md:px-6">
        <h2 className="sr-only">{VIEW_TITLES[view]}</h2>

        {view === "available" ? (
          <AvailableView slug={slug} canManage={canManage} />
        ) : view === "new" ? (
          <NewConnectionView
            slug={slug}
            workspaceId={workspaceId}
            canManage={canManage}
            providerKey={firstParam(query.provider)}
          />
        ) : view === "connected" ? (
          <ConnectedView slug={slug} workspaceId={workspaceId} canManage={canManage} />
        ) : view === "credentials" ? (
          <CredentialsView slug={slug} workspaceId={workspaceId} canManage={canManage} />
        ) : view === "imports" || view === "failed_imports" ? (
          <ImportsView
            slug={slug}
            workspaceId={workspaceId}
            failedOnly={view === "failed_imports"}
          />
        ) : view === "activity" ? (
          <ActivityView slug={slug} workspaceId={workspaceId} />
        ) : (
          <PermissionsView slug={slug} workspaceId={workspaceId} role={role} />
        )}
      </main>
    </>
  );
}

/** The nav's sub-items, repeated in-page so the current view is visible and switchable. */
function ViewTabs({ slug, view }: { slug: string; view: View }) {
  const tabs: { view: View; label: string }[] = VIEWS.filter((value) => value !== "new").map(
    (value) => ({ view: value, label: VIEW_TITLES[value] }),
  );

  return (
    <nav aria-label="Integration views" className="border-b border-border px-4 md:px-6">
      <ul className="-mb-px flex flex-wrap gap-x-4 gap-y-1">
        {tabs.map((tab) => {
          const active = tab.view === view;
          const href =
            tab.view === "available"
              ? `/w/${slug}/integrations`
              : `/w/${slug}/integrations?filter=${tab.view}`;
          return (
            <li key={tab.view}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={
                  "inline-block border-b-2 py-2 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none " +
                  (active
                    ? "border-primary font-medium text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground")
                }
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * The catalog. Every provider is listed, including the ones we cannot connect — hiding them
 * would answer "does Caydex do Xero?" with silence instead of "not yet, here is what to do
 * instead", which is the more useful and more honest answer.
 */
function AvailableView({ slug, canManage }: { slug: string; canManage: boolean }) {
  const buildable = INTEGRATION_PROVIDERS.filter((p) => providerAvailability(p).available).length;

  return (
    <>
      <Alert>
        <RiInformationLine aria-hidden="true" />
        <AlertTitle>
          {buildable} of {INTEGRATION_PROVIDERS.length} providers can be connected today
        </AlertTitle>
        <AlertDescription>
          Providers marked <strong>Not yet available</strong> have no client behind them yet — no
          OAuth app, no bank file collector, no vendor API. Rather than show a Connect button that
          would produce a &ldquo;Connected&rdquo; badge over nothing, they are disabled. Export the
          data you need from those systems and upload it directly to the audit.
        </AlertDescription>
      </Alert>

      {INTEGRATION_CATEGORIES.map((category) => {
        const providers = INTEGRATION_PROVIDERS.filter((p) => p.category === category);
        return (
          <section key={category} className="flex flex-col gap-2">
            <h3 className="font-heading text-sm font-semibold tracking-tight">
              {CATEGORY_LABELS[category]}
            </h3>
            <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {providers.map((provider) => {
                const availability = providerAvailability(provider);
                return (
                  <li
                    key={provider.key}
                    className="flex flex-col gap-2 rounded-lg border border-border p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{provider.name}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {provider.description}
                        </p>
                      </div>
                      {availability.available ? (
                        <Badge variant="outline">{AUTH_TYPE_LABELS[provider.authType]}</Badge>
                      ) : (
                        <Badge variant="secondary">
                          <RiLock2Line aria-hidden="true" />
                          Not yet available
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground">
                      <span className="sr-only">Datasets: </span>
                      {provider.datasets.slice(0, 4).map(datasetLabel).join(" · ")}
                      {provider.datasets.length > 4
                        ? ` · +${provider.datasets.length - 4} more`
                        : ""}
                    </p>

                    {availability.available ? (
                      canManage ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-fit"
                          render={
                            <Link
                              href={`/w/${slug}/integrations?filter=new&provider=${provider.key}`}
                            />
                          }
                        >
                          Connect {provider.name}
                        </Button>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Your role cannot connect integrations.
                        </p>
                      )
                    ) : (
                      <p className="text-xs text-muted-foreground">{availability.reason}</p>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </>
  );
}

/** The connect form: pick an available provider, then hand over one secret. */
async function NewConnectionView({
  slug,
  workspaceId,
  canManage,
  providerKey,
}: {
  slug: string;
  workspaceId: string;
  canManage: boolean;
  providerKey: string | undefined;
}) {
  if (!canManage) {
    return (
      <Empty className="border border-dashed border-border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <RiShieldKeyholeLine aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>Your role cannot add integrations</EmptyTitle>
          <EmptyDescription>
            Connecting a system stores a credential for the whole workspace, so it is limited to
            roles with the &ldquo;integrations manage&rdquo; permission.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const reason = encryptionUnavailableReason();
  if (!encryptionAvailable()) {
    return (
      <Alert variant="destructive">
        <RiErrorWarningLine aria-hidden="true" />
        <AlertTitle>Credentials cannot be stored on this server</AlertTitle>
        <AlertDescription>
          {reason ?? "Encryption is not configured."} Until that is fixed, no integration can be
          connected — storing a secret unencrypted is not an option this product offers.
        </AlertDescription>
      </Alert>
    );
  }

  const provider = providerKey ? getProvider(providerKey) : undefined;
  const availability = provider ? providerAvailability(provider) : null;

  if (provider && availability && !availability.available) {
    return (
      <Alert variant="destructive">
        <RiLock2Line aria-hidden="true" />
        <AlertTitle>{provider.name} is not yet available</AlertTitle>
        <AlertDescription>{availability.reason}</AlertDescription>
      </Alert>
    );
  }

  if (!provider) {
    const options = INTEGRATION_PROVIDERS.filter((p) => providerAvailability(p).available);
    return (
      <section className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          These are the providers whose credential capture is built. Everything else in the catalog
          is listed under{" "}
          <Link
            href={`/w/${slug}/integrations`}
            className="underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            available integrations
          </Link>{" "}
          with the reason it cannot be connected yet.
        </p>
        <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {options.map((option) => (
            <li key={option.key}>
              <Link
                href={`/w/${slug}/integrations?filter=new&provider=${option.key}`}
                className="flex h-full flex-col gap-1 rounded-lg border border-border p-3 transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{option.name}</span>
                  <Badge variant="outline">{AUTH_TYPE_LABELS[option.authType]}</Badge>
                </span>
                <span className="text-xs text-muted-foreground">{option.description}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  const field = credentialField(provider.authType);
  if (!field) {
    return (
      <Alert variant="destructive">
        <RiLock2Line aria-hidden="true" />
        <AlertTitle>{provider.name} is not yet available</AlertTitle>
        <AlertDescription>
          There is no credential form for this provider&rsquo;s authentication method yet.
        </AlertDescription>
      </Alert>
    );
  }

  const [clientRows, entityRows] = await Promise.all([
    db
      .select({ id: clients.id, name: clients.name })
      .from(clients)
      .where(eq(clients.workspaceId, workspaceId))
      .orderBy(clients.name),
    db
      .select({ id: entities.id, legalName: entities.legalName })
      .from(entities)
      .where(eq(entities.workspaceId, workspaceId))
      .orderBy(entities.legalName),
  ]);

  return (
    <section className="flex max-w-2xl flex-col gap-4">
      <div>
        <h3 className="font-heading text-base font-semibold tracking-tight">
          Connect {provider.name}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">{provider.description}</p>
      </div>

      <Alert>
        <RiInformationLine aria-hidden="true" />
        <AlertTitle>What saving this actually does</AlertTitle>
        <AlertDescription>
          Your {field.label.toLowerCase()} is encrypted with AES-256-GCM and stored. It is never
          shown again and never sent to a browser — only its last four characters are. The
          connection will read <strong>Credential stored</strong>, not Connected, because no
          collector for {provider.name} has been built yet: nothing will be fetched with it. Until
          one exists, export the records you need and upload them to the audit.
        </AlertDescription>
      </Alert>

      <form action={connectIntegration} className="flex flex-col gap-4">
        <input type="hidden" name="workspaceSlug" value={slug} />
        <input type="hidden" name="providerKey" value={provider.key} />

        <Field>
          <FieldLabel htmlFor="name">Connection name</FieldLabel>
          <Input
            id="name"
            name="name"
            required
            minLength={2}
            maxLength={160}
            defaultValue={provider.name}
            autoComplete="off"
          />
          <FieldDescription>
            How this connection is referred to across audits. Include the entity if you will have
            more than one.
          </FieldDescription>
        </Field>

        <Field>
          <FieldLabel htmlFor="connectedEntity">Organization or account</FieldLabel>
          <Input
            id="connectedEntity"
            name="connectedEntity"
            maxLength={200}
            placeholder="e.g. Northwind Trading Ltd — production"
            autoComplete="off"
          />
          <FieldDescription>
            The account this credential belongs to, as you would recognise it in {provider.name}.
          </FieldDescription>
        </Field>

        <Field>
          <FieldLabel htmlFor="credential">{field.label}</FieldLabel>
          <Input
            id="credential"
            name="credential"
            type="password"
            required
            placeholder={field.placeholder}
            autoComplete="off"
            spellCheck={false}
          />
          <FieldDescription>{field.help}</FieldDescription>
        </Field>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium">Datasets this connection may provide</legend>
          <p className="text-xs text-muted-foreground">
            Narrowing this now limits what any future import from this connection can request.
            Leave everything ticked if you are not sure.
          </p>
          <ul className="grid gap-1 sm:grid-cols-2">
            {provider.datasets.map((dataset) => (
              <li key={dataset}>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="datasets"
                    value={dataset}
                    defaultChecked
                    className="size-4 rounded border-input accent-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  />
                  {datasetLabel(dataset)}
                </label>
              </li>
            ))}
          </ul>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="clientId">Client</FieldLabel>
            <NativeSelect id="clientId" name="clientId" defaultValue="" className="w-full">
              <NativeSelectOption value="">Not client-specific</NativeSelectOption>
              {clientRows.map((row) => (
                <NativeSelectOption key={row.id} value={row.id}>
                  {row.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>

          <Field>
            <FieldLabel htmlFor="entityId">Entity</FieldLabel>
            <NativeSelect id="entityId" name="entityId" defaultValue="" className="w-full">
              <NativeSelectOption value="">Not entity-specific</NativeSelectOption>
              {entityRows.map((row) => (
                <NativeSelectOption key={row.id} value={row.id}>
                  {row.legalName}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>

          <Field>
            <FieldLabel htmlFor="periodStart">Data available from</FieldLabel>
            <Input id="periodStart" name="periodStart" type="date" />
            <FieldDescription>Optional. The earliest date this source covers.</FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="periodEnd">Data available to</FieldLabel>
            <Input id="periodEnd" name="periodEnd" type="date" />
            <FieldDescription>Optional. Leave empty if it is open-ended.</FieldDescription>
          </Field>
        </div>

        <Separator />

        <div className="flex items-center gap-2">
          <Button type="submit">Store credential</Button>
          <Button variant="ghost" render={<Link href={`/w/${slug}/integrations`} />}>
            Cancel
          </Button>
        </div>
      </form>
    </section>
  );
}

async function ConnectedView({
  slug,
  workspaceId,
  canManage,
}: {
  slug: string;
  workspaceId: string;
  canManage: boolean;
}) {
  const rows = await db
    .select({
      id: integrationConnections.id,
      name: integrationConnections.name,
      providerKey: integrationConnections.providerKey,
      status: integrationConnections.status,
      connectedEntity: integrationConnections.connectedEntity,
      availableDatasets: integrationConnections.availableDatasets,
      lastSyncAt: integrationConnections.lastSyncAt,
      updatedAt: integrationConnections.updatedAt,
      clientName: clients.name,
    })
    .from(integrationConnections)
    .leftJoin(
      clients,
      and(eq(clients.id, integrationConnections.clientId), eq(clients.workspaceId, workspaceId)),
    )
    .where(eq(integrationConnections.workspaceId, workspaceId))
    .orderBy(desc(integrationConnections.updatedAt))
    .limit(ROW_LIMIT);

  if (rows.length === 0) {
    return (
      <Empty className="border border-dashed border-border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <RiPlugLine aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>No connections yet</EmptyTitle>
          <EmptyDescription>
            A connection stores one credential for one source system, and can be reused by any
            number of audits. Nothing is pulled from it until an audit asks for a specific dataset
            and date range.
          </EmptyDescription>
        </EmptyHeader>
        {canManage ? (
          <EmptyContent>
            <Button render={<Link href={`/w/${slug}/integrations?filter=new`} />}>
              <RiAddLine aria-hidden="true" />
              Add the first integration
            </Button>
          </EmptyContent>
        ) : null}
      </Empty>
    );
  }

  const importCounts = await db
    .select({ connectionId: integrationImports.connectionId, total: count() })
    .from(integrationImports)
    .where(
      and(
        eq(integrationImports.workspaceId, workspaceId),
        inArray(
          integrationImports.connectionId,
          rows.map((row) => row.id),
        ),
      ),
    )
    .groupBy(integrationImports.connectionId);

  const importsBy = new Map(importCounts.map((row) => [row.connectionId, row.total]));

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-56">Connection</TableHead>
            <TableHead>Provider</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Account</TableHead>
            <TableHead>Client</TableHead>
            <TableHead className="text-right">Imports</TableHead>
            <TableHead>Last sync</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const provider = getProvider(row.providerKey);
            const imports = importsBy.get(row.id) ?? 0;
            return (
              <TableRow key={row.id}>
                <TableCell className="align-top">
                  <Link
                    href={`/w/${slug}/integrations/${row.id}`}
                    className="font-medium underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    {row.name}
                  </Link>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {row.availableDatasets.length} dataset
                    {row.availableDatasets.length === 1 ? "" : "s"} permitted
                  </p>
                </TableCell>
                <TableCell className="align-top text-sm">
                  {provider?.name ?? row.providerKey}
                </TableCell>
                <TableCell className="align-top">{statusBadge(row.status)}</TableCell>
                <TableCell className="align-top text-xs">
                  {row.connectedEntity ?? <span className="text-muted-foreground">Not stated</span>}
                </TableCell>
                <TableCell className="align-top text-xs">
                  {row.clientName ?? <span className="text-muted-foreground">All clients</span>}
                </TableCell>
                <TableCell className="text-right align-top tabular-nums">
                  {imports === 0 ? <span className="text-muted-foreground">—</span> : imports}
                </TableCell>
                <TableCell className="align-top text-xs tabular-nums">
                  {row.lastSyncAt ? (
                    dateTime(row.lastSyncAt)
                  ) : (
                    <span className="text-muted-foreground">Never</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

/**
 * Credentials. This view exists to answer "what secrets are we holding, and where did they
 * come from" — never "what is the secret". The hint is four characters, and it is all the
 * server will produce.
 */
async function CredentialsView({
  slug,
  workspaceId,
  canManage,
}: {
  slug: string;
  workspaceId: string;
  canManage: boolean;
}) {
  const rows = await db
    .select({
      id: integrationConnections.id,
      name: integrationConnections.name,
      providerKey: integrationConnections.providerKey,
      authType: integrationConnections.authType,
      status: integrationConnections.status,
      credentialsMeta: integrationConnections.credentialsMeta,
      hasCredential: sql<boolean>`${integrationConnections.credentialsEncrypted} is not null`,
      updatedAt: integrationConnections.updatedAt,
    })
    .from(integrationConnections)
    .where(eq(integrationConnections.workspaceId, workspaceId))
    .orderBy(desc(integrationConnections.updatedAt))
    .limit(ROW_LIMIT);

  return (
    <>
      <Alert>
        <RiShieldKeyholeLine aria-hidden="true" />
        <AlertTitle>Credentials are write-only</AlertTitle>
        <AlertDescription>
          Every secret here is encrypted at rest with AES-256-GCM and is never returned to a
          browser — not to you, not to an administrator. The hint below is the last four characters,
          which is enough to tell two keys apart and not enough to use one. A credential that needs
          to change is replaced, never revealed.
        </AlertDescription>
      </Alert>

      {rows.length === 0 ? (
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <RiKey2Line aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>No credentials stored</EmptyTitle>
            <EmptyDescription>
              Nothing is being held on this workspace&rsquo;s behalf.
            </EmptyDescription>
          </EmptyHeader>
          {canManage ? (
            <EmptyContent>
              <Button variant="outline" render={<Link href={`/w/${slug}/integrations?filter=new`} />}>
                Add an integration
              </Button>
            </EmptyContent>
          ) : null}
        </Empty>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-56">Connection</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Stored secret</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Last changed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const provider = getProvider(row.providerKey);
                const hint = row.credentialsMeta.hint;
                return (
                  <TableRow key={row.id}>
                    <TableCell className="align-top">
                      <Link
                        href={`/w/${slug}/integrations/${row.id}`}
                        className="font-medium underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      >
                        {row.name}
                      </Link>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {provider?.name ?? row.providerKey}
                      </p>
                    </TableCell>
                    <TableCell className="align-top text-sm">
                      {row.authType === "api_key" || row.authType === "connection_string"
                        ? AUTH_TYPE_LABELS[row.authType]
                        : row.authType}
                    </TableCell>
                    <TableCell className="align-top font-mono text-xs">
                      {row.hasCredential && hint ? (
                        <>
                          {hint}
                          <span className="sr-only"> — last four characters only</span>
                        </>
                      ) : (
                        <span className="font-sans text-muted-foreground">None held</span>
                      )}
                    </TableCell>
                    <TableCell className="align-top">{statusBadge(row.status)}</TableCell>
                    <TableCell className="align-top text-xs tabular-nums">
                      {dateTime(row.updatedAt)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}

/** Import history — the only place data and audits meet on this page, and only by reference. */
async function ImportsView({
  slug,
  workspaceId,
  failedOnly,
}: {
  slug: string;
  workspaceId: string;
  failedOnly: boolean;
}) {
  const where = failedOnly
    ? and(eq(integrationImports.workspaceId, workspaceId), eq(integrationImports.status, "failed"))
    : eq(integrationImports.workspaceId, workspaceId);

  const rows = await db
    .select({
      id: integrationImports.id,
      dataset: integrationImports.dataset,
      periodStart: integrationImports.periodStart,
      periodEnd: integrationImports.periodEnd,
      mode: integrationImports.mode,
      recordCount: integrationImports.recordCount,
      status: integrationImports.status,
      error: integrationImports.error,
      createdAt: integrationImports.createdAt,
      completedAt: integrationImports.completedAt,
      connectionId: integrationConnections.id,
      connectionName: integrationConnections.name,
      providerKey: integrationConnections.providerKey,
      auditId: audits.id,
      auditName: audits.name,
    })
    .from(integrationImports)
    .innerJoin(
      integrationConnections,
      and(
        eq(integrationConnections.id, integrationImports.connectionId),
        eq(integrationConnections.workspaceId, workspaceId),
      ),
    )
    .leftJoin(
      audits,
      and(eq(audits.id, integrationImports.auditId), eq(audits.workspaceId, workspaceId)),
    )
    .where(where)
    .orderBy(desc(integrationImports.createdAt))
    .limit(ROW_LIMIT);

  if (rows.length === 0) {
    return (
      <Empty className="border border-dashed border-border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            {failedOnly ? (
              <RiAlertLine aria-hidden="true" />
            ) : (
              <RiHistoryLine aria-hidden="true" />
            )}
          </EmptyMedia>
          <EmptyTitle>{failedOnly ? "No failed imports" : "No imports yet"}</EmptyTitle>
          <EmptyDescription>
            {failedOnly
              ? "Nothing has failed. Failures are kept here rather than dismissed, so that an audit missing data can always be traced to the reason."
              : "An import is requested from inside an audit: pick the connection, the records, the date range, and whether the audit keeps the snapshot or re-pulls it on each revision."}
          </EmptyDescription>
        </EmptyHeader>
        {failedOnly ? (
          <EmptyContent>
            <Button
              variant="outline"
              render={<Link href={`/w/${slug}/integrations?filter=imports`} />}
            >
              See all imports
            </Button>
          </EmptyContent>
        ) : null}
      </Empty>
    );
  }

  return (
    <>
      {!failedOnly ? (
        <Alert>
          <RiDatabase2Line aria-hidden="true" />
          <AlertTitle>Every import belongs to exactly one audit</AlertTitle>
          <AlertDescription>
            An import is an immutable snapshot: it is never rewritten in place, and it never becomes
            workspace-wide accounting data. If the source has changed since, the audit that used it
            needs a new revision — the finished one keeps the numbers it was actually built on.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-44">Dataset</TableHead>
              <TableHead>Connection</TableHead>
              <TableHead>Into audit</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead className="text-right">Records</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Requested</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const provider = getProvider(row.providerKey);
              return (
                <TableRow key={row.id}>
                  <TableCell className="align-top text-sm font-medium">
                    {datasetLabel(row.dataset)}
                  </TableCell>
                  <TableCell className="align-top text-xs">
                    <Link
                      href={`/w/${slug}/integrations/${row.connectionId}`}
                      className="underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                      {row.connectionName}
                    </Link>
                    <p className="text-muted-foreground">{provider?.name ?? row.providerKey}</p>
                  </TableCell>
                  <TableCell className="align-top text-xs">
                    {row.auditId && row.auditName ? (
                      <Link
                        href={`/w/${slug}/audits/${row.auditId}`}
                        className="underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      >
                        {row.auditName}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">Audit deleted</span>
                    )}
                  </TableCell>
                  <TableCell className="align-top text-xs tabular-nums">
                    {row.periodStart || row.periodEnd ? (
                      `${row.periodStart ?? "…"} → ${row.periodEnd ?? "…"}`
                    ) : (
                      <span className="text-muted-foreground">Not specified</span>
                    )}
                  </TableCell>
                  <TableCell className="align-top text-xs">
                    {row.mode === "snapshot" ? "One-time snapshot" : "Refresh on revision"}
                  </TableCell>
                  <TableCell className="text-right align-top tabular-nums">
                    {row.recordCount === null ? (
                      <span className="text-muted-foreground" title="Nothing was read.">
                        —
                      </span>
                    ) : (
                      row.recordCount.toLocaleString("en-US")
                    )}
                  </TableCell>
                  <TableCell className="align-top">
                    {importStatusBadge(row.status)}
                    {row.error ? (
                      <p className="mt-1 max-w-xs text-xs text-destructive">{row.error}</p>
                    ) : row.status === "pending" ? (
                      <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                        No collector is implemented — nothing is fetching this.
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell className="align-top text-xs tabular-nums">
                    {dateTime(row.createdAt)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

async function ActivityView({ slug, workspaceId }: { slug: string; workspaceId: string }) {
  const rows = await db
    .select({
      id: integrationEvents.id,
      type: integrationEvents.type,
      message: integrationEvents.message,
      createdAt: integrationEvents.createdAt,
      connectionId: integrationConnections.id,
      connectionName: integrationConnections.name,
    })
    .from(integrationEvents)
    .innerJoin(
      integrationConnections,
      and(
        eq(integrationConnections.id, integrationEvents.connectionId),
        eq(integrationConnections.workspaceId, workspaceId),
      ),
    )
    .where(eq(integrationEvents.workspaceId, workspaceId))
    .orderBy(desc(integrationEvents.createdAt))
    .limit(ROW_LIMIT);

  if (rows.length === 0) {
    return (
      <Empty className="border border-dashed border-border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <RiPulseLine aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>No connection activity</EmptyTitle>
          <EmptyDescription>
            Every credential stored, replaced, destroyed or import requested is recorded here, in
            order, and is never edited afterwards.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <ol className="flex flex-col gap-2">
      {rows.map((row) => (
        <li key={row.id} className="flex gap-3 rounded-lg border border-border p-3">
          <RiPulseLine aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="text-sm">{row.message}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              <Link
                href={`/w/${slug}/integrations/${row.connectionId}`}
                className="underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                {row.connectionName}
              </Link>
              {" · "}
              <span className="font-mono">{row.type}</span>
              {" · "}
              <time dateTime={row.createdAt.toISOString()} className="tabular-nums">
                {dateTime(row.createdAt)}
              </time>
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/**
 * Two different things are called "permissions" here, and conflating them would be the easy
 * mistake: who in *this workspace* may touch integrations, and what each connection is
 * allowed to read *from the provider*. Both are shown, separately and labelled.
 */
async function PermissionsView({
  slug,
  workspaceId,
  role,
}: {
  slug: string;
  workspaceId: string;
  role: MemberRole;
}) {
  const rows = await db
    .select({
      id: integrationConnections.id,
      name: integrationConnections.name,
      providerKey: integrationConnections.providerKey,
      permissions: integrationConnections.permissions,
      availableDatasets: integrationConnections.availableDatasets,
      status: integrationConnections.status,
    })
    .from(integrationConnections)
    .where(eq(integrationConnections.workspaceId, workspaceId))
    .orderBy(integrationConnections.name)
    .limit(ROW_LIMIT);

  const roles = memberRoleEnum.enumValues;

  return (
    <>
      <section className="flex flex-col gap-2">
        <h3 className="font-heading text-sm font-semibold tracking-tight">
          Who can manage integrations
        </h3>
        <p className="text-sm text-muted-foreground">
          Connecting or disconnecting a source stores or destroys a workspace-wide credential, so it
          is limited to the roles below. Your role is{" "}
          <strong>{role.replace(/_/g, " ")}</strong>, which{" "}
          {roleHas(role, "integrations.manage") ? "can" : "cannot"} manage integrations.
        </p>
        <ul className="flex flex-wrap gap-1.5">
          {roles.map((value) => {
            const allowed = roleHas(value, "integrations.manage");
            return (
              <li key={value}>
                <Badge variant={allowed ? "outline" : "ghost"}>
                  {allowed ? <RiKey2Line aria-hidden="true" /> : <RiLock2Line aria-hidden="true" />}
                  {value.replace(/_/g, " ")}
                  <span className="sr-only">
                    {allowed ? " can manage integrations" : " cannot manage integrations"}
                  </span>
                </Badge>
              </li>
            );
          })}
        </ul>
      </section>

      <Separator />

      <section className="flex flex-col gap-2">
        <h3 className="font-heading text-sm font-semibold tracking-tight">
          What each connection is allowed to read
        </h3>
        <p className="text-sm text-muted-foreground">
          A connection can only ever be asked for the datasets it was set up with. Provider-side
          scopes are recorded when a provider grants them; none do yet, because no OAuth flow has
          been built.
        </p>

        {rows.length === 0 ? (
          <Empty className="border border-dashed border-border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <RiShieldKeyholeLine aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>No connections to scope</EmptyTitle>
              <EmptyDescription>
                Add an integration and its permitted datasets will be listed here.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-56">Connection</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="min-w-64">Permitted datasets</TableHead>
                  <TableHead>Provider scopes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const provider = getProvider(row.providerKey);
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="align-top">
                        <Link
                          href={`/w/${slug}/integrations/${row.id}`}
                          className="font-medium underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        >
                          {row.name}
                        </Link>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {provider?.name ?? row.providerKey}
                        </p>
                      </TableCell>
                      <TableCell className="align-top">{statusBadge(row.status)}</TableCell>
                      <TableCell className="align-top text-xs">
                        {row.availableDatasets.length === 0 ? (
                          <span className="text-muted-foreground">None</span>
                        ) : (
                          row.availableDatasets.map(datasetLabel).join(" · ")
                        )}
                      </TableCell>
                      <TableCell className="align-top text-xs">
                        {row.permissions.length === 0 ? (
                          <span className="text-muted-foreground">None recorded</span>
                        ) : (
                          row.permissions.join(" · ")
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </>
  );
}
