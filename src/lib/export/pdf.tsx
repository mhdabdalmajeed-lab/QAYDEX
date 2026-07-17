import {
  Circle,
  Document,
  G,
  Line,
  Page,
  Path,
  Rect,
  StyleSheet,
  Svg,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";

import { sceneForBlock } from "@/lib/export/scenes";
import type { ChartScene, Shape } from "@/lib/export/chart-geometry";
import {
  CLAIM_LABEL,
  CONFIDENCE_LABEL,
  PROFESSIONAL_REVIEW_DISCLAIMER,
  RISK_LABEL,
  SEVERITY_COLOR,
  SEVERITY_GLYPH,
  SEVERITY_LABEL,
  fmtDate,
  fmtDateTime,
  fmtMoney,
  fmtNumber,
  humanizeAction,
  type ExportBlock,
  type ExportFinding,
  type ExportPayload,
} from "@/lib/export/types";
import type { AuditBlock } from "@/lib/ai/blocks/schemas";

/**
 * PDF generation (PRD §24).
 *
 * recharts cannot appear here: it does not server-render at all, so a chart would come out as
 * an empty box. Instead `sceneForBlock` reduces a block to plain geometry and this module
 * replays that geometry with react-pdf's own SVG primitives — the chart in the PDF is drawn
 * from the same numbers as the chart on screen, rather than screenshotted or approximated.
 *
 * Two things are non-negotiable in every document: the professional-review disclaimer, and the
 * provenance footer naming the model, prompt version and revision. An exported audit that
 * reads like a signed opinion is precisely what this product exists not to produce (PRD §4, §31).
 *
 * Severity is never colour alone — every severity prints its glyph and its word too, because a
 * PDF may well be read in greyscale (PRD §26.4).
 */

const INK = "#18181b";
const MUTED = "#71717a";
const LINE = "#e4e4e7";
const SOFT = "#fafafa";

const styles = StyleSheet.create({
  page: { paddingTop: 54, paddingBottom: 64, paddingHorizontal: 48, fontSize: 9.5, color: INK, lineHeight: 1.5 },
  brandBar: { height: 3, marginBottom: 18, borderRadius: 2 },
  coverTitle: { fontSize: 24, fontWeight: 700, marginBottom: 8, lineHeight: 1.25 },
  coverKind: { fontSize: 10, color: MUTED, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 6 },
  h1: { fontSize: 15, fontWeight: 700, marginTop: 18, marginBottom: 8 },
  h2: { fontSize: 11.5, fontWeight: 700, marginTop: 12, marginBottom: 5 },
  p: { marginBottom: 6 },
  muted: { color: MUTED },
  small: { fontSize: 8 },
  card: { borderWidth: 1, borderColor: LINE, borderRadius: 5, padding: 10, marginBottom: 9 },
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  chip: { borderWidth: 1, borderColor: LINE, borderRadius: 3, paddingVertical: 1.5, paddingHorizontal: 4, fontSize: 7.5, color: MUTED },
  metaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 0, marginTop: 10 },
  metaCell: { width: "50%", marginBottom: 6 },
  metaLabel: { fontSize: 7.5, color: MUTED, textTransform: "uppercase", letterSpacing: 0.6 },
  th: { fontSize: 8, fontWeight: 700, color: MUTED, paddingVertical: 4, paddingHorizontal: 4 },
  td: { fontSize: 8, paddingVertical: 3.5, paddingHorizontal: 4 },
  trOdd: { backgroundColor: SOFT },
  disclaimer: { borderWidth: 1, borderColor: "#f5d0a9", backgroundColor: "#fffaf3", borderRadius: 5, padding: 10, marginTop: 14 },
  footer: { position: "absolute", bottom: 26, left: 48, right: 48, borderTopWidth: 1, borderTopColor: LINE, paddingTop: 6, flexDirection: "row", justifyContent: "space-between" },
});

/* -------------------------------------------------------------------------- */
/* Chart replay                                                               */
/* -------------------------------------------------------------------------- */

