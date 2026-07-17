import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import {
  RiAlertLine,
  RiCalendarLine,
  RiDatabase2Line,
  RiErrorWarningLine,
  RiHistoryLine,
  RiInformationLine,
  RiKey2Line,
  RiLock2Line,
  RiPlugLine,
  RiPulseLine,
  RiSearchEyeLine,
  RiShieldKeyholeLine,
} from "@remixicon/react";

import { PageHeader } from "@/components/layout/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
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
  workspaces,
} from "@/db/schema";
import { AccessDenied, requireMember, roleHas } from "@/lib/auth/guards";
import { encryptionAvailable } from "@/lib/crypto";
import {
  AUTH_TYPE_LABELS,
  CONNECTION_STATUS_DESCRIPTIONS,
  CONNECTION_STATUS_LABELS,
  credentialField,
  datasetLabel,
} from "@/lib/integrations/availability";
import { getProvider } from "@/lib/integrations/catalog";
import {
  disconnectIntegration,
  requestIntegrationImport,
} from "@/server/actions/integration";

/**
 * One connection (PRD §16.6, §16.8).
 *
 * This page answers the questions an auditor actually asks about a source: what is it, whose
 * account is behind it, what may it be read for, when was it last touched, what went wrong,
 * and — the one that matters at review time — **which audits were built on data from it**.
 *
 * That last section is why imports are audit-scoped and immutable. An audit that used this
 * connection keeps the snapshot it ran on; changing the source, or even the credential, does
 * not reach backwards into it. Getting new data means a new revision.
 *
 * The route also absorbs the nav's integration sub-paths (`/integrations/credentials`,
 * `/imports`, `/activity`, `/permissions`, `/new`), which would otherwise land here as a
 * bogus id. They redirect to the matching view on the index page.
 *
 * Drizzle bypasses RLS, so every query carries its own `workspace_id` predicate.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Connection" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Nav sub-paths that share this segment, mapped to the index page's `?filter=`. */
const SECTION_VIEWS: Record<string, string> = {
  credentials: "credentials",
  imports: "imports",
  activity: "activity",
  permissions: "permissions",
  new: "new",
};

