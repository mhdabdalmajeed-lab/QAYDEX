import type { AuditBlock } from "@/lib/ai/blocks/schemas";
import type {
  BlockType,
  ClaimType,
  Confidence,
  RiskLevel,
  Severity,
} from "@/lib/ai/blocks/types";
import type {
  EvidenceLocator,
  InstructionSnapshotEntry,
  exportFormatEnum,
  exportKindEnum,
} from "@/db/schema";

/**
 * The export contract (PRD §24).
 *
 * Every format — PDF, DOCX, XLSX, CSV, HTML — renders from the *same* payload, loaded once by
 * `@/lib/export/data`. That is deliberate: a management letter in Word and the same letter in
 * PDF must not be able to disagree about a number, a severity, or a citation because two
 * loaders drifted apart.
 *
 * The payload is a pure data structure with no database or React types in it, so a renderer
 * cannot reach past it and quietly query something the caller did not authorise.
 */

export type ExportKind = (typeof exportKindEnum.enumValues)[number];
export type ExportFormat = (typeof exportFormatEnum.enumValues)[number];

export const EXPORT_KINDS = [
  "full_report",
  "executive_summary",
  "findings",
  "management_letter",
  "remediation_plan",
  "evidence_appendix",
  "blocks",
  "activity",
  "instructions",
  "input_list",
] as const satisfies readonly ExportKind[];

export const EXPORT_FORMATS = ["pdf", "docx", "xlsx", "csv", "html"] as const satisfies readonly ExportFormat[];

export type ExportKindMeta = {
  kind: ExportKind;
  label: string;
  description: string;
  /** Formats that can express this kind honestly. A chart-heavy report has no meaningful CSV. */
  formats: readonly ExportFormat[];
};

/**
 * Which formats each deliverable is offered in. The restrictions are editorial, not technical:
 * we would rather not offer a management letter as a spreadsheet than ship one that reads as
 * a table of fragments.
 */
export const EXPORT_KIND_META: readonly ExportKindMeta[] = [
  {
    kind: "full_report",
    label: "Full audit report",
    description:
      "Every block the reviewer chose to include, in the order the model published them — narrative, charts, tables, findings and the evidence behind each one.",
    formats: ["pdf", "docx", "html", "xlsx"],
  },
  {
    kind: "executive_summary",
    label: "Executive summary",
    description:
      "The summary, the overall risk rating and the conclusion only. For a reader who will not open the detail.",
    formats: ["pdf", "docx", "html"],
  },
  {
    kind: "findings",
    label: "Findings report",
    description:
      "Every finding with its severity, confidence, impact, evidence and recommended remediation. No narrative frame.",
    formats: ["pdf", "docx", "xlsx", "csv", "html"],
  },
  {
    kind: "management_letter",
    label: "Management letter",
    description:
      "Criteria, condition, cause, effect and recommendation for each point put to management.",
    formats: ["pdf", "docx", "html"],
  },
  {
    kind: "remediation_plan",
    label: "Remediation plan",
    description:
      "Recommendations and action plans with owners, priorities and target timeframes, tied back to the findings that produced them.",
    formats: ["pdf", "docx", "xlsx", "csv", "html"],
  },
  {
    kind: "evidence_appendix",
    label: "Evidence appendix",
    description:
      "Every citation in the revision, resolved to the input and the exact location inside it.",
    formats: ["pdf", "docx", "xlsx", "csv", "html"],
  },
  {
    kind: "blocks",
    label: "Selected blocks",
    description: "Only the blocks you pick, rendered exactly as they appear in the audit.",
    formats: ["pdf", "docx", "html", "xlsx"],
  },
  {
    kind: "activity",
    label: "Audit activity history",
    description: "The audit trail for this audit: who did what, when, and from where (PRD §25.3).",
    formats: ["pdf", "docx", "xlsx", "csv", "html"],
  },
  {
    kind: "instructions",
    label: "Audit instructions",
    description:
      "The exact instruction set this revision was run against, with sources, versions and priority order.",
    formats: ["pdf", "docx", "xlsx", "csv", "html"],
  },
  {
    kind: "input_list",
    label: "Audit input list",
    description:
      "Every input attached to the audit: kind, status, detected periods, row counts, checksums and warnings.",
    formats: ["pdf", "docx", "xlsx", "csv", "html"],
  },
];

