import type { AuthType, IntegrationProvider } from "@/lib/integrations/catalog";

/**
 * What the product can *honestly* do with each provider today.
 *
 * This file exists because an audit tool must not lie about its own inputs. The catalog
 * describes 50+ providers, but no OAuth client, no bank file poller and no vendor API
 * client has been built. Showing a "Connect" button for QuickBooks that produced a
 * "Connected" badge would fabricate provenance for evidence — precisely the failure the
 * whole product exists to catch. So the flow is modelled end to end, and the providers
 * whose transport does not exist are disabled and labelled, not faked.
 *
 * The dividing line is the auth type, because it maps exactly onto what is implemented:
 *
 *  - `api_key` / `connection_string` — the user hands us a secret directly. Storing it
 *    encrypted is a real, complete operation with no third party involved, so these are
 *    genuinely usable. What still does not exist is the *fetcher*, which is why a stored
 *    credential yields `pending` rather than `connected` (see `src/server/actions/integration.ts`).
 *  - `oauth2` — needs a registered app, redirect URI, token exchange and refresh loop.
 *  - `basic` — needs a live client against SAP/Oracle to mean anything.
 *  - `file_transfer` — needs an SFTP poller and MT940/BAI2/CAMT parsing.
 */

/** Auth types whose credential capture is fully implemented. */
const IMPLEMENTED_AUTH_TYPES: readonly AuthType[] = ["api_key", "connection_string"];

export type ProviderAvailability =
  | { available: true; reason: null }
  | { available: false; reason: string };

const UNAVAILABLE_REASON: Record<AuthType, string> = {
  oauth2:
    "The OAuth flow for this provider has not been built yet. Export the data you need and upload it to the audit instead.",
  basic:
    "A live client for this system has not been built yet. Export the data you need and upload it to the audit instead.",
  file_transfer:
    "Scheduled file collection has not been built yet. Upload the statement or export directly to the audit instead.",
  api_key: "",
  connection_string: "",
};

export function providerAvailability(provider: IntegrationProvider): ProviderAvailability {
  if (IMPLEMENTED_AUTH_TYPES.includes(provider.authType)) {
    return { available: true, reason: null };
  }
  return { available: false, reason: UNAVAILABLE_REASON[provider.authType] };
}

export function isProviderAvailable(provider: IntegrationProvider): boolean {
  return providerAvailability(provider).available;
}

/** What we ask the user for, per auth type. Only implemented types have a form. */
export const CREDENTIAL_FIELD: Record<
  "api_key" | "connection_string",
  { label: string; placeholder: string; help: string }
> = {
  api_key: {
    label: "API key",
    placeholder: "sk_live_…",
    help: "Stored encrypted with AES-256-GCM. It is never shown again and never sent to the browser.",
  },
  connection_string: {
    label: "Connection string",
    placeholder: "postgresql://user:password@host:5432/database",
    help: "Stored encrypted with AES-256-GCM. Use a read-only role — Caydex only ever reads.",
  },
};

export function credentialField(authType: AuthType) {
  return authType === "api_key" || authType === "connection_string"
    ? CREDENTIAL_FIELD[authType]
    : null;
}

export const AUTH_TYPE_LABELS: Record<AuthType, string> = {
  oauth2: "OAuth",
  api_key: "API key",
  basic: "Username and password",
  connection_string: "Connection string",
  file_transfer: "File transfer",
};

/**
 * Human labels for `connection_status`. Note that `pending` is not a spinner: it is the
 * resting state of a connection whose credential we hold but have never been able to
 * exercise against the provider, and it says so.
 */
export const CONNECTION_STATUS_LABELS = {
  connected: "Connected",
  pending: "Credential stored",
  error: "Error",
  disconnected: "Disconnected",
} as const;

export const CONNECTION_STATUS_DESCRIPTIONS = {
  connected: "Caydex has exercised this credential against the provider.",
  pending:
    "The credential is stored and encrypted, but it has not been exercised against the provider — no data has been fetched.",
  error: "The last operation on this connection failed.",
  disconnected: "This connection has been disconnected. Its stored credential was destroyed.",
} as const;

/** Dataset keys are snake_case in the catalog; this is the only place that changes. */
export function datasetLabel(dataset: string): string {
  return dataset.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}
