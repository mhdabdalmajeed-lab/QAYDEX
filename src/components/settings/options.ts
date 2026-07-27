import { memberRoleEnum } from "@/db/schema";
import type { MemberRole, Permission } from "@/lib/auth/guards";

/**
 * The vocabulary the Settings section reads and writes.
 *
 * Shared verbatim between the forms and `@/server/actions/settings`, so a value the UI can
 * offer is always a value the action will accept. Nothing here is decorative: every list is
 * either an enum from the database or a set the runtime genuinely recognises.
 */

export const ROLE_LABELS: Record<MemberRole, string> = {
  owner: "Workspace owner",
  admin: "Administrator",
  finance_manager: "Finance manager",
  internal_auditor: "Internal auditor",
  auditor: "Auditor",
  reviewer: "Reviewer",
  approver: "Approver",
  contributor: "Contributor",
  read_only: "Read-only user",
  client_user: "Client user",
};

/** PRD §21.1's ten roles, ordered from most to least authority. */
export const ROLE_ORDER: MemberRole[] = [...memberRoleEnum.enumValues];

export function isMemberRole(value: string): value is MemberRole {
  return (memberRoleEnum.enumValues as readonly string[]).includes(value);
}

/**
 * What a permission means in a sentence. The *capability* list per role is never written by
 * hand — it is read from `ROLE_PERMISSIONS` through `roleHas()` — but a permission key like
 * `audits.run` still needs prose, and this is that prose and nothing more.
 */
export const PERMISSION_LABELS: Record<Permission, string> = {
  "workspace.manage": "Change workspace details and AI data controls",
  "members.manage": "Invite members, change roles, remove members",
  "clients.manage": "Create and remove clients and entities",
  "audits.view": "Open audits and read their findings",
  "audits.create": "Create audits",
  "audits.run": "Run an audit against the model",
  "audits.edit": "Edit audit details and evidence",
  "audits.review": "Review an audit and record review notes",
  "audits.approve": "Approve a completed audit",
  "audits.delete": "Delete audits",
  "audits.export": "Export audits to PDF, Excel and CSV",
  "audits.share": "Create share links to an audit",
  "findings.assign": "Assign findings to a member",
  "findings.respond": "Add management responses to findings",
  "comments.create": "Comment on findings and audits",
  "integrations.manage": "Connect and configure integrations",
  "chat.use": "Use AI chat",
  "activity.view": "Read the workspace audit trail",
  "models.approve": "Approve, deprecate and default the models audits run on",
};

/** How each permission is grouped in the role matrix, so the table reads in themes. */
export const PERMISSION_GROUPS: { title: string; permissions: Permission[] }[] = [
  {
    title: "Administration",
    permissions: ["workspace.manage", "members.manage", "clients.manage", "models.approve", "activity.view"],
  },
  {
    title: "Audit work",
    permissions: [
      "audits.view",
      "audits.create",
      "audits.edit",
      "audits.run",
      "audits.delete",
    ],
  },
  {
    title: "Review and sign-off",
    permissions: ["audits.review", "audits.approve", "findings.assign", "findings.respond", "comments.create"],
  },
  {
    title: "Library and output",
    permissions: [
      "integrations.manage",
      "audits.export",
      "audits.share",
      "chat.use",
    ],
  },
];

// ── AI data controls (PRD §25.2) ─────────────────────────────────────────────

/**
 * The only provider this deployment can reach: `@/lib/ai/client` constructs an OpenAI client
 * and nothing else. Offering a longer menu would let an administrator "permit" a provider the
 * platform cannot call, which is a lie in a compliance setting.
 */
export const AI_PROVIDERS = [
  {
    value: "openai",
    label: "OpenAI",
    description: "The only provider this deployment is wired to. Audits and chat call its API.",
  },
] as const;

/**
 * Regions are a recorded policy statement, not a routing switch: the platform calls the
 * provider from wherever the server runs, and does not select a processing region per
 * request. Recorded so an administrator can state the policy the deployment must satisfy.
 */
export const AI_REGIONS = [
  { value: "us", label: "United States" },
  { value: "eu", label: "European Union" },
  { value: "uk", label: "United Kingdom" },
  { value: "apac", label: "Asia-Pacific" },
] as const;

/** The file formats `@/lib/parsing` actually has a parser for. */
export const FILE_TYPES = [
  { value: "spreadsheet", label: "Spreadsheets", detail: "xlsx, xlsm, xls, ods" },
  { value: "csv", label: "Delimited text", detail: "csv, tsv" },
  { value: "pdf", label: "PDF", detail: "pdf" },
  { value: "docx", label: "Word documents", detail: "docx" },
  { value: "text", label: "Plain text", detail: "txt, md" },
  { value: "json", label: "JSON", detail: "json, ld+json" },
  { value: "xml", label: "XML and HTML", detail: "xml, html" },
  { value: "zip", label: "Archives", detail: "zip" },
  { value: "image", label: "Images", detail: "png, jpg, webp, tiff" },
] as const;

export const AI_PROVIDER_VALUES = AI_PROVIDERS.map((p) => p.value);
export const AI_REGION_VALUES = AI_REGIONS.map((r) => r.value);
export const FILE_TYPE_VALUES = FILE_TYPES.map((f) => f.value);

// ── Model governance (PRD §23) ───────────────────────────────────────────────

export const MODEL_STATUS_LABELS = {
  approved: "Approved",
  candidate: "Candidate",
  deprecated: "Deprecated",
} as const;

export const MODEL_STATUS_DESCRIPTIONS = {
  approved: "Audits may run on this model. It can be made the workspace default.",
  candidate: "Under evaluation. Audits never select it.",
  deprecated: "Withdrawn. Kept so audits that ran on it stay readable and comparable.",
} as const;