export function kindMeta(kind: ExportKind): ExportKindMeta {
  const meta = EXPORT_KIND_META.find((m) => m.kind === kind);
  // The list above is exhaustive over the enum; this is a guard, not a fallback.
  if (!meta) throw new Error(`Unknown export kind: ${kind}`);
  return meta;
}

export function formatIsAllowed(kind: ExportKind, format: ExportFormat): boolean {
  return kindMeta(kind).formats.includes(format);
}

export const FORMAT_META: Record<
  ExportFormat,
  { label: string; extension: string; contentType: string }
> = {
  pdf: { label: "PDF", extension: "pdf", contentType: "application/pdf" },
  docx: {
    label: "Word (DOCX)",
    extension: "docx",
    contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  },
  xlsx: {
    label: "Excel (XLSX)",
    extension: "xlsx",
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  },
  csv: { label: "CSV", extension: "csv", contentType: "text/csv; charset=utf-8" },
  html: { label: "HTML", extension: "html", contentType: "text/html; charset=utf-8" },
};

/* -------------------------------------------------------------------------- */
/* Options                                                                    */
/* -------------------------------------------------------------------------- */

export type ExportOptions = {
  /** Evidence citations and the appendix that resolves them. Off produces a redacted report. */
  includeEvidence: boolean;
  /** Draw charts. Off falls back to the same numbers as tables — never to nothing. */
  includeCharts: boolean;
  /** Reviewer comments and narrative overrides — internal by default (PRD §21.2). */
  includeInternalNotes: boolean;
  includeActivity: boolean;
  includeInstructions: boolean;
  includeInputList: boolean;
  /** Only meaningful for kind "blocks". Null means "whatever the kind implies". */
  blockIds: string[] | null;
};

export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  includeEvidence: true,
  includeCharts: true,
  includeInternalNotes: false,
  includeActivity: false,
  includeInstructions: false,
  includeInputList: false,
  blockIds: null,
};

/* -------------------------------------------------------------------------- */
/* Payload                                                                    */
/* -------------------------------------------------------------------------- */

export type ExportBranding = {
  /** Hex, e.g. "#1f4ed8". Renderers must tolerate absence rather than invent a colour. */
  primaryColor: string | null;
  logoUrl: string | null;
  footer: string | null;
};

export type ExportOrganisation = {
  id: string;
  name: string;
  type: "internal" | "firm";
  baseCurrency: string;
  branding: ExportBranding;
};

/** Present only for audit-firm work, where the client's own brand goes on the deliverable. */
export type ExportClient = {
  id: string;
  name: string;
  industry: string | null;
  branding: ExportBranding;
};

export type ExportEvidence = {
  id: string;
  label: string;
  excerpt: string | null;
  locator: EvidenceLocator;
  /** The locator as an auditor would write it in a working paper, e.g. "sheet Jan · rows 44-51". */
  locatorText: string;
  inputId: string;
  inputName: string;
  inputKind: "file" | "text" | "integration";
  inputFileName: string | null;
  /** SHA-256 of the uploaded bytes. This is what makes a citation reproducible. */
  inputChecksum: string | null;
  documentId: string | null;
  documentName: string | null;
  findingId: string | null;
  blockId: string | null;
};

export type ExportBlock = {
  id: string;
  type: BlockType;
  position: number;
  title: string;
  /**
   * The validated block. Null when the stored JSON no longer satisfies its schema — a
   * revision is immutable, but the schema can move under it, and a renderer must say so
   * rather than silently print half a block.
   */
  block: AuditBlock | null;
  invalidReason: string | null;
  /** Set when the block failed to generate. Recorded, never dropped (PRD §26.3). */
  error: string | null;
  /** A reviewer's replacement prose. Only surfaced when internal notes are included. */
  narrativeOverride: string | null;
  evidence: ExportEvidence[];
};

