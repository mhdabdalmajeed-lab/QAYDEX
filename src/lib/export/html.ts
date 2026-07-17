import { sceneForBlock } from "@/lib/export/scenes";
import type { ChartScene } from "@/lib/export/chart-geometry";
import {
  CLAIM_LABEL,
  CONFIDENCE_LABEL,
  PROFESSIONAL_REVIEW_DISCLAIMER,
  RISK_LABEL,
  SEVERITY_COLOR,
  SEVERITY_GLYPH,
  SEVERITY_LABEL,
  fmtDateTime,
  fmtMoney,
  fmtNumber,
  humanizeAction,
  type ExportPayload,
} from "@/lib/export/types";
import type { AuditBlock } from "@/lib/ai/blocks/schemas";

/**
 * HTML export (PRD §24).
 *
 * Self-contained by design: one file, inline CSS, inline SVG, no network requests. An audit
 * report that phones out for a stylesheet is useless the moment it is emailed or archived — and
 * an archived audit that renders differently in five years' time is worse than useless.
 *
 * Charts are the same geometry the PDF uses, emitted as inline SVG.
 */
export function renderAuditHtml(payload: ExportPayload): Buffer {
  const { audit, organisation, provenance } = payload;
  const brand = organisation.branding.primaryColor ?? "#3f3f46";

  const meta: [string, string][] = [
    ["Organisation", organisation.name],
    ...(payload.client ? ([["Client", payload.client.name]] as [string, string][]) : []),
    ["Period", audit.periodLabel ?? [audit.periodStart, audit.periodEnd].filter(Boolean).join(" to ") ?? "Not specified"],
    ["Entity", audit.entityName ?? "Not specified"],
    ["Overall risk", audit.overallRisk ? RISK_LABEL[audit.overallRisk] : "Not assessed"],
    ["Revision", `${provenance.revisionNumber} (${provenance.revisionStatus})`],
    ["Model", provenance.modelId ?? "Not recorded"],
    ["Prompt version", provenance.promptVersion ?? "Not recorded"],
    ["Generated", fmtDateTime(provenance.generatedAt)],
  ];

  const body = `
<header class="cover">
  <div class="brand"></div>
  <p class="kind">${esc(payload.kind.replace(/_/g, " "))}</p>
  <h1>${esc(audit.name)}</h1>
  ${audit.objective ? `<p class="muted">${esc(audit.objective)}</p>` : ""}
  <dl class="meta">
    ${meta.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}
  </dl>
</header>

${
  provenance.qualityPassed === false
    ? `<section class="callout danger">
        <h2>This revision did not pass quality review</h2>
        <p>The platform's own review pass scored this audit ${provenance.qualityScore ?? "n/a"} and did not pass it.
        The contents below are reproduced exactly as generated so they can be checked — treat them as a draft to
        verify, not as conclusions to act on.</p>
      </section>`
    : ""
}

<section class="callout">
  <h2>${esc(PROFESSIONAL_REVIEW_DISCLAIMER.heading)}</h2>
  ${PROFESSIONAL_REVIEW_DISCLAIMER.body.map((p) => `<p>${esc(p)}</p>`).join("")}
</section>

${payload.summary ? `<section><h2>Executive summary</h2><p>${esc(payload.summary)}</p></section>` : ""}

${
  payload.blocks.length
    ? `<section><h2>Audit</h2>${payload.blocks.map(renderBlock).join("")}
       ${
         payload.excludedBlockCount
           ? `<p class="muted small">${payload.excludedBlockCount} block${payload.excludedBlockCount === 1 ? " was" : "s were"} excluded from this report by a reviewer.</p>`
           : ""
       }
      </section>`
    : ""
}

${
  payload.findings.length
    ? `<section><h2>Findings (${payload.findings.length})</h2>
       ${payload.findings.map((f) => renderFinding(f, payload)).join("")}</section>`
    : ""
}

${
  payload.options.includeEvidence && payload.evidence.length
    ? `<section><h2>Evidence appendix</h2>
        <p class="muted">Every citation in this report, with the exact location it points at.</p>
        ${table(
          ["Source", "Location", "Excerpt", "Input"],
          payload.evidence.map((e) => [e.label, e.locatorText || "—", e.excerpt ?? "—", e.inputName]),
        )}
      </section>`
    : ""
}

${
  payload.options.includeInputList && payload.inputs.length
    ? `<section><h2>Inputs</h2>
        ${table(
          ["Input", "Kind", "Status", "Detected period"],
          payload.inputs.map((i) => [i.name, i.kind, i.status, i.periods.join(", ") || "Not determined"]),
        )}
      </section>`
    : ""
}

${
  payload.options.includeInstructions && payload.instructions.length
    ? `<section><h2>Instructions used</h2>
        <p class="muted">The exact instruction set this revision was generated against, in authority order.</p>
        ${payload.instructions
          .map(
            (i, n) => `<article class="card">
              <h3>${n + 1}. ${esc(i.name)}${i.version ? ` (v${i.version})` : ""}</h3>
              <p class="muted small">${esc(i.source)}${i.mandatory ? " · mandatory" : ""}</p>
              <pre>${esc(i.text)}</pre>
            </article>`,
          )
          .join("")}
      </section>`
    : ""
}

${
  payload.options.includeActivity && payload.activity.length
    ? `<section><h2>Activity history</h2>
        ${table(
          ["When", "Who", "Action"],
          payload.activity.map((a) => [fmtDateTime(a.at), a.actorEmail ?? "System", humanizeAction(a.action)]),
        )}
      </section>`
    : ""
}

<footer>
  <p class="muted small">
    ${esc(organisation.branding.footer ?? `${organisation.name} · ${audit.name}`)} ·
    Revision ${provenance.revisionNumber} · ${esc(provenance.modelId ?? "model n/a")} ·
    prompt ${esc(provenance.promptVersion ?? "n/a")} · generated ${esc(fmtDateTime(provenance.generatedAt))}
  </p>
</footer>`;

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(audit.name)} — ${esc(payload.kind.replace(/_/g, " "))}</title>
<style>
  :root { --brand: ${brand}; --ink: #18181b; --muted: #71717a; --line: #e4e4e7; --soft: #fafafa; }
  * { box-sizing: border-box; }
  body { margin: 0 auto; padding: 40px 24px 80px; max-width: 900px; color: var(--ink); background: #fff;
         font: 15px/1.6 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  h1 { font-size: 30px; line-height: 1.2; margin: 8px 0 12px; }
  h2 { font-size: 19px; margin: 28px 0 10px; }
  h3 { font-size: 15px; margin: 0 0 4px; }
  p { margin: 0 0 10px; }
  .brand { height: 4px; background: var(--brand); border-radius: 2px; margin-bottom: 20px; }
  .kind { text-transform: uppercase; letter-spacing: 1.4px; font-size: 12px; color: var(--muted); margin: 0; }
  .muted { color: var(--muted); }
  .small { font-size: 12px; }
  .meta { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin: 20px 0 0; }
  .meta dt { font-size: 11px; text-transform: uppercase; letter-spacing: .6px; color: var(--muted); }
  .meta dd { margin: 2px 0 0; }
  .callout { border: 1px solid #f5d0a9; background: #fffaf3; border-radius: 8px; padding: 14px 16px; margin: 20px 0; }
  .callout.danger { border-color: #fca5a5; background: #fef2f2; }
  .callout h2 { margin: 0 0 6px; font-size: 15px; }
  .card { border: 1px solid var(--line); border-radius: 8px; padding: 14px 16px; margin: 0 0 12px; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; margin: 6px 0 10px; }
  .chip { border: 1px solid var(--line); border-radius: 4px; padding: 2px 6px; font-size: 11px; color: var(--muted); }
  .sev { font-weight: 600; font-size: 12px; }
  .evidence { font-size: 12px; color: var(--muted); margin-top: 8px; }
  .no-evidence { font-size: 12px; color: #b45309; margin-top: 8px; }
  /* Wide tables scroll inside their own container rather than the page. */
  .table-wrap { overflow-x: auto; border: 1px solid var(--line); border-radius: 8px; margin: 10px 0; }
  table { border-collapse: collapse; width: 100%; font-size: 13px; }
  th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .5px; color: var(--muted);
       padding: 8px 10px; background: var(--soft); border-bottom: 1px solid var(--line); white-space: nowrap; }
  td { padding: 7px 10px; border-bottom: 1px solid var(--line); vertical-align: top; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; }
  tr:last-child td { border-bottom: 0; }
  pre { white-space: pre-wrap; font: 12px/1.5 ui-monospace, monospace; background: var(--soft);
        border: 1px solid var(--line); border-radius: 6px; padding: 10px; margin: 6px 0 0; }
  svg { max-width: 100%; height: auto; }
  footer { margin-top: 40px; border-top: 1px solid var(--line); padding-top: 10px; }
  @media print { body { padding: 0; max-width: none; } .card, .callout { break-inside: avoid; } }
</style>
</head>
<body>${body}</body>
</html>`;

  return Buffer.from(html, "utf8");
}

function renderBlock(block: ExportPayload["blocks"][number]): string {
  if (!block.block) {
    return `<article class="card">
      <h3>${esc(block.title)}</h3>
      <p class="no-evidence">This block could not be rendered: ${esc(block.invalidReason ?? block.error ?? "unknown reason")}</p>
    </article>`;
  }

  const value = block.block;
  const scene = sceneForBlock(value, { width: 760, height: 280 });
  const prose = ["headline", "narrative", "message", "body"]
    .map((key) => (key in value ? (value as unknown as Record<string, unknown>)[key] : null))
    .filter((v): v is string => typeof v === "string")
    .map((v) => `<p>${esc(v)}</p>`)
    .join("");

  return `<article class="card">
    <div class="chips">
      <strong style="flex:1">${esc(block.title)}</strong>
      ${"severity" in value && value.severity ? `<span class="sev" style="color:${SEVERITY_COLOR[value.severity]}">${SEVERITY_GLYPH[value.severity]} ${SEVERITY_LABEL[value.severity]}</span>` : ""}
      <span class="chip">${esc(CLAIM_LABEL[value.claimType])}</span>
    </div>
    ${prose}
    ${scene ? svg(scene) : ""}
    ${renderBlockTable(value)}
    ${value.commentary ? `<p class="muted small">${esc(value.commentary)}</p>` : ""}
    ${block.narrativeOverride ? `<p class="small"><strong>Reviewer note:</strong> ${esc(block.narrativeOverride)}</p>` : ""}
    ${
      value.evidence.length
        ? `<p class="evidence">Evidence: ${value.evidence.map((e) => esc(e.label)).join(" · ")}</p>`
        : ""
    }
  </article>`;
}

function renderBlockTable(value: AuditBlock): string {
  if (!("data" in value) || !value.data || typeof value.data !== "object" || !("columns" in value.data)) {
    return "";
  }
  const data = value.data as {
    columns: { label: string }[];
    rows: (string | number | boolean | null)[][];
    totalRow?: (string | number | boolean | null)[] | null;
  };
  return table(
    data.columns.map((c) => c.label),
    data.totalRow ? [...data.rows, data.totalRow] : data.rows,
  );
}

function renderFinding(f: ExportPayload["findings"][number], payload: ExportPayload): string {
  const evidence = payload.evidence.filter((e) => e.findingId === f.id);
  return `<article class="card">
    <div class="chips">
      <strong style="flex:1">${esc(f.key)} · ${esc(f.title)}</strong>
      <span class="sev" style="color:${SEVERITY_COLOR[f.severity]}">${SEVERITY_GLYPH[f.severity]} ${SEVERITY_LABEL[f.severity]}</span>
    </div>
    <div class="chips">
      <span class="chip">${esc(f.riskCategory)}</span>
      <span class="chip">Confidence: ${esc(CONFIDENCE_LABEL[f.confidence])}</span>
      <span class="chip">${esc(CLAIM_LABEL[f.claimType])}</span>
      ${f.financialImpact !== null ? `<span class="chip">Impact: ${esc(fmtMoney(f.financialImpact, f.financialImpactCurrency ?? payload.organisation.baseCurrency))}</span>` : ""}
      <span class="chip">${esc(f.status)}</span>
    </div>
    <p>${esc(f.summary)}</p>
    <p>${esc(f.detail)}</p>
    ${f.impactBasis ? `<p class="muted small">Impact basis: ${esc(f.impactBasis)}</p>` : ""}
    ${list("Explanations considered", f.potentialExplanations)}
    ${f.recommendedFollowup ? `<h3>Recommended follow-up</h3><p class="small">${esc(f.recommendedFollowup)}</p>` : ""}
    ${f.recommendedRemediation ? `<h3>Recommended remediation</h3><p class="small">${esc(f.recommendedRemediation)}</p>` : ""}
    ${f.managementResponse ? `<h3>Management response</h3><p class="small">${esc(f.managementResponse)}</p>` : ""}
    ${
      evidence.length
        ? `<p class="evidence">Evidence: ${evidence.map((e) => esc(`${e.label}${e.locatorText ? ` (${e.locatorText})` : ""}`)).join(" · ")}</p>`
        : `<p class="no-evidence">No supporting evidence was cited for this finding.</p>`
    }
  </article>`;
}

function list(heading: string, items: string[]): string {
  if (!items.length) return "";
  return `<h3>${esc(heading)}</h3><ul class="small">${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`;
}

function table(columns: string[], rows: (string | number | boolean | null)[][]): string {
  return `<div class="table-wrap"><table>
    <thead><tr>${columns.map((c) => `<th>${esc(c)}</th>`).join("")}</tr></thead>
    <tbody>${rows
      .map(
        (row) =>
          `<tr>${row
            .map((cell) =>
              typeof cell === "number"
                ? `<td class="num">${esc(fmtNumber(cell))}</td>`
                : `<td>${esc(cell === null || cell === undefined ? "—" : String(cell))}</td>`,
            )
            .join("")}</tr>`,
      )
      .join("")}</tbody>
  </table></div>`;
}

function svg(scene: ChartScene): string {
  const shapes = scene.shapes
    .map((s) => {
      switch (s.kind) {
        case "rect":
          return `<rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" fill="${s.fill ?? "none"}"${attr("stroke", s.stroke)}${attr("stroke-width", s.strokeWidth)}${attr("opacity", s.opacity)}/>`;
        case "line":
          return `<line x1="${s.x1}" y1="${s.y1}" x2="${s.x2}" y2="${s.y2}" stroke="${s.stroke}" stroke-width="${s.strokeWidth}"${attr("stroke-dasharray", s.dash)}${attr("opacity", s.opacity)}/>`;
        case "path":
          return `<path d="${s.d}" fill="${s.fill ?? "none"}"${attr("stroke", s.stroke)}${attr("stroke-width", s.strokeWidth)}${attr("opacity", s.opacity)}/>`;
        case "circle":
          return `<circle cx="${s.cx}" cy="${s.cy}" r="${s.r}" fill="${s.fill ?? "none"}"${attr("stroke", s.stroke)}${attr("stroke-width", s.strokeWidth)}${attr("opacity", s.opacity)}/>`;
        case "text":
          return `<text x="${s.x}" y="${s.y}" font-size="${s.size}" fill="${s.fill}" text-anchor="${s.anchor}"${s.bold ? ' font-weight="700"' : ""}>${esc(s.text)}</text>`;
        default:
          return "";
      }
    })
    .join("");

  const legend = scene.legend.length
    ? `<div class="chips">${scene.legend
        .map(
          (l) =>
            `<span class="chip"><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${l.color};margin-right:4px"></span>${esc(l.label)}</span>`,
        )
        .join("")}</div>`
    : "";

  return `<svg viewBox="0 0 ${scene.width} ${scene.height}" width="${scene.width}" height="${scene.height}" role="img">${shapes}</svg>${legend}`;
}

function attr(name: string, value: string | number | undefined): string {
  return value === undefined ? "" : ` ${name}="${value}"`;
}

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