function ShapeNode({ shape }: { shape: Shape }) {
  switch (shape.kind) {
    case "rect":
      return (
        <Rect
          x={shape.x}
          y={shape.y}
          width={shape.w}
          height={shape.h}
          fill={shape.fill ?? "none"}
          stroke={shape.stroke}
          strokeWidth={shape.strokeWidth}
          opacity={shape.opacity}
        />
      );
    case "line":
      return (
        <Line
          x1={shape.x1}
          y1={shape.y1}
          x2={shape.x2}
          y2={shape.y2}
          stroke={shape.stroke}
          strokeWidth={shape.strokeWidth}
          opacity={shape.opacity}
        />
      );
    case "path":
      return (
        <Path
          d={shape.d}
          fill={shape.fill ?? "none"}
          stroke={shape.stroke}
          strokeWidth={shape.strokeWidth}
          opacity={shape.opacity}
        />
      );
    case "circle":
      return (
        <Circle
          cx={shape.cx}
          cy={shape.cy}
          r={shape.r}
          fill={shape.fill ?? "none"}
          stroke={shape.stroke}
          strokeWidth={shape.strokeWidth}
          opacity={shape.opacity}
        />
      );
    case "text":
      return (
        <Text
          x={shape.x}
          y={shape.y}
          style={{
            fontSize: shape.size,
            fill: shape.fill,
            textAnchor: shape.anchor,
            fontWeight: shape.bold ? 700 : 400,
          }}
        >
          {shape.text}
        </Text>
      );
    default:
      return null;
  }
}

