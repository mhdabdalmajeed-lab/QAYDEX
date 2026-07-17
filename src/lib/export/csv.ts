import {
  CLAIM_LABEL,
  CONFIDENCE_LABEL,
  SEVERITY_LABEL,
  type ExportPayload,
} from "@/lib/export/types";

/**
 * CSV export (PRD §24).
 *
 * One flat table, because that is what CSV honestly is. The findings are the only part of an
 * audit that survives flattening without losing its meaning, so that is what this emits — with
 * the evidence column intact, since a finding without its citation is not the product's output.
 */
export function renderAuditCsv(payload: ExportPayload): Buffer {
  const header = [
    "ref",
    "title",
    "severity",
    "confidence",
    "claim_type",
    "risk_category",
    "status",
    "financial_impact",
    "currency",
    "impact_basis",
    "summary",
    "detail",
    "recommended_followup",
    "recommended_remediation",
    "management_response",
    "affected_periods",
    "affected_entities",
    "affected_accounts",
    "evidence",
    "audit",
    "revision",
    "model",
    "prompt_version",
  ];

  const rows = payload.findings.map((f) => [
    f.key,
    f.title,
    SEVERITY_LABEL[f.severity],
    CONFIDENCE_LABEL[f.confidence],
    CLAIM_LABEL[f.claimType],
    f.riskCategory,
    f.status,
    f.financialImpact === null ? "" : String(f.financialImpact),
    f.financialImpactCurrency ?? "",
    f.impactBasis ?? "",
    f.summary,
    f.detail,
    f.recommendedFollowup ?? "",
    f.recommendedRemediation ?? "",
    f.managementResponse ?? "",
    f.affectedPeriods.join("; "),
    f.affectedEntities.join("; "),
    f.affectedAccounts.join("; "),
    payload.evidence
      .filter((e) => e.findingId === f.id)
      .map((e) => `${e.label}${e.locatorText ? ` (${e.locatorText})` : ""}`)
      .join(" | "),
    payload.audit.name,
    String(payload.provenance.revisionNumber),
    payload.provenance.modelId ?? "",
    payload.provenance.promptVersion ?? "",
  ]);

  const csv = [header, ...rows].map((row) => row.map(escape).join(",")).join("\r\n");
  // A BOM so Excel opens UTF-8 correctly; account names are full of non-ASCII.
  return Buffer.from(`﻿${csv}`, "utf8");
}

function escape(value: string): string {
  const needsQuotes = /[",\r\n]/.test(value);
  const escaped = value.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}