export type ExportFinding = {
  id: string;
  key: string;
  title: string;
  summary: string;
  detail: string;
  riskCategory: string;
  severity: Severity;
  confidence: Confidence;
  confidenceNote: string | null;
  claimType: ClaimType;
  financialImpact: number | null;
  financialImpactCurrency: string | null;
  impactBasis: string | null;
  affectedPeriods: string[];
  affectedEntities: string[];
  affectedAccounts: string[];
  potentialExplanations: string[];
  recommendedFollowup: string | null;
  recommendedRemediation: string | null;
  instructionsReferenced: string[];
  position: number;
  status: "open" | "in_progress" | "accepted" | "disputed" | "resolved";
  ownerName: string | null;
  dueDate: string | null;
  managementResponse: string | null;
  evidence: ExportEvidence[];
};

export type ExportInput = {
  id: string;
  kind: "file" | "text" | "integration";
  name: string;
  description: string | null;
  status: "pending" | "parsing" | "parsed" | "failed" | "unsupported";
  fileName: string | null;
  fileSize: number | null;
  mimeType: string | null;
  checksum: string | null;
  periods: string[];
  currencies: string[];
  entities: string[];
  rowCount: number | null;
  warnings: { code: string; message: string; severity: Severity }[];
  documentCount: number;
  addedAt: string;
  /** Removed inputs stay listed: the revision that used them must remain reproducible. */
  removedAt: string | null;
  /** True when this input actually fed the revision being exported. */
  usedInRevision: boolean;
};

export type ExportActivityEntry = {
  id: string;
  at: string;
  actorEmail: string | null;
  action: string;
  targetType: string | null;
  metadata: Record<string, unknown>;
};

export type ExportComment = {
  id: string;
  authorEmail: string | null;
  body: string;
  at: string;
  resolved: boolean;
  findingId: string | null;
  blockId: string | null;
};

export type ExportInstruction = InstructionSnapshotEntry;

/**
 * Provenance. Every export carries this so a reader can tell exactly which model, prompt and
 * schema produced the words in front of them (PRD §23, §31).
 */
export type ExportProvenance = {
  modelId: string | null;
  promptVersion: string | null;
  schemaVersion: string | null;
  revisionNumber: number;
  revisionStatus: "draft" | "processing" | "completed" | "failed" | "approved";
  generatedAt: string;
  generatedByEmail: string | null;
  approvedAt: string | null;
  approvedByEmail: string | null;
  qualityScore: number | null;
  qualityPassed: boolean | null;
};

export type ExportAudit = {
  id: string;
  name: string;
  objective: string | null;
  scope: string | null;
  domain: string;
  subcategory: string | null;
  periodLabel: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  status: string;
  overallRisk: RiskLevel | null;
  entityName: string | null;
  creatorEmail: string | null;
  reviewerEmail: string | null;
  createdAt: string;
};

export type ExportPayload = {
  kind: ExportKind;
  options: ExportOptions;
  organisation: ExportOrganisation;
  client: ExportClient | null;
  audit: ExportAudit;
  provenance: ExportProvenance;
  summary: string | null;
  /** Blocks the reviewer chose to include, ordered as published. */
  blocks: ExportBlock[];
  /** Blocks excluded by `block_states`, kept only so a report can be honest about the count. */
  excludedBlockCount: number;
  findings: ExportFinding[];
  evidence: ExportEvidence[];
  inputs: ExportInput[];
  instructions: ExportInstruction[];
  activity: ExportActivityEntry[];
  comments: ExportComment[];
};

/* -------------------------------------------------------------------------- */
/* Standing text                                                              */
/* -------------------------------------------------------------------------- */

/**
 * The disclaimer (PRD §4, §31).
 *
 * An exported audit leaves the platform and can end up in a board pack. It must never read as
 * a licensed opinion, so this appears on every deliverable regardless of format — it is not a
 * per-renderer decision and there is no option to suppress it.
 */
