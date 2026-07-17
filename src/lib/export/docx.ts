import {
  AlignmentType,
  Document,
  Footer,
  HeadingLevel,
  PageNumber,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableOfContents,
  TableRow,
  TextRun,
  WidthType,
} from "docx";

import {
  CLAIM_LABEL,
  CONFIDENCE_LABEL,
  PROFESSIONAL_REVIEW_DISCLAIMER,
  RISK_LABEL,
  SEVERITY_GLYPH,
  SEVERITY_LABEL,
  fmtDateTime,
  fmtMoney,
  fmtNumber,
  humanizeAction,
  type ExportPayload,
} from "@/lib/export/types";

/**
 * DOCX export (PRD §24).
 *
 * DOCX exists so a management letter can be edited before it goes out, so this leans on real
 * Word structures — heading styles, a live table of contents, real tables — rather than
 * pretending to be a PDF. Charts do not survive that translation honestly, so a chart block
 * becomes its own numbers as a table: a truthful table beats a broken image.
 */
export async function renderAuditDocx(payload: ExportPayload): Promise<Buffer> {
  const { audit, organisation, provenance } = payload;

  const meta: [string, string][] = [
    ["Organisation", organisation.name],
    ...(payload.client ? ([["Client", payload.client.name]] as [string, string][]) : []),
    ["Objective", audit.objective ?? "Not stated"],
    ["Period", audit.periodLabel ?? [audit.periodStart, audit.periodEnd].filter(Boolean).join(" to ") ?? "Not specified"],
    ["Entity", audit.entityName ?? "Not specified"],
    ["Overall risk", audit.overallRisk ? RISK_LABEL[audit.overallRisk] : "Not assessed"],
    ["Revision", `${provenance.revisionNumber} (${provenance.revisionStatus})`],
    ["Model", provenance.modelId ?? "Not recorded"],
    ["Prompt version", provenance.promptVersion ?? "Not recorded"],
    ["Generated", fmtDateTime(provenance.generatedAt)],
  ];

  const children: (Paragraph | Table | TableOfContents)[] = [
    new Paragraph({ text: payload.kind.replace(/_/g, " ").toUpperCase(), style: "Caption" }),
    new Paragraph({ text: audit.name, heading: HeadingLevel.TITLE }),
    keyValueTable(meta),
    new Paragraph({ text: "" }),
  ];

  if (provenance.qualityPassed === false) {
    children.push(
      new Paragraph({ text: "This revision did not pass quality review", heading: HeadingLevel.HEADING_2 }),
      new Paragraph({
        children: [
          new TextRun({
            text:
              `The platform's own review pass scored this audit ${provenance.qualityScore ?? "n/a"} and did not pass it. ` +
              "The contents below are reproduced as generated so they can be checked — treat them as a draft to verify, " +
              "not as conclusions to act on.",
            italics: true,
          }),
        ],
      }),
    );
  }

  children.push(
    new Paragraph({ text: PROFESSIONAL_REVIEW_DISCLAIMER.heading, heading: HeadingLevel.HEADING_2 }),
    ...PROFESSIONAL_REVIEW_DISCLAIMER.body.map(
      (line) => new Paragraph({ children: [new TextRun({ text: line, italics: true, size: 18 })] }),
    ),
    new Paragraph({ text: "Contents", heading: HeadingLevel.HEADING_1 }),
    // A field, not a snapshot: Word refreshes it once the recipient edits the document.
    new TableOfContents("Contents", { hyperlink: true, headingStyleRange: "1-3" }),
  );

  if (payload.summary) {
    children.push(
      new Paragraph({ text: "Executive summary", heading: HeadingLevel.HEADING_1, pageBreakBefore: true }),
      new Paragraph({ text: payload.summary }),
    );
  }

  if (payload.blocks.length > 0) {
    children.push(new Paragraph({ text: "Audit", heading: HeadingLevel.HEADING_1, pageBreakBefore: true }));
    for (const block of payload.blocks) {
      children.push(new Paragraph({ text: block.title, heading: HeadingLevel.HEADING_2 }));

      if (!block.block) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `This block could not be rendered: ${block.invalidReason ?? block.error ?? "unknown reason"}`,
                italics: true,
              }),
            ],
          }),
        );
        continue;
      }

      const value = block.block;
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: CLAIM_LABEL[value.claimType], size: 16 }),
            ...("severity" in value && value.severity
              ? [new TextRun({ text: `  ${SEVERITY_GLYPH[value.severity]} ${SEVERITY_LABEL[value.severity]}`, size: 16, bold: true })]
              : []),
          ],
        }),
      );

      for (const key of ["headline", "narrative", "message", "body"] as const) {
        const prose = key in value ? (value as unknown as Record<string, unknown>)[key] : null;
        if (typeof prose === "string" && prose) {
          children.push(new Paragraph({ children: [new TextRun({ text: prose, bold: key === "headline" })] }));
        }
      }

      if ("data" in value && value.data && typeof value.data === "object" && "columns" in value.data) {
        const data = value.data as {
          columns: { label: string }[];
          rows: (string | number | boolean | null)[][];
          totalRow?: (string | number | boolean | null)[] | null;
        };
        children.push(
          dataTable(
            data.columns.map((c) => c.label),
            (data.totalRow ? [...data.rows, data.totalRow] : data.rows).slice(0, 80),
          ),
        );
      }

      if (value.commentary) {
        children.push(new Paragraph({ children: [new TextRun({ text: value.commentary, size: 18, italics: true })] }));
      }
      if (value.evidence.length > 0) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: `Evidence: ${value.evidence.map((e) => e.label).join(" · ")}`, size: 16, color: "71717A" }),
            ],
          }),
        );
      }
    }
  }

  if (payload.findings.length > 0) {
    children.push(new Paragraph({ text: "Findings", heading: HeadingLevel.HEADING_1, pageBreakBefore: true }));
    children.push(
      dataTable(
        ["Ref", "Finding", "Severity", "Confidence", "Status"],
        payload.findings.map((f) => [
          f.key,
          f.title,
          `${SEVERITY_GLYPH[f.severity]} ${SEVERITY_LABEL[f.severity]}`,
          CONFIDENCE_LABEL[f.confidence],
          f.status,
        ]),
      ),
    );

    for (const f of payload.findings) {
      const evidence = payload.evidence.filter((e) => e.findingId === f.id);
      children.push(
        new Paragraph({ text: `${f.key} · ${f.title}`, heading: HeadingLevel.HEADING_2 }),
        new Paragraph({
          children: [
            new TextRun({ text: `${SEVERITY_GLYPH[f.severity]} ${SEVERITY_LABEL[f.severity]}`, bold: true, size: 18 }),
            new TextRun({ text: `  ·  ${f.riskCategory}  ·  Confidence: ${CONFIDENCE_LABEL[f.confidence]}  ·  ${CLAIM_LABEL[f.claimType]}`, size: 18 }),
            ...(f.financialImpact !== null
              ? [
                  new TextRun({
                    text: `  ·  Impact: ${fmtMoney(f.financialImpact, f.financialImpactCurrency ?? organisation.baseCurrency)}`,
                    size: 18,
                  }),
                ]
              : []),
          ],
        }),
        new Paragraph({ text: f.summary }),
        new Paragraph({ text: f.detail }),
      );

      if (f.impactBasis) {
        children.push(new Paragraph({ children: [new TextRun({ text: `Impact basis: ${f.impactBasis}`, size: 18, italics: true })] }));
      }
      if (f.potentialExplanations.length) {
        children.push(new Paragraph({ text: "Explanations considered", heading: HeadingLevel.HEADING_3 }));
        children.push(...f.potentialExplanations.map((e) => new Paragraph({ text: e, bullet: { level: 0 } })));
      }
      if (f.recommendedFollowup) {
        children.push(new Paragraph({ text: "Recommended follow-up", heading: HeadingLevel.HEADING_3 }), new Paragraph({ text: f.recommendedFollowup }));
      }
      if (f.recommendedRemediation) {
        children.push(new Paragraph({ text: "Recommended remediation", heading: HeadingLevel.HEADING_3 }), new Paragraph({ text: f.recommendedRemediation }));
      }
      if (f.managementResponse) {
        children.push(new Paragraph({ text: "Management response", heading: HeadingLevel.HEADING_3 }), new Paragraph({ text: f.managementResponse }));
      }
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: evidence.length
                ? `Evidence: ${evidence.map((e) => `${e.label}${e.locatorText ? ` (${e.locatorText})` : ""}`).join(" · ")}`
                : "No supporting evidence was cited for this finding.",
              size: 16,
              color: evidence.length ? "71717A" : "B45309",
            }),
          ],
        }),
      );
    }
  }

  if (payload.options.includeEvidence && payload.evidence.length > 0) {
    children.push(
      new Paragraph({ text: "Evidence appendix", heading: HeadingLevel.HEADING_1, pageBreakBefore: true }),
      dataTable(
        ["Source", "Location", "Excerpt"],
        payload.evidence.map((e) => [e.label, e.locatorText || "—", e.excerpt ?? "—"]),
      ),
    );
  }

  if (payload.options.includeInstructions && payload.instructions.length > 0) {
    children.push(new Paragraph({ text: "Instructions used", heading: HeadingLevel.HEADING_1, pageBreakBefore: true }));
    payload.instructions.forEach((instruction, i) => {
      children.push(
        new Paragraph({ text: `${i + 1}. ${instruction.name}${instruction.version ? ` (v${instruction.version})` : ""}`, heading: HeadingLevel.HEADING_3 }),
        new Paragraph({ children: [new TextRun({ text: `${instruction.source}${instruction.mandatory ? " · mandatory" : ""}`, size: 16, color: "71717A" })] }),
        new Paragraph({ text: instruction.text }),
      );
    });
  }

  if (payload.options.includeActivity && payload.activity.length > 0) {
    children.push(
      new Paragraph({ text: "Activity history", heading: HeadingLevel.HEADING_1, pageBreakBefore: true }),
      dataTable(
        ["When", "Who", "Action"],
        payload.activity.map((a) => [fmtDateTime(a.at), a.actorEmail ?? "System", humanizeAction(a.action)]),
      ),
    );
  }

  const doc = new Document({
    title: `${audit.name} — ${payload.kind.replace(/_/g, " ")}`,
    creator: "Caydex",
    description: audit.objective ?? undefined,
    styles: {
      paragraphStyles: [
        { id: "Caption", name: "Caption", basedOn: "Normal", run: { size: 18, color: "71717A" } },
      ],
    },
    sections: [
      {
        children,
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text:
                      `${organisation.branding.footer ?? `${organisation.name} · ${audit.name}`} · ` +
                      `Revision ${provenance.revisionNumber} · ${provenance.modelId ?? "model n/a"} · ` +
                      `prompt ${provenance.promptVersion ?? "n/a"} · page `,
                    size: 14,
                    color: "71717A",
                  }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 14, color: "71717A" }),
                  new TextRun({ text: " of ", size: 14, color: "71717A" }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 14, color: "71717A" }),
                ],
              }),
            ],
          }),
        },
      },
    ],
  });

  return Packer.toBuffer(doc);
}

function keyValueTable(rows: [string, string][]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(
      ([k, v]) =>
        new TableRow({
          children: [
            new TableCell({
              width: { size: 28, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ children: [new TextRun({ text: k, bold: true, size: 18 })] })],
            }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: v, size: 18 })] })] }),
          ],
        }),
    ),
  });
}

function dataTable(columns: string[], rows: (string | number | boolean | null)[][]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        children: columns.map(
          (c) =>
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: c, bold: true, size: 16 })] })],
            }),
        ),
      }),
      ...rows.map(
        (row) =>
          new TableRow({
            children: row.map(
              (cell) =>
                new TableCell({
                  children: [
                    new Paragraph({
                      alignment: typeof cell === "number" ? AlignmentType.RIGHT : AlignmentType.LEFT,
                      children: [
                        new TextRun({
                          text:
                            cell === null || cell === undefined
                              ? "—"
                              : typeof cell === "number"
                                ? fmtNumber(cell)
                                : String(cell),
                          size: 16,
                        }),
                      ],
                    }),
                  ],
                }),
            ),
          }),
      ),
    ],
  });
}
