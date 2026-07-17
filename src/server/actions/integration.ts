"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

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
import { logActivity } from "@/lib/activity";
import { requirePermission } from "@/lib/auth/guards";
import { credentialHint, encryptSecret, encryptionAvailable } from "@/lib/crypto";
import { getProvider } from "@/lib/integrations/catalog";
import { providerAvailability } from "@/lib/integrations/availability";

/**
 * Integration connections and audit-scoped imports (PRD §16).
 *
 * Three rules shape every function in this file.
 *
 * 1. **A credential goes in and never comes out.** `credentials_encrypted` is written here
 *    and read by nothing that talks to a browser. What the UI gets is `credentialHint()` —
 *    four trailing characters — stored alongside as metadata. There is deliberately no
 *    action that returns a decrypted secret; when a credential must change, it is replaced,
 *    not revealed.
 *
 * 2. **We do not claim a connection we cannot make.** Only `api_key` and `connection_string`
 *    providers are accepted, because handing us a secret to encrypt is an operation that is
 *    genuinely, completely implemented. Everything else — OAuth to QuickBooks/Xero, SAP over
 *    basic auth, bank SFTP — has no client behind it, and `providerAvailability` says so.
 *    Even for the accepted ones the connection rests at `pending`, not `connected`: we hold
 *    the credential, we have never exercised it. A green "Connected" badge over an unbuilt
 *    fetcher would fabricate provenance for audit evidence, which is the exact failure this
 *    product exists to catch.
 *
 * 3. **Connections are reusable; imports are not.** An import is an immutable, audit-scoped
 *    snapshot (PRD "Important integration behavior"). `requestIntegrationImport` therefore
 *    records *what was asked for* against one audit and never mutates an existing import.
 *    Fresh data means a new revision — hence `mode: refresh_on_revision` — never a rewritten
 *    snapshot underneath a finished audit.
 *
 * Every action re-authorises. Server Functions answer direct POSTs regardless of which page
 * rendered the form, and Drizzle connects as a role that bypasses RLS, so the guard plus an
 * explicit `workspace_id` predicate on every statement *is* the tenant boundary.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function str(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function optional(formData: FormData, key: string): string | null {
  const value = str(formData, key).trim();
  return value.length > 0 ? value : null;
}

function many(formData: FormData, key: string): string[] {
  return formData.getAll(key).flatMap((value) => (typeof value === "string" ? [value] : []));
}

/** The first zod message, so a thrown error reads like a sentence rather than a dump. */
function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Those details are not valid.";
}

async function workspaceBySlug(slug: string) {
  const [workspace] = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.slug, slug))
    .limit(1);
  if (!workspace) throw new Error("That workspace could not be found.");
  return workspace;
}

/**
 * Optional client/entity references are validated against *this* workspace before being
 * written. A foreign key alone would happily accept another tenant's id.
 */
async function assertClientAndEntity(
  workspaceId: string,
  clientId: string | null,
  entityId: string | null,
): Promise<void> {
  if (clientId) {
    const [row] = await db
      .select({ id: clients.id })
      .from(clients)
      .where(and(eq(clients.id, clientId), eq(clients.workspaceId, workspaceId)))
      .limit(1);
    if (!row) throw new Error("That client is not in this workspace.");
  }
  if (entityId) {
    const [row] = await db
      .select({ id: entities.id })
      .from(entities)
      .where(and(eq(entities.id, entityId), eq(entities.workspaceId, workspaceId)))
      .limit(1);
    if (!row) throw new Error("That entity is not in this workspace.");
  }
}

const connectionFields = z.object({
  name: z.string().trim().min(2, "Give the connection a name.").max(160),
  connectedEntity: z
    .string()
    .trim()
    .max(200)
    .nullable()
    .transform((value) => (value && value.length > 0 ? value : null)),
  clientId: z.string().regex(UUID, "That client is not valid.").nullable(),
  entityId: z.string().regex(UUID, "That entity is not valid.").nullable(),
  datasets: z.array(z.string().trim().min(1).max(80)),
  periodStart: z.string().regex(ISO_DATE, "Use YYYY-MM-DD.").nullable(),
  periodEnd: z.string().regex(ISO_DATE, "Use YYYY-MM-DD.").nullable(),
});