type Props = {
  params: Promise<{ slug: string; id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function dateTime(value: Date | null): string {
  if (!value) return "—";
  return value.toISOString().slice(0, 16).replace("T", " ") + " UTC";
}

/** A labelled fact. Definition lists read better than cards for dense reference data. */
function Fact({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5 border-l-2 border-border pl-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

function Unknown({ children }: { children: React.ReactNode }) {
  return <span className="text-muted-foreground">{children}</span>;
}

export default async function IntegrationConnectionPage({ params, searchParams }: Props) {
  const { slug, id } = await params;
  const query = await searchParams;

  // `/integrations/imports?filter=failed` and friends arrive here as an "id". Recognise them
  // before treating the segment as a uuid.
  const section = SECTION_VIEWS[id];
  if (section) {
    const sub = query.filter;
    const failed = section === "imports" && (Array.isArray(sub) ? sub[0] : sub) === "failed";
    redirect(`/w/${slug}/integrations?filter=${failed ? "failed_imports" : section}`);
  }
  if (!UUID.test(id)) notFound();

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

  const [connection] = await db
    .select({
      id: integrationConnections.id,
      name: integrationConnections.name,
      providerKey: integrationConnections.providerKey,
      status: integrationConnections.status,
      authType: integrationConnections.authType,
      credentialsMeta: integrationConnections.credentialsMeta,
      connectedEntity: integrationConnections.connectedEntity,
      availableDatasets: integrationConnections.availableDatasets,
      dataPeriod: integrationConnections.dataPeriod,
      permissions: integrationConnections.permissions,
      lastSyncAt: integrationConnections.lastSyncAt,
      nextSyncAt: integrationConnections.nextSyncAt,
      error: integrationConnections.error,
      createdAt: integrationConnections.createdAt,
      updatedAt: integrationConnections.updatedAt,
      clientId: integrationConnections.clientId,
      clientName: clients.name,
      entityName: entities.legalName,
    })
    .from(integrationConnections)
    .leftJoin(
      clients,
      and(eq(clients.id, integrationConnections.clientId), eq(clients.workspaceId, workspaceId)),
    )
    .leftJoin(
      entities,
      and(eq(entities.id, integrationConnections.entityId), eq(entities.workspaceId, workspaceId)),
    )
    // The workspace predicate is what makes a guessed id useless against another tenant.
    .where(
      and(eq(integrationConnections.id, id), eq(integrationConnections.workspaceId, workspaceId)),
    )
    .limit(1);
  if (!connection) notFound();

  const provider = getProvider(connection.providerKey);
  const providerName = provider?.name ?? connection.providerKey;
  const disconnected = connection.status === "disconnected";

  const [importRows, eventRows, auditOptions] = await Promise.all([
    db
      .select({
        id: integrationImports.id,
        dataset: integrationImports.dataset,
        periodStart: integrationImports.periodStart,
        periodEnd: integrationImports.periodEnd,
        mode: integrationImports.mode,
        recordCount: integrationImports.recordCount,
        snapshotChecksum: integrationImports.snapshotChecksum,
        status: integrationImports.status,
        error: integrationImports.error,
        createdAt: integrationImports.createdAt,
        completedAt: integrationImports.completedAt,
        auditId: audits.id,
        auditName: audits.name,
        auditStatus: audits.status,
      })
      .from(integrationImports)
      .leftJoin(
        audits,
        and(eq(audits.id, integrationImports.auditId), eq(audits.workspaceId, workspaceId)),
      )
      .where(
        and(
          eq(integrationImports.connectionId, connection.id),
          eq(integrationImports.workspaceId, workspaceId),
        ),
      )
      .orderBy(desc(integrationImports.createdAt))
      .limit(50),

    db
      .select({
        id: integrationEvents.id,
        type: integrationEvents.type,
        message: integrationEvents.message,
        createdAt: integrationEvents.createdAt,
      })
      .from(integrationEvents)
      .where(
        and(
          eq(integrationEvents.connectionId, connection.id),
          eq(integrationEvents.workspaceId, workspaceId),
        ),
      )
      .orderBy(desc(integrationEvents.createdAt))
      .limit(50),

    canManage && !disconnected
      ? db
          .select({ id: audits.id, name: audits.name, status: audits.status })
          .from(audits)
          .where(eq(audits.workspaceId, workspaceId))
          .orderBy(desc(audits.updatedAt))
          .limit(50)
      : Promise.resolve([]),
  ]);

  const failedImports = importRows.filter((row) => row.status === "failed");
  // "Which audits used this data" means completed imports only — a request that never
  // collected anything did not feed an audit, and listing it here would imply it did.
  const feedingAudits = new Map<string, { name: string; datasets: Set<string> }>();
  for (const row of importRows) {
    if (row.status !== "completed" || !row.auditId || !row.auditName) continue;
    const existing = feedingAudits.get(row.auditId);
    if (existing) existing.datasets.add(row.dataset);
    else feedingAudits.set(row.auditId, { name: row.auditName, datasets: new Set([row.dataset]) });
  }

  const requestableAudits = auditOptions.filter(
    (audit) => audit.status !== "archived" && audit.status !== "approved",
  );
  const credential = credentialField(
    connection.authType === "api_key" || connection.authType === "connection_string"
      ? connection.authType
      : "api_key",
  );

  return (
    <>
      <PageHeader
        breadcrumb={[
          { label: "Integrations", href: `/w/${slug}/integrations` },
          { label: "Connections", href: `/w/${slug}/integrations?filter=connected` },
          { label: connection.name },
        ]}
        title={connection.name}
        description={
          <>
            {providerName}
            {connection.connectedEntity ? ` · ${connection.connectedEntity}` : ""} · connected{" "}
            {dateTime(connection.createdAt)}
          </>
        }
        actions={
          canManage && !disconnected ? (
            <form action={disconnectIntegration}>
              <input type="hidden" name="workspaceSlug" value={slug} />
              <input type="hidden" name="connectionId" value={connection.id} />
              <Button type="submit" variant="destructive" size="sm">
                <RiLock2Line aria-hidden="true" />
                Disconnect
              </Button>
            </form>
          ) : null
        }
      />

      <main className="flex flex-1 flex-col gap-6 px-4 py-5 md:px-6">
        {/* ── Status ─────────────────────────────────────────────────────── */}
        <section aria-labelledby="status-heading" className="flex flex-col gap-3">
          <h2 id="status-heading" className="font-heading text-sm font-semibold tracking-tight">
            Status
          </h2>

          {connection.status === "pending" ? (
            <Alert>
              <RiKey2Line aria-hidden="true" />
              <AlertTitle>Credential stored — not connected</AlertTitle>
              <AlertDescription>
                {CONNECTION_STATUS_DESCRIPTIONS.pending} No collector for {providerName} has been
                built, so this credential has never left the database. Export the records you need
                and upload them to the audit; when a collector exists, this connection is what it
                will use.
              </AlertDescription>
            </Alert>
          ) : null}

          {connection.status === "error" && connection.error ? (
            <Alert variant="destructive">
              <RiErrorWarningLine aria-hidden="true" />
              <AlertTitle>The last operation on this connection failed</AlertTitle>
              <AlertDescription>{connection.error}</AlertDescription>
            </Alert>
          ) : null}

          {disconnected ? (
            <Alert>
              <RiLock2Line aria-hidden="true" />
              <AlertTitle>Disconnected</AlertTitle>
              <AlertDescription>
                {CONNECTION_STATUS_DESCRIPTIONS.disconnected} The import history below is kept
                deliberately: it is the provenance of the audits that used it, and deleting it would
                cut a finished audit off from where its numbers came from.
              </AlertDescription>
            </Alert>
          ) : null}

          <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Fact label="Connection state">
              <Badge
                variant={
                  connection.status === "error"
                    ? "destructive"
                    : connection.status === "connected"
                      ? "default"
                      : "outline"
                }
              >
                {connection.status === "error" ? (
                  <RiErrorWarningLine aria-hidden="true" />
                ) : connection.status === "pending" ? (
                  <RiKey2Line aria-hidden="true" />
                ) : (
                  <RiPlugLine aria-hidden="true" />
                )}
                {CONNECTION_STATUS_LABELS[connection.status]}
              </Badge>
            </Fact>

            <Fact label="Provider">{providerName}</Fact>

            <Fact label="Authentication">
              {connection.authType === "api_key" || connection.authType === "connection_string"
                ? AUTH_TYPE_LABELS[connection.authType]
                : connection.authType}
            </Fact>

            <Fact label="Stored secret">
              {connection.credentialsMeta.hint ? (
                <span className="font-mono">
                  {connection.credentialsMeta.hint}
                  <span className="sr-only"> — last four characters only; never retrievable</span>
                </span>
              ) : (
                <Unknown>None held</Unknown>
              )}
            </Fact>

            <Fact label="Connected entity">
              {connection.connectedEntity ?? <Unknown>Not stated</Unknown>}
            </Fact>

            <Fact label="Client">
              {connection.clientName ?? <Unknown>Not client-specific</Unknown>}
            </Fact>

            <Fact label="Legal entity">
              {connection.entityName ?? <Unknown>Not entity-specific</Unknown>}
            </Fact>

            <Fact label="Data period offered">
              {connection.dataPeriod?.start || connection.dataPeriod?.end ? (
                <span className="tabular-nums">
                  {connection.dataPeriod.start ?? "…"} → {connection.dataPeriod.end ?? "open"}
                </span>
              ) : (
                <Unknown>Not stated</Unknown>
              )}
            </Fact>

            <Fact label="Last sync">
              {connection.lastSyncAt ? (
                <span className="tabular-nums">{dateTime(connection.lastSyncAt)}</span>
              ) : (
                <Unknown>Never — nothing has been fetched</Unknown>
              )}
            </Fact>

            <Fact label="Next sync">
              {connection.nextSyncAt ? (
                <span className="tabular-nums">{dateTime(connection.nextSyncAt)}</span>
              ) : (
                <Unknown>None scheduled</Unknown>
              )}
            </Fact>

            <Fact label="Last changed">
              <span className="tabular-nums">{dateTime(connection.updatedAt)}</span>
            </Fact>

            <Fact label="Audits fed">
              {feedingAudits.size === 0 ? <Unknown>None</Unknown> : feedingAudits.size}
            </Fact>
          </dl>
        </section>

        <Separator />

        {/* ── Datasets & permissions ─────────────────────────────────────── */}
        <section aria-labelledby="datasets-heading" className="flex flex-col gap-3">
          <h2 id="datasets-heading" className="font-heading text-sm font-semibold tracking-tight">
            Datasets and permissions
          </h2>
          <p className="text-sm text-muted-foreground">
            An import from this connection can only ask for one of these. Provider-side scopes are
            recorded when a provider grants them; none has, because no OAuth flow exists yet.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-border p-3">
              <h3 className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <RiDatabase2Line aria-hidden="true" className="size-3.5" />
                Permitted datasets
              </h3>
              {connection.availableDatasets.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  None. This connection cannot be asked for anything until its datasets are set.
                </p>
              ) : (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {connection.availableDatasets.map((dataset) => (
                    <li key={dataset}>
                      <Badge variant="outline">{datasetLabel(dataset)}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-lg border border-border p-3">
              <h3 className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <RiShieldKeyholeLine aria-hidden="true" className="size-3.5" />
                Provider scopes granted
              </h3>
              {connection.permissions.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  None recorded. Nothing has been authorised at {providerName}.
                </p>
              ) : (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {connection.permissions.map((permission) => (
                    <li key={permission}>
                      <Badge variant="secondary">{permission}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>

        <Separator />

        {/* ── Which audits used this data ────────────────────────────────── */}
        <section aria-labelledby="audits-heading" className="flex flex-col gap-3">
          <h2 id="audits-heading" className="font-heading text-sm font-semibold tracking-tight">
            Audits built on data from this connection
          </h2>

          {feedingAudits.size === 0 ? (
            <Empty className="border border-dashed border-border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <RiSearchEyeLine aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>No audit has used this connection</EmptyTitle>
                <EmptyDescription>
                  Only imports that actually collected records count here. A requested import that
                  never ran did not feed an audit, and is not listed as though it had.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {[...feedingAudits.entries()].map(([auditId, audit]) => (
                <li key={auditId}>
                  <Link
                    href={`/w/${slug}/audits/${auditId}`}
                    className="flex flex-col gap-1 rounded-lg border border-border p-3 transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <span className="text-sm font-medium">{audit.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {[...audit.datasets].map(datasetLabel).join(" · ")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <Separator />

        {/* ── Sync / import history ──────────────────────────────────────── */}
        <section aria-labelledby="imports-heading" className="flex flex-col gap-3">
          <h2 id="imports-heading" className="font-heading text-sm font-semibold tracking-tight">
            Import history
          </h2>
          <p className="text-sm text-muted-foreground">
            Each row is one immutable snapshot request against one audit. Snapshots are never
            rewritten — if the source changed, the audit that used it needs a new revision, and the
            finished one keeps the data it was built on.
          </p>

          {importRows.length === 0 ? (
            <Empty className="border border-dashed border-border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <RiHistoryLine aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>Nothing imported yet</EmptyTitle>
                <EmptyDescription>
                  This connection has never been asked for data.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-40">Dataset</TableHead>
                    <TableHead>Into audit</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead className="text-right">Records</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Requested</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="align-top text-sm font-medium">
                        {datasetLabel(row.dataset)}
                        {row.snapshotChecksum ? (
                          <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                            {row.snapshotChecksum.slice(0, 12)}
                            <span className="sr-only"> snapshot checksum</span>
                          </p>
                        ) : null}
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
                          <Unknown>Audit deleted</Unknown>
                        )}
                      </TableCell>
                      <TableCell className="align-top text-xs tabular-nums">
                        {row.periodStart || row.periodEnd ? (
                          `${row.periodStart ?? "…"} → ${row.periodEnd ?? "…"}`
                        ) : (
                          <Unknown>Not specified</Unknown>
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
                        <Badge
                          variant={
                            row.status === "failed"
                              ? "destructive"
                              : row.status === "completed"
                                ? "default"
                                : "outline"
                          }
                        >
                          {row.status === "failed" ? (
                            <RiErrorWarningLine aria-hidden="true" />
                          ) : null}
                          {row.status === "pending"
                            ? "Requested"
                            : row.status === "running"
                              ? "Running"
                              : row.status === "completed"
                                ? "Completed"
                                : "Failed"}
                        </Badge>
                        {row.error ? (
                          <p className="mt-1 max-w-xs text-xs text-destructive">{row.error}</p>
                        ) : row.status === "pending" ? (
                          <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                            No collector implemented — nothing is fetching this.
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell className="align-top text-xs tabular-nums">
                        {dateTime(row.createdAt)}
                        {row.completedAt ? (
                          <p className="text-muted-foreground">
                            done {dateTime(row.completedAt)}
                          </p>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>

        {/* ── Errors ─────────────────────────────────────────────────────── */}
        {failedImports.length > 0 ? (
          <section aria-labelledby="errors-heading" className="flex flex-col gap-3">
            <h2 id="errors-heading" className="font-heading text-sm font-semibold tracking-tight">
              Errors
            </h2>
            <ul className="flex flex-col gap-2">
              {failedImports.map((row) => (
                <li key={row.id}>
                  <Alert variant="destructive">
                    <RiAlertLine aria-hidden="true" />
                    <AlertTitle>
                      {datasetLabel(row.dataset)}
                      {row.auditName ? ` → ${row.auditName}` : ""}
                    </AlertTitle>
                    <AlertDescription>
                      {row.error ?? "The import failed without recording a reason."}{" "}
                      <span className="text-muted-foreground">{dateTime(row.createdAt)}</span>
                    </AlertDescription>
                  </Alert>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <Separator />

        {/* ── Request an import ──────────────────────────────────────────── */}
        {canManage && !disconnected ? (
          <section aria-labelledby="request-heading" className="flex max-w-2xl flex-col gap-3">
            <h2 id="request-heading" className="font-heading text-sm font-semibold tracking-tight">
              Import into an audit
            </h2>

            <Alert>
              <RiInformationLine aria-hidden="true" />
              <AlertTitle>This records a request; it does not fetch anything</AlertTitle>
              <AlertDescription>
                No collector for {providerName} exists yet, so the request will sit at
                &ldquo;Requested&rdquo; and no records will arrive. It is written down anyway
                because it states exactly what an audit needs — dataset, period, and whether the
                snapshot is fixed. Until a collector is built, export the data from {providerName}{" "}
                and upload it to the audit.
              </AlertDescription>
            </Alert>

            {connection.availableDatasets.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                This connection has no permitted datasets, so nothing can be requested from it.
              </p>
            ) : requestableAudits.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                There is no audit that can receive data. Approved and archived audits have frozen
                inputs — start a new audit, or a new revision of an existing one.
              </p>
            ) : (
              <form action={requestIntegrationImport} className="flex flex-col gap-4">
                <input type="hidden" name="workspaceSlug" value={slug} />
                <input type="hidden" name="connectionId" value={connection.id} />

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="auditId">Audit receiving the data</FieldLabel>
                    <NativeSelect id="auditId" name="auditId" required className="w-full">
                      {requestableAudits.map((audit) => (
                        <NativeSelectOption key={audit.id} value={audit.id}>
                          {audit.name}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                    <FieldDescription>
                      The data will belong to this audit alone. It does not become workspace data.
                    </FieldDescription>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="dataset">Records</FieldLabel>
                    <NativeSelect id="dataset" name="dataset" required className="w-full">
                      {connection.availableDatasets.map((dataset) => (
                        <NativeSelectOption key={dataset} value={dataset}>
                          {datasetLabel(dataset)}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="periodStart">Period from</FieldLabel>
                    <Input
                      id="periodStart"
                      name="periodStart"
                      type="date"
                      defaultValue={connection.dataPeriod?.start ?? undefined}
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="periodEnd">Period to</FieldLabel>
                    <Input
                      id="periodEnd"
                      name="periodEnd"
                      type="date"
                      defaultValue={connection.dataPeriod?.end ?? undefined}
                    />
                  </Field>
                </div>

                <Field>
                  <FieldLabel htmlFor="mode">Snapshot behaviour</FieldLabel>
                  <NativeSelect id="mode" name="mode" defaultValue="snapshot" className="w-full">
                    <NativeSelectOption value="snapshot">
                      One-time snapshot — the audit keeps exactly this data
                    </NativeSelectOption>
                    <NativeSelectOption value="refresh_on_revision">
                      Refresh on revision — re-pull when a new revision is created
                    </NativeSelectOption>
                  </NativeSelect>
                  <FieldDescription>
                    Neither option ever changes data underneath a finished revision. &ldquo;Refresh
                    on revision&rdquo; means the <em>next</em> revision pulls again; the current one
                    keeps its own snapshot.
                  </FieldDescription>
                </Field>

                <div className="flex items-center gap-2">
                  <Button type="submit" variant="outline">
                    <RiCalendarLine aria-hidden="true" />
                    Record import request
                  </Button>
                </div>
              </form>
            )}

            {credential && !encryptionAvailable() ? (
              <p className="text-xs text-muted-foreground">
                Encryption is not configured on this server, so this connection&rsquo;s credential
                cannot be replaced.
              </p>
            ) : null}
          </section>
        ) : null}

        <Separator />

        {/* ── Connection activity ────────────────────────────────────────── */}
        <section aria-labelledby="activity-heading" className="flex flex-col gap-3">
          <h2 id="activity-heading" className="font-heading text-sm font-semibold tracking-tight">
            Connection activity
          </h2>

          {eventRows.length === 0 ? (
            <Empty className="border border-dashed border-border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <RiPulseLine aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>No activity recorded</EmptyTitle>
                <EmptyDescription>Nothing has happened on this connection.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ol className="flex flex-col gap-2">
              {eventRows.map((event) => (
                <li key={event.id} className="flex gap-3 rounded-lg border border-border p-3">
                  <RiPulseLine
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">{event.message}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      <span className="font-mono">{event.type}</span>
                      {" · "}
                      <time dateTime={event.createdAt.toISOString()} className="tabular-nums">
                        {dateTime(event.createdAt)}
                      </time>
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </main>
    </>
  );
}