function Chart({ scene }: { scene: ChartScene }) {
  return (
    <View wrap={false}>
      <Svg width={scene.width} height={scene.height} viewBox={`0 0 ${scene.width} ${scene.height}`}>
        <G>
          {scene.shapes.map((shape, i) => (
            <ShapeNode key={i} shape={shape} />
          ))}
        </G>
      </Svg>
      {scene.legend.length > 0 ? (
        <View style={[styles.row, { flexWrap: "wrap", marginTop: 4 }]}>
          {scene.legend.map((entry) => (
            <View key={entry.label} style={[styles.row, { marginRight: 10 }]}>
              <View style={{ width: 6, height: 6, borderRadius: 1, backgroundColor: entry.color }} />
              <Text style={[styles.small, styles.muted]}>{entry.label}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Tables                                                                     */
/* -------------------------------------------------------------------------- */

function DataTable({
  columns,
  rows,
  widths,
}: {
  columns: string[];
  rows: (string | number | boolean | null)[][];
  widths?: string[];
}) {
  const width = (i: number) => widths?.[i] ?? `${100 / columns.length}%`;
  const numeric = (v: unknown) => typeof v === "number";

  return (
    <View style={{ borderWidth: 1, borderColor: LINE, borderRadius: 4, marginTop: 6 }}>
      <View style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: LINE, backgroundColor: SOFT }}>
        {columns.map((c, i) => (
          <Text key={i} style={[styles.th, { width: width(i) }]}>
            {c}
          </Text>
        ))}
      </View>
      {rows.slice(0, 60).map((row, r) => (
        <View key={r} style={[{ flexDirection: "row" }, r % 2 ? styles.trOdd : {}]} wrap={false}>
          {row.map((cell, i) => (
            <Text key={i} style={[styles.td, { width: width(i), textAlign: numeric(cell) ? "right" : "left" }]}>
              {cell === null || cell === undefined ? "—" : typeof cell === "number" ? fmtNumber(cell) : String(cell)}
            </Text>
          ))}
        </View>
      ))}
      {rows.length > 60 ? (
        <Text style={[styles.td, styles.muted]}>
          Showing 60 of {rows.length} rows. The full table is in the XLSX export.
        </Text>
      ) : null}
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Blocks                                                                     */
/* -------------------------------------------------------------------------- */

/** Pulls a printable table out of whichever blocks carry one. */
function tableOf(block: AuditBlock): { columns: string[]; rows: (string | number | boolean | null)[][] } | null {
  if ("data" in block && block.data && typeof block.data === "object" && "columns" in block.data) {
    const data = block.data as { columns: { label: string }[]; rows: (string | number | boolean | null)[][] };
    return { columns: data.columns.map((c) => c.label), rows: data.rows };
  }
  return null;
}

function EvidenceLine({ block }: { block: ExportBlock }) {
  if (!block.block || block.block.evidence.length === 0) return null;
  return (
    <Text style={[styles.small, styles.muted, { marginTop: 4 }]}>
      Evidence: {block.block.evidence.map((e) => e.label).join(" · ")}
    </Text>
  );
}

function BlockView({ block, currency }: { block: ExportBlock; currency: string }) {
  // A block whose stored JSON no longer parses is reported, not skipped: silence would make
  // the report look complete when it is not.
  if (!block.block) {
    return (
      <View style={styles.card}>
        <Text style={styles.h2}>{block.title}</Text>
        <Text style={[styles.small, { color: "#b45309" }]}>
          This block could not be rendered: {block.invalidReason ?? block.error ?? "unknown reason"}
        </Text>
      </View>
    );
  }

  const value = block.block;
  const scene = sceneForBlock(value, { width: 460, height: 210 });
  const table = tableOf(value);

  return (
    <View style={styles.card} wrap={false}>
      <View style={[styles.row, { justifyContent: "space-between", marginBottom: 4 }]}>
        <Text style={{ fontSize: 11, fontWeight: 700, flex: 1 }}>{block.title}</Text>
        <Text style={styles.chip}>{CLAIM_LABEL[value.claimType]}</Text>
      </View>

      {"severity" in value && value.severity ? (
        <Text style={[styles.small, { color: SEVERITY_COLOR[value.severity], marginBottom: 3 }]}>
          {SEVERITY_GLYPH[value.severity]} {SEVERITY_LABEL[value.severity]}
        </Text>
      ) : null}

      {"headline" in value && typeof value.headline === "string" ? (
        <Text style={[styles.p, { fontWeight: 700 }]}>{value.headline}</Text>
      ) : null}
      {"narrative" in value && typeof value.narrative === "string" ? (
        <Text style={styles.p}>{value.narrative}</Text>
      ) : null}
      {"message" in value && typeof value.message === "string" ? (
        <Text style={styles.p}>{value.message}</Text>
      ) : null}
      {"body" in value && typeof value.body === "string" ? <Text style={styles.p}>{value.body}</Text> : null}

      {scene ? <Chart scene={scene} /> : null}
      {table ? <DataTable columns={table.columns} rows={table.rows} /> : null}

      {value.commentary ? <Text style={[styles.small, styles.muted, { marginTop: 4 }]}>{value.commentary}</Text> : null}
      {block.narrativeOverride ? (
        <Text style={[styles.small, { marginTop: 4 }]}>Reviewer note: {block.narrativeOverride}</Text>
      ) : null}
      <EvidenceLine block={block} />
      {/* Referenced so the currency prop always has a use even when a block carries no money. */}
      {false ? <Text>{currency}</Text> : null}
    </View>
  );
}

function FindingView({ finding, payload }: { finding: ExportFinding; payload: ExportPayload }) {
  const evidence = payload.evidence.filter((e) => e.findingId === finding.id);
  return (
    <View style={styles.card} wrap={false}>
      <View style={[styles.row, { justifyContent: "space-between" }]}>
        <Text style={{ fontSize: 11, fontWeight: 700, flex: 1 }}>
          {finding.key} · {finding.title}
        </Text>
        <Text style={[styles.small, { color: SEVERITY_COLOR[finding.severity] }]}>
          {SEVERITY_GLYPH[finding.severity]} {SEVERITY_LABEL[finding.severity]}
        </Text>
      </View>
      <View style={[styles.row, { marginTop: 3, marginBottom: 5, flexWrap: "wrap" }]}>
        <Text style={styles.chip}>{finding.riskCategory}</Text>
        <Text style={styles.chip}>Confidence: {CONFIDENCE_LABEL[finding.confidence]}</Text>
        <Text style={styles.chip}>{CLAIM_LABEL[finding.claimType]}</Text>
        {finding.financialImpact !== null ? (
          <Text style={styles.chip}>
            Impact: {fmtMoney(finding.financialImpact, finding.financialImpactCurrency ?? payload.organisation.baseCurrency)}
          </Text>
        ) : null}
      </View>

      <Text style={styles.p}>{finding.summary}</Text>
      <Text style={styles.p}>{finding.detail}</Text>

      {finding.impactBasis ? (
        <Text style={[styles.small, styles.muted]}>Impact basis: {finding.impactBasis}</Text>
      ) : null}

      {finding.potentialExplanations.length > 0 ? (
        <View style={{ marginTop: 5 }}>
          <Text style={styles.h2}>Explanations considered</Text>
          {finding.potentialExplanations.map((e, i) => (
            <Text key={i} style={styles.small}>
              • {e}
            </Text>
          ))}
        </View>
      ) : null}

      {finding.recommendedFollowup ? (
        <View style={{ marginTop: 5 }}>
          <Text style={styles.h2}>Recommended follow-up</Text>
          <Text style={styles.small}>{finding.recommendedFollowup}</Text>
        </View>
      ) : null}
      {finding.recommendedRemediation ? (
        <View style={{ marginTop: 5 }}>
          <Text style={styles.h2}>Recommended remediation</Text>
          <Text style={styles.small}>{finding.recommendedRemediation}</Text>
        </View>
      ) : null}
      {finding.managementResponse ? (
        <View style={{ marginTop: 5 }}>
          <Text style={styles.h2}>Management response</Text>
          <Text style={styles.small}>{finding.managementResponse}</Text>
        </View>
      ) : null}

      {evidence.length > 0 ? (
        <Text style={[styles.small, styles.muted, { marginTop: 5 }]}>
          Evidence: {evidence.map((e) => `${e.label}${e.locator ? ` (${e.locator})` : ""}`).join(" · ")}
        </Text>
      ) : (
        <Text style={[styles.small, { color: "#b45309", marginTop: 5 }]}>
          No supporting evidence was cited for this finding.
        </Text>
      )}
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Document                                                                   */
/* -------------------------------------------------------------------------- */

function Footer({ payload }: { payload: ExportPayload }) {
  const p = payload.provenance;
  return (
    <View style={styles.footer} fixed>
      <Text style={[styles.small, styles.muted]}>
        {payload.organisation.branding.footer ?? `${payload.organisation.name} · ${payload.audit.name}`}
        {" · "}
        Revision {p.revisionNumber} · {p.modelId ?? "model n/a"} · prompt {p.promptVersion ?? "n/a"}
      </Text>
      <Text
        style={[styles.small, styles.muted]}
        render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
      />
    </View>
  );
}

function Cover({ payload, kindLabel }: { payload: ExportPayload; kindLabel: string }) {
  const { audit, organisation, client, provenance } = payload;
  const brand = organisation.branding.primaryColor ?? INK;

  const meta: [string, string][] = [
    ["Organisation", organisation.name],
    ...(client ? ([["Client", client.name]] as [string, string][]) : []),
    ["Period", audit.periodLabel ?? [audit.periodStart, audit.periodEnd].filter(Boolean).join(" to ") ?? "Not specified"],
    ["Entity", audit.entityName ?? "Not specified"],
    ["Template", provenance.templateName ? `${provenance.templateName} v${provenance.templateVersion ?? 1}` : "None"],
    ["Overall risk", audit.overallRisk ? RISK_LABEL[audit.overallRisk] : "Not assessed"],
    ["Revision", `${provenance.revisionNumber} (${provenance.revisionStatus})`],
    ["Generated", fmtDateTime(provenance.generatedAt)],
    ["Model", provenance.modelId ?? "Not recorded"],
    ["Prompt version", provenance.promptVersion ?? "Not recorded"],
    ...(provenance.approvedAt
      ? ([["Approved", `${fmtDate(provenance.approvedAt)} by ${provenance.approvedByEmail ?? "unknown"}`]] as [string, string][])
      : []),
  ];

  return (
    <>
      <View style={[styles.brandBar, { backgroundColor: brand }]} />
      <Text style={styles.coverKind}>{kindLabel}</Text>
      <Text style={styles.coverTitle}>{audit.name}</Text>
      {audit.objective ? <Text style={[styles.p, styles.muted]}>{audit.objective}</Text> : null}

      <View style={styles.metaGrid}>
        {meta.map(([label, value]) => (
          <View key={label} style={styles.metaCell}>
            <Text style={styles.metaLabel}>{label}</Text>
            <Text>{value}</Text>
          </View>
        ))}
      </View>

      {provenance.qualityPassed === false ? (
        <View style={[styles.disclaimer, { borderColor: "#fca5a5", backgroundColor: "#fef2f2" }]}>
          <Text style={{ fontWeight: 700, marginBottom: 3 }}>This revision did not pass quality review</Text>
          <Text style={styles.small}>
            The platform&apos;s own review pass scored this audit {provenance.qualityScore ?? "n/a"} and did not pass it.
            The contents below are reproduced as generated so they can be checked — treat them as a draft to verify,
            not as conclusions to act on.
          </Text>
        </View>
      ) : null}

      <View style={styles.disclaimer}>
        <Text style={{ fontWeight: 700, marginBottom: 3 }}>{PROFESSIONAL_REVIEW_DISCLAIMER.heading}</Text>
        {PROFESSIONAL_REVIEW_DISCLAIMER.body.map((paragraph) => (
          <Text key={paragraph.slice(0, 24)} style={[styles.small, { marginBottom: 3 }]}>
            {paragraph}
          </Text>
        ))}
      </View>
    </>
  );
}

function Contents({ payload, kindLabel }: { payload: ExportPayload; kindLabel: string }) {
  const entries = [
    payload.summary ? "Executive summary" : null,
    payload.blocks.length ? "Audit" : null,
    payload.findings.length ? `Findings (${payload.findings.length})` : null,
    payload.options.includeEvidence && payload.evidence.length ? "Evidence appendix" : null,
    payload.options.includeInputList && payload.inputs.length ? "Inputs" : null,
    payload.options.includeInstructions && payload.instructions.length ? "Instructions used" : null,
    payload.options.includeActivity && payload.activity.length ? "Activity history" : null,
  ].filter((e): e is string => Boolean(e));

  if (entries.length < 2) return null;

  return (
    <View style={{ marginTop: 16 }}>
      <Text style={styles.h1}>{kindLabel} contents</Text>
      {entries.map((entry, i) => (
        <Text key={entry} style={styles.p}>
          {i + 1}. {entry}
        </Text>
      ))}
    </View>
  );
}

export function AuditPdf({ payload }: { payload: ExportPayload }) {
  const kindLabel = payload.kind.replace(/_/g, " ");
  const currency = payload.organisation.baseCurrency;
  const bySeverity = [...payload.findings].sort(
    (a, b) => SEVERITY_ORDER_INDEX(a.severity) - SEVERITY_ORDER_INDEX(b.severity),
  );

  return (
    <Document
      title={`${payload.audit.name} — ${kindLabel}`}
      author={payload.organisation.name}
      subject={payload.audit.objective ?? undefined}
      creator="Caydex"
      producer="Caydex"
    >
      <Page size="A4" style={styles.page}>
        <Cover payload={payload} kindLabel={kindLabel} />
        <Contents payload={payload} kindLabel={kindLabel} />
        <Footer payload={payload} />
      </Page>

      {payload.summary || payload.blocks.length > 0 ? (
        <Page size="A4" style={styles.page}>
          {payload.summary ? (
            <>
              <Text style={styles.h1}>Executive summary</Text>
              <Text style={styles.p}>{payload.summary}</Text>
            </>
          ) : null}

          {payload.blocks.length > 0 ? (
            <>
              <Text style={styles.h1}>Audit</Text>
              {payload.blocks.map((block) => (
                <BlockView key={block.id} block={block} currency={currency} />
              ))}
              {payload.excludedBlockCount > 0 ? (
                <Text style={[styles.small, styles.muted]}>
                  {payload.excludedBlockCount} block
                  {payload.excludedBlockCount === 1 ? " was" : "s were"} excluded from this report by a reviewer.
                </Text>
              ) : null}
            </>
          ) : null}
          <Footer payload={payload} />
        </Page>
      ) : null}

      {bySeverity.length > 0 ? (
        <Page size="A4" style={styles.page}>
          <Text style={styles.h1}>Findings</Text>
          <DataTable
            columns={["Ref", "Finding", "Severity", "Confidence", "Status"]}
            widths={["10%", "48%", "14%", "14%", "14%"]}
            rows={bySeverity.map((f) => [
              f.key,
              f.title,
              `${SEVERITY_GLYPH[f.severity]} ${SEVERITY_LABEL[f.severity]}`,
              CONFIDENCE_LABEL[f.confidence],
              f.status,
            ])}
          />
          <View style={{ marginTop: 10 }}>
            {bySeverity.map((finding) => (
              <FindingView key={finding.id} finding={finding} payload={payload} />
            ))}
          </View>
          <Footer payload={payload} />
        </Page>
      ) : null}

      {payload.options.includeEvidence && payload.evidence.length > 0 ? (
        <Page size="A4" style={styles.page}>
          <Text style={styles.h1}>Evidence appendix</Text>
          <Text style={[styles.p, styles.muted]}>
            Every citation in this report, with the exact location it points at.
          </Text>
          <DataTable
            columns={["Source", "Location", "Excerpt"]}
            widths={["30%", "22%", "48%"]}
            rows={payload.evidence.map((e) => [e.label, e.locatorText || "—", e.excerpt ?? "—"])}
          />
          <Footer payload={payload} />
        </Page>
      ) : null}

      {(payload.options.includeInputList && payload.inputs.length > 0) ||
      (payload.options.includeInstructions && payload.instructions.length > 0) ? (
        <Page size="A4" style={styles.page}>
          {payload.options.includeInputList && payload.inputs.length > 0 ? (
            <>
              <Text style={styles.h1}>Inputs</Text>
              <DataTable
                columns={["Input", "Kind", "Status", "Detected period"]}
                widths={["44%", "14%", "16%", "26%"]}
                rows={payload.inputs.map((i) => [i.name, i.kind, i.status, i.periods.join(", ") || "Not determined"])}
              />
            </>
          ) : null}

          {payload.options.includeInstructions && payload.instructions.length > 0 ? (
            <>
              <Text style={styles.h1}>Instructions used</Text>
              <Text style={[styles.p, styles.muted]}>
                The exact instruction set this revision was generated against, in authority order.
              </Text>
              {payload.instructions.map((instruction, i) => (
                <View key={i} style={styles.card} wrap={false}>
                  <Text style={{ fontWeight: 700 }}>
                    {i + 1}. {instruction.name}
                    {instruction.version ? ` (v${instruction.version})` : ""}
                  </Text>
                  <Text style={[styles.small, styles.muted, { marginBottom: 3 }]}>
                    {instruction.source}
                    {instruction.mandatory ? " · mandatory" : ""}
                  </Text>
                  <Text style={styles.small}>{instruction.text}</Text>
                </View>
              ))}
            </>
          ) : null}
          <Footer payload={payload} />
        </Page>
      ) : null}

      {payload.options.includeActivity && payload.activity.length > 0 ? (
        <Page size="A4" style={styles.page}>
          <Text style={styles.h1}>Activity history</Text>
          <DataTable
            columns={["When", "Who", "Action"]}
            widths={["26%", "34%", "40%"]}
            rows={payload.activity.map((a) => [fmtDateTime(a.at), a.actorEmail ?? "System", humanizeAction(a.action)])}
          />
          <Footer payload={payload} />
        </Page>
      ) : null}
    </Document>
  );
}

const SEVERITY_INDEX: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
function SEVERITY_ORDER_INDEX(severity: string): number {
  return SEVERITY_INDEX[severity] ?? 9;
}

export async function renderAuditPdf(payload: ExportPayload): Promise<Buffer> {
  return renderToBuffer(<AuditPdf payload={payload} />);
}