function readConnectionFields(formData: FormData) {
  return connectionFields.safeParse({
    name: str(formData, "name"),
    connectedEntity: optional(formData, "connectedEntity"),
    clientId: optional(formData, "clientId"),
    entityId: optional(formData, "entityId"),
    datasets: many(formData, "datasets"),
    periodStart: optional(formData, "periodStart"),
    periodEnd: optional(formData, "periodEnd"),
  });
}

/**
 * Rejects a provider we cannot honestly connect, and returns the catalog entry.
 *
 * This runs on every write rather than only in the UI: the form for an unavailable provider
 * is never rendered, but a Server Function is reachable by direct POST, so "the button was
 * disabled" is not an access control.
 */
function assertConnectableProvider(providerKey: string) {
  const provider = getProvider(providerKey);
  if (!provider) throw new Error("That integration is not in the catalog.");

  const availability = providerAvailability(provider);
  if (!availability.available) {
    throw new Error(`${provider.name} is not yet available. ${availability.reason}`);
  }
  if (provider.authType !== "api_key" && provider.authType !== "connection_string") {
    // Belt and braces: `providerAvailability` is the single source of truth, and this keeps
    // the narrowing below honest if that list ever widens without the code behind it.
    throw new Error(`${provider.name} cannot be connected with a stored credential.`);
  }
  return provider;
}

/** Datasets must come from the provider's own catalog entry, not from the request body. */
function assertDatasets(providerKey: string, datasets: string[]): string[] {
  const provider = getProvider(providerKey);
  const known = new Set(provider?.datasets ?? []);
  const unknown = datasets.find((dataset) => !known.has(dataset));
  if (unknown) throw new Error(`"${unknown}" is not a dataset ${provider?.name} offers.`);
  return datasets;
}