export const PROFESSIONAL_REVIEW_DISCLAIMER = {
  heading: "Professional review required",
  body: [
    "This document was produced by an AI audit workspace from the inputs and instructions recorded in it. It is analysis and working-paper support, not a statutory audit opinion, an assurance report, or accounting, legal or tax advice.",
    "No conclusion here has been signed by a qualified professional by virtue of appearing in this document. Every finding must be reviewed, corroborated against its cited source, and accepted or rejected by a suitably qualified person before anyone relies on it.",
    "Statements are labelled with the weight they carry — evidence-supported, interpretation, unverified hypothesis, missing information, stated by user, or judgment required. Anything not labelled evidence-supported has not been tied to a source in the inputs.",
  ],
} as const;

export const SEVERITY_LABEL: Record<Severity, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
  info: "Info",
};

/**
 * The severity mark. Severity is never colour alone (PRD §26.4), so every renderer prints the
 * glyph and the word; the colour is decoration on top of a signal that already works without it.
 * The glyphs are chosen from the WGL4 set so they survive PDF core fonts, Word and plain CSV.
 */
export const SEVERITY_GLYPH: Record<Severity, string> = {
  critical: "◆", // ◆ filled diamond
  high: "▲", // ▲ filled triangle
  medium: "△", // △ open triangle
  low: "○", // ○ open circle
  info: "●", // ● filled circle
};

export const SEVERITY_COLOR: Record<Severity, string> = {
  critical: "#b42318",
  high: "#c4320a",
  medium: "#b54708",
  low: "#475467",
  info: "#475467",
};

export const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

export const CLAIM_LABEL: Record<ClaimType, string> = {
  evidence_supported: "Evidence-supported",
  reasonable_interpretation: "Interpretation",
  unverified_hypothesis: "Unverified hypothesis",
  missing_information: "Missing information",
  user_claim: "Stated by user",
  judgment_required: "Judgment required",
};

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  high: "High confidence",
  medium: "Medium confidence",
  low: "Low confidence",
};

export const RISK_LABEL: Record<RiskLevel, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
  none: "None",
};

export const FINDING_STATUS_LABEL: Record<ExportFinding["status"], string> = {
  open: "Open",
  in_progress: "In progress",
  accepted: "Accepted",
  disputed: "Disputed",
  resolved: "Resolved",
};

/* -------------------------------------------------------------------------- */
/* Shared formatting                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Deliberately locale-fixed. An export is a document that gets emailed on; it must not read
 * differently depending on which server rendered it.
 */
export function fmtNumber(value: number, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat("en-GB", { maximumFractionDigits }).format(value);
}

export function fmtMoney(amount: number, currency: string | null): string {
  const code = currency ?? "USD";
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: code,
      maximumFractionDigits: Math.abs(amount) >= 1000 ? 0 : 2,
    }).format(amount);
  } catch {
    // An unrecognised ISO code must not blank out a financial figure.
    return `${code} ${fmtNumber(amount)}`;
  }
}

export function fmtPercent(value: number): string {
  return `${fmtNumber(value, 1)}%`;
}

export function fmtDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(date);
}

export function fmtDateTime(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function fmtCell(
  value: string | number | boolean | null,
  format: "text" | "number" | "currency" | "percent" | "date" | null,
  currency: string | null,
): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") {
    switch (format) {
      case "currency":
        return fmtMoney(value, currency);
      case "percent":
        return fmtPercent(value);
      case "date":
        return fmtDate(String(value));
      default:
        return fmtNumber(value);
    }
  }
  if (format === "date") return fmtDate(value);
  return value;
}

export function fmtFileSize(bytes: number | null): string {
  if (bytes === null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${fmtNumber(bytes / 1024, 1)} KB`;
  return `${fmtNumber(bytes / 1024 / 1024, 1)} MB`;
}

/** Turns an activity action key into the sentence an administrator reads in the trail. */
export function humanizeAction(action: string): string {
  const sentence = action.replace(/[._]/g, " ");
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

/** A safe, predictable download name. */
export function exportFileName(payload: ExportPayload, format: ExportFormat): string {
  const slug = payload.audit.name
    .normalize("NFKD")
    .replace(/[^\w\s-]+/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase()
    .slice(0, 60);
  const kindSlug = payload.kind.replace(/_/g, "-");
  const rev = `r${payload.provenance.revisionNumber}`;
  return `${slug || "audit"}-${kindSlug}-${rev}.${FORMAT_META[format].extension}`;
}