function assertPeriod(start: string | null, end: string | null): void {
  if (start && end && end < start) {
    throw new Error("The end of the period is before its start.");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Connect
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Stores a credential for a provider whose credential capture is actually built.
 *
 * The resulting connection is `pending`, and the event written beside it says why in words:
 * the secret is encrypted at rest, and nothing has been fetched with it. That is the whole
 * truth of what happened, and it is what the connection page shows.
 */
export async function connectIntegration(formData: FormData): Promise<void> {
  const slug = str(formData, "workspaceSlug");
  const providerKey = str(formData, "providerKey");
  const provider = assertConnectableProvider(providerKey);

  const parsed = readConnectionFields(formData);
  if (!parsed.success) throw new Error(firstIssue(parsed.error));
  const input = parsed.data;

  const credential = str(formData, "credential").trim();
  if (credential.length === 0) {
    throw new Error(
      provider.authType === "api_key"
        ? "Enter the API key. Without it there is nothing to store."
        : "Enter the connection string. Without it there is nothing to store.",
    );
  }

  if (!encryptionAvailable()) {
    throw new Error(
      "Credentials cannot be stored because encryption is not configured on this server. " +
        "An administrator must set APP_ENCRYPTION_KEY.",
    );
  }

  assertDatasets(providerKey, input.datasets);
  assertPeriod(input.periodStart, input.periodEnd);

  const workspace = await workspaceBySlug(slug);
  const { user } = await requirePermission(workspace.id, "integrations.manage");
  await assertClientAndEntity(workspace.id, input.clientId, input.entityId);

  // Encrypt before the transaction: a bad key must fail before anything is written, and the
  // plaintext must not be held across an await that could log or serialise it.
  const encrypted = encryptSecret(credential);
  const hint = credentialHint(credential);

  const connectionId = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(integrationConnections)
      .values({
        workspaceId: workspace.id,
        providerKey,
        name: input.name,
        clientId: input.clientId,
        entityId: input.entityId,
        // Not "connected". We hold a secret; we have never used it.
        status: "pending",
        authType: provider.authType,
        credentialsEncrypted: encrypted,
        credentialsMeta: { hint },
        connectedEntity: input.connectedEntity,
        availableDatasets: input.datasets,
        dataPeriod:
          input.periodStart || input.periodEnd
            ? { start: input.periodStart ?? undefined, end: input.periodEnd ?? undefined }
            : null,
        permissions: [],
        ownerId: user.id,
      })
      .returning({ id: integrationConnections.id });

    await tx.insert(integrationEvents).values({
      workspaceId: workspace.id,
      connectionId: row.id,
      type: "connection.credential_stored",
      message:
        `Credential stored for ${provider.name}, encrypted with AES-256-GCM. It has not been ` +
        "exercised against the provider — no data has been fetched.",
      payload: { providerKey, authType: provider.authType, hint },
    });

    return row.id;
  });

  await logActivity({
    workspaceId: workspace.id,
    action: "integration.connected",
    targetType: "integration_connection",
    targetId: connectionId,
    // Note what is *not* here: no credential, no hint-free echo, nothing decryptable.
    metadata: { providerKey, name: input.name, authType: provider.authType },
  });

  revalidatePath(`/w/${slug}/integrations`);
  // Outside any try/catch: redirect() reports success by throwing.
  redirect(`/w/${slug}/integrations/${connectionId}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Update
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Edits the describable parts of a connection, and optionally *replaces* the credential.
 *
 * Replacement is the only credential operation offered. There is no "show" and no "edit in
 * place", because we cannot show what we will not decrypt for a browser, and a field
 * pre-filled with `••••1234` that silently saves those literal characters is worse than no
 * field at all. Leaving the credential box empty leaves the stored secret untouched.
 */
export async function updateIntegrationConnection(formData: FormData): Promise<void> {
  const slug = str(formData, "workspaceSlug");
  const connectionId = str(formData, "connectionId");
  if (!UUID.test(connectionId)) throw new Error("That connection no longer exists.");

  const parsed = readConnectionFields(formData);
  if (!parsed.success) throw new Error(firstIssue(parsed.error));
  const input = parsed.data;

  const [existing] = await db
    .select()
    .from(integrationConnections)
    .where(eq(integrationConnections.id, connectionId))
    .limit(1);
  if (!existing) throw new Error("That connection no longer exists.");

  const { user } = await requirePermission(existing.workspaceId, "integrations.manage");
  await assertClientAndEntity(existing.workspaceId, input.clientId, input.entityId);

  assertDatasets(existing.providerKey, input.datasets);
  assertPeriod(input.periodStart, input.periodEnd);

  const replacement = str(formData, "credential").trim();
  const replacingCredential = replacement.length > 0;

  if (replacingCredential && !encryptionAvailable()) {
    throw new Error(
      "The credential cannot be replaced because encryption is not configured on this server. " +
        "An administrator must set APP_ENCRYPTION_KEY.",
    );
  }
  if (replacingCredential && existing.status === "disconnected") {
    throw new Error(
      "This connection is disconnected. Create a new connection rather than reviving this one — " +
        "its imports record which credential they were requested under.",
    );
  }

  const encrypted = replacingCredential ? encryptSecret(replacement) : null;
  const hint = replacingCredential ? credentialHint(replacement) : null;

  await db.transaction(async (tx) => {
    await tx
      .update(integrationConnections)
      .set({
        name: input.name,
        clientId: input.clientId,
        entityId: input.entityId,
        connectedEntity: input.connectedEntity,
        availableDatasets: input.datasets,
        dataPeriod:
          input.periodStart || input.periodEnd
            ? { start: input.periodStart ?? undefined, end: input.periodEnd ?? undefined }
            : null,
        ...(replacingCredential && encrypted && hint
          ? {
              credentialsEncrypted: encrypted,
              credentialsMeta: { ...existing.credentialsMeta, hint },
              // A replaced credential is once again one we have never exercised. Saying
              // otherwise would carry the old credential's status onto a new secret.
              status: "pending" as const,
              error: null,
            }
          : {}),
        updatedAt: new Date(),
      })
      // The id is unique; the workspace predicate is what makes a forged id useless.
      .where(
        and(
          eq(integrationConnections.id, connectionId),
          eq(integrationConnections.workspaceId, existing.workspaceId),
        ),
      );

    if (replacingCredential) {
      await tx.insert(integrationEvents).values({
        workspaceId: existing.workspaceId,
        connectionId,
        type: "connection.credential_replaced",
        message:
          "Credential replaced and re-encrypted. The previous secret was overwritten and is " +
          "unrecoverable. The new one has not been exercised against the provider.",
        payload: { hint },
      });
    } else {
      await tx.insert(integrationEvents).values({
        workspaceId: existing.workspaceId,
        connectionId,
        type: "connection.updated",
        message: "Connection details updated. The stored credential was not changed.",
        payload: { name: input.name },
      });
    }
  });

  await logActivity({
    workspaceId: existing.workspaceId,
    action: replacingCredential ? "integration.credential_replaced" : "integration.updated",
    targetType: "integration_connection",
    targetId: connectionId,
    actorId: user.id,
    metadata: { providerKey: existing.providerKey, name: input.name },
  });

  revalidatePath(`/w/${slug}/integrations`);
  revalidatePath(`/w/${slug}/integrations/${connectionId}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Disconnect
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Destroys the stored credential and marks the connection disconnected.
 *
 * The row survives on purpose. Imports already taken under this connection are audit
 * evidence: an audit must always be able to answer "where did this come from", and deleting
 * the connection would cascade those imports away and sever a finished audit from its own
 * provenance. So the secret goes and the history stays.
 */
export async function disconnectIntegration(formData: FormData): Promise<void> {
  const slug = str(formData, "workspaceSlug");
  const connectionId = str(formData, "connectionId");
  if (!UUID.test(connectionId)) throw new Error("That connection no longer exists.");

  const [existing] = await db
    .select({
      id: integrationConnections.id,
      workspaceId: integrationConnections.workspaceId,
      name: integrationConnections.name,
      providerKey: integrationConnections.providerKey,
      status: integrationConnections.status,
      credentialsMeta: integrationConnections.credentialsMeta,
    })
    .from(integrationConnections)
    .where(eq(integrationConnections.id, connectionId))
    .limit(1);
  if (!existing) throw new Error("That connection no longer exists.");

  const { user } = await requirePermission(existing.workspaceId, "integrations.manage");

  if (existing.status === "disconnected") {
    revalidatePath(`/w/${slug}/integrations/${connectionId}`);
    return;
  }

  await db.transaction(async (tx) => {
    await tx
      .update(integrationConnections)
      .set({
        status: "disconnected",
        credentialsEncrypted: null,
        // The hint goes with the secret: it described a credential that no longer exists.
        credentialsMeta: { ...existing.credentialsMeta, hint: undefined },
        nextSyncAt: null,
        error: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(integrationConnections.id, connectionId),
          eq(integrationConnections.workspaceId, existing.workspaceId),
        ),
      );

    await tx.insert(integrationEvents).values({
      workspaceId: existing.workspaceId,
      connectionId,
      type: "connection.disconnected",
      message:
        "Connection disconnected. The stored credential was destroyed. Imports already taken " +
        "under it are unaffected — they are the evidence their audits were built on.",
      payload: {},
    });
  });

  await logActivity({
    workspaceId: existing.workspaceId,
    action: "integration.disconnected",
    targetType: "integration_connection",
    targetId: connectionId,
    actorId: user.id,
    metadata: { providerKey: existing.providerKey, name: existing.name },
  });

  revalidatePath(`/w/${slug}/integrations`);
  revalidatePath(`/w/${slug}/integrations/${connectionId}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Request an audit-scoped import
// ─────────────────────────────────────────────────────────────────────────────

const importFields = z.object({
  connectionId: z.string().regex(UUID, "Choose a connection."),
  auditId: z.string().regex(UUID, "Choose the audit that will receive the data."),
  dataset: z.string().trim().min(1, "Choose which records to import."),
  periodStart: z.string().regex(ISO_DATE, "Use YYYY-MM-DD.").nullable(),
  periodEnd: z.string().regex(ISO_DATE, "Use YYYY-MM-DD.").nullable(),
  mode: z.enum(["snapshot", "refresh_on_revision"], {
    error: "Choose whether this is a one-time snapshot or refreshed for each revision.",
  }),
});

/**
 * Records a request to pull one dataset, for one date range, into one audit (PRD §16.6).
 *
 * The import is created `pending` and stays there: no collector exists for any provider yet,
 * and this function does not pretend to run one. `pending` is the literal truth — the
 * request is recorded, nothing is fetching it — and the UI says so in those words rather
 * than showing a spinner that implies work is underway. Marking it `completed` with a
 * `record_count` we invented would put fabricated evidence inside an audit.
 *
 * What the row does carry is the full shape of the request, so that when a collector does
 * exist it has everything it needs, and so an auditor can see exactly what was asked for.
 */
export async function requestIntegrationImport(formData: FormData): Promise<void> {
  const slug = str(formData, "workspaceSlug");

  const parsed = importFields.safeParse({
    connectionId: str(formData, "connectionId"),
    auditId: str(formData, "auditId"),
    dataset: str(formData, "dataset"),
    periodStart: optional(formData, "periodStart"),
    periodEnd: optional(formData, "periodEnd"),
    mode: str(formData, "mode") || "snapshot",
  });
  if (!parsed.success) throw new Error(firstIssue(parsed.error));
  const input = parsed.data;

  assertPeriod(input.periodStart, input.periodEnd);

  const [connection] = await db
    .select({
      id: integrationConnections.id,
      workspaceId: integrationConnections.workspaceId,
      name: integrationConnections.name,
      providerKey: integrationConnections.providerKey,
      status: integrationConnections.status,
      availableDatasets: integrationConnections.availableDatasets,
    })
    .from(integrationConnections)
    .where(eq(integrationConnections.id, input.connectionId))
    .limit(1);
  if (!connection) throw new Error("That connection no longer exists.");

  const { user } = await requirePermission(connection.workspaceId, "integrations.manage");

  if (connection.status === "disconnected") {
    throw new Error(
      `"${connection.name}" is disconnected — its credential was destroyed. Reconnect it before ` +
        "requesting an import.",
    );
  }

  const offered = connection.availableDatasets;
  if (offered.length > 0 && !offered.includes(input.dataset)) {
    throw new Error(`"${connection.name}" is not set up to provide that dataset.`);
  }
  assertDatasets(connection.providerKey, [input.dataset]);

  // The audit must be this tenant's. Reading it back also gives us its period, which is the
  // thing most worth checking a request against.
  const [audit] = await db
    .select({
      id: audits.id,
      name: audits.name,
      status: audits.status,
      periodStart: audits.periodStart,
      periodEnd: audits.periodEnd,
    })
    .from(audits)
    .where(and(eq(audits.id, input.auditId), eq(audits.workspaceId, connection.workspaceId)))
    .limit(1);
  if (!audit) throw new Error("That audit is not in this workspace.");

  if (audit.status === "archived") {
    throw new Error(`"${audit.name}" is archived. Data cannot be added to it.`);
  }
  if (audit.status === "approved") {
    throw new Error(
      `"${audit.name}" is approved. Its inputs are frozen — adding data means creating a new ` +
        "revision, not changing the one that was signed off.",
    );
  }

  const provider = getProvider(connection.providerKey);

  const importId = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(integrationImports)
      .values({
        workspaceId: connection.workspaceId,
        connectionId: connection.id,
        auditId: audit.id,
        dataset: input.dataset,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        mode: input.mode,
        // No record count and no checksum: we have not read a single record. A zero here
        // would read as "the source is empty", which is a different and false claim.
        recordCount: null,
        snapshotChecksum: null,
        status: "pending",
        requestedBy: user.id,
      })
      .returning({ id: integrationImports.id });

    await tx.insert(integrationEvents).values({
      workspaceId: connection.workspaceId,
      connectionId: connection.id,
      importId: row.id,
      type: "import.requested",
      message:
        `Import requested: ${input.dataset.replace(/_/g, " ")} from ${provider?.name ?? connection.providerKey} ` +
        `into "${audit.name}". No collector is implemented for this provider, so nothing is ` +
        "fetching it — export the data and upload it to the audit instead.",
      payload: {
        dataset: input.dataset,
        auditId: audit.id,
        mode: input.mode,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
      },
    });

    return row.id;
  });

  await logActivity({
    workspaceId: connection.workspaceId,
    action: "integration.import_requested",
    targetType: "integration_import",
    targetId: importId,
    auditId: audit.id,
    actorId: user.id,
    metadata: {
      connectionId: connection.id,
      providerKey: connection.providerKey,
      dataset: input.dataset,
      mode: input.mode,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
    },
  });

  revalidatePath(`/w/${slug}/integrations/${connection.id}`);
  revalidatePath(`/w/${slug}/audits/${audit.id}`);
}
