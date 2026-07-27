/**
 * End-to-end smoke test for the audit engine.
 *
 * Builds a real workspace, a real audit, real parsed evidence (a
 * general ledger spreadsheet with deliberate anomalies), then runs the full nine-stage
 * pipeline against the live model and asserts the things the PRD actually promises:
 * evidence-linked findings, resolvable citations, a quality-review pass, and an immutable
 * published revision.
 *
 *   pnpm smoke
 *
 * It spends real tokens. It is a test of the engine, not of the model's opinions — it asserts
 * structure and traceability, never that a specific finding was found.
 */
import { eq } from "drizzle-orm";
import * as XLSX from "xlsx";

import { db } from "@/db";
import {
  auditInputs,
  auditJobStages,
  auditJobs,
  auditRevisions,
  audits,
  evidenceRefs,
  findings,
  inputDocuments,
  modelCalls,
  outputBlocks,
  workspaceMembers,
  workspaces,
} from "@/db/schema";
import { queueAuditRun, runAuditJob } from "@/lib/ai/engine";
import { parseInput } from "@/lib/parsing";
import { detectMetadata } from "@/lib/parsing/detect-metadata";

const SLUG = "smoke-test-workspace";

/** A small general ledger with a few things a real auditor would want to ask about. */
function buildLedgerWorkbook(): Buffer {
  const rows: (string | number)[][] = [
    ["Northwind Trading Ltd — General Ledger Extract"],
    ["Period: 1 Jan 2026 to 31 Mar 2026", "", "", "", "", ""],
    [],
    ["Entry", "Date", "Account", "Description", "Debit", "Credit", "Posted By", "Source"],
  ];

  const push = (
    entry: string,
    date: string,
    account: string,
    description: string,
    debit: number,
    credit: number,
    user: string,
    source: string,
  ) => rows.push([entry, date, account, description, debit, credit, user, source]);

  // Ordinary automated activity.
  for (let i = 1; i <= 40; i++) {
    const day = String((i % 28) + 1).padStart(2, "0");
    const month = ["01", "02", "03"][i % 3];
    push(
      `JE-${1000 + i}`,
      `2026-${month}-${day}`,
      i % 2 === 0 ? "4000 Revenue" : "1200 Accounts Receivable",
      i % 2 === 0 ? `Sales invoice INV-${2000 + i}` : `Customer receipt REC-${3000 + i}`,
      i % 2 === 0 ? 0 : 1250.75 + i * 13.4,
      i % 2 === 0 ? 1250.75 + i * 13.4 : 0,
      "system.integration",
      "Sales module",
    );
  }

  // Round-number manual entries by one user, posted at period end, with thin descriptions.
  push("JE-2001", "2026-03-31", "6500 Consulting Expense", "Accrual", 50000, 0, "j.doe", "Manual");
  push("JE-2001", "2026-03-31", "2100 Accrued Liabilities", "Accrual", 0, 50000, "j.doe", "Manual");
  push("JE-2002", "2026-03-31", "6500 Consulting Expense", "", 25000, 0, "j.doe", "Manual");
  push("JE-2002", "2026-03-31", "2100 Accrued Liabilities", "", 0, 25000, "j.doe", "Manual");

  // A suspense account that never clears.
  push("JE-2010", "2026-02-14", "9999 Suspense", "Unidentified deposit", 18400, 0, "j.doe", "Manual");
  push("JE-2010", "2026-02-14", "1000 Cash", "Unidentified deposit", 0, 18400, "j.doe", "Manual");

  // A duplicate-looking pair.
  push("JE-2020", "2026-03-15", "6100 Rent", "March rent — Acme Properties", 12000, 0, "a.smith", "Manual");
  push("JE-2020", "2026-03-15", "1000 Cash", "March rent — Acme Properties", 0, 12000, "a.smith", "Manual");
  push("JE-2021", "2026-03-16", "6100 Rent", "March rent — Acme Properties", 12000, 0, "a.smith", "Manual");
  push("JE-2021", "2026-03-16", "1000 Cash", "March rent — Acme Properties", 0, 12000, "a.smith", "Manual");

  const sheet = XLSX.utils.aoa_to_sheet(rows);

  const tb = XLSX.utils.aoa_to_sheet([
    ["Trial Balance — 31 Mar 2026"],
    [],
    ["Account", "Opening", "Movement", "Closing"],
    ["1000 Cash", 250000, -30400, 219600],
    ["1200 Accounts Receivable", 90000, 41200, 131200],
    ["2100 Accrued Liabilities", -40000, -75000, -115000],
    ["4000 Revenue", 0, -68000, -68000],
    ["6100 Rent", 0, 24000, 24000],
    ["6500 Consulting Expense", 0, 75000, 75000],
    ["9999 Suspense", 0, 18400, 18400],
  ]);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "General Ledger");
  XLSX.utils.book_append_sheet(wb, tb, "Trial Balance");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

async function ensureWorkspace(userId: string) {
  const [existing] = await db.select().from(workspaces).where(eq(workspaces.slug, SLUG)).limit(1);
  if (existing) return existing;

  const [workspace] = await db
    .insert(workspaces)
    .values({
      name: "Smoke Test Workspace",
      slug: SLUG,
      type: "internal",
      industry: "Wholesale",
      baseCurrency: "USD",
      accountingStandards: ["IFRS"],
      createdBy: userId,
    })
    .returning();

  await db.insert(workspaceMembers).values({
    workspaceId: workspace.id,
    userId,
    role: "owner",
  });

  return workspace;
}

function ok(label: string, condition: boolean, detail = "") {
  console.log(`  ${condition ? "✅" : "❌"} ${label}${detail ? ` — ${detail}` : ""}`);
  return condition;
}

async function main() {
  const started = Date.now();

  // Reuse a real auth user; the FK to auth.users is enforced.
  const [{ id: userId, email }] = await db.execute<{ id: string; email: string }>(
    (await import("drizzle-orm")).sql`select id::text, email from auth.users order by created_at limit 1`,
  ) as unknown as { id: string; email: string }[];

  console.log(`\n▸ Using auth user ${email}`);

  const workspace = await ensureWorkspace(userId);
  console.log(`▸ Workspace ${workspace.slug} (${workspace.id})`);

  // A fresh audit each run keeps the assertions honest.
  const [audit] = await db
    .insert(audits)
    .values({
      workspaceId: workspace.id,
      name: `Q1 2026 general ledger audit (smoke ${new Date().toISOString().slice(11, 19)})`,
      objective:
        "Establish whether the general ledger for the period is complete, correctly classified, and supported.",
      domain: "ledger",
      periodStart: "2026-01-01",
      periodEnd: "2026-03-31",
      periodLabel: "Q1 2026",
      status: "draft",
      creatorId: userId,
      customInstructions:
        "Report in USD. The finance team wants to know whether the period-end accruals are supported.",
    })
    .returning();

  console.log(`▸ Audit ${audit.id}`);

  // Parse real evidence through the real parser.
  const workbook = buildLedgerWorkbook();
  const parsed = await parseInput(workbook, {
    fileName: "q1-2026-general-ledger.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const [input] = await db
    .insert(auditInputs)
    .values({
      workspaceId: workspace.id,
      auditId: audit.id,
      kind: "file",
      name: "q1-2026-general-ledger.xlsx",
      status: parsed.status,
      fileName: "q1-2026-general-ledger.xlsx",
      fileSize: workbook.length,
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      checksum: "smoke",
      warnings: parsed.warnings,
      detected: detectMetadata(parsed.documents),
      parsedAt: new Date(),
      createdBy: userId,
    })
    .returning();

  for (const [seq, doc] of parsed.documents.entries()) {
    await db.insert(inputDocuments).values({
      workspaceId: workspace.id,
      inputId: input.id,
      kind: doc.kind,
      name: doc.name,
      sheetName: doc.sheetName ?? null,
      pageNumber: doc.pageNumber ?? null,
      seq,
      rowCount: doc.rows?.length ?? 0,
      colCount: doc.columns?.length ?? 0,
      columns: doc.columns ?? [],
      rows: doc.rows ?? [],
      textContent: doc.textContent ?? null,
      summary: doc.summary ?? null,
      truncated: doc.truncated ?? false,
    });
  }

  await db.insert(auditInputs).values({
    workspaceId: workspace.id,
    auditId: audit.id,
    kind: "text",
    name: "Management context",
    status: "parsed",
    textContent:
      "The consulting accruals at 31 March relate to a strategy project. The engagement letter has " +
      "not been located yet. The suspense balance is a deposit we have not identified.",
    parsedAt: new Date(),
    createdBy: userId,
  });

  console.log(
    `▸ Evidence: ${parsed.documents.length} documents, status=${parsed.status}, ` +
      `warnings=${parsed.warnings.length}, detected=${JSON.stringify(input.detected)}`,
  );

  console.log("\n▸ Running the pipeline (real model calls — this takes a few minutes)…\n");
  const { jobId, revisionId, revision } = await queueAuditRun({
    auditId: audit.id,
    workspaceId: workspace.id,
    userId,
  });

  await runAuditJob(jobId);

  // ── Assertions ────────────────────────────────────────────────────────────
  console.log("\n▸ Results\n");

  const stages = await db.select().from(auditJobStages).where(eq(auditJobStages.jobId, jobId));
  for (const stage of stages.sort((a, b) => (a.startedAt?.getTime() ?? 0) - (b.startedAt?.getTime() ?? 0))) {
    const ms = stage.finishedAt && stage.startedAt ? stage.finishedAt.getTime() - stage.startedAt.getTime() : 0;
    console.log(`  ${stage.status === "completed" ? "✓" : "✗"} ${stage.stage.padEnd(22)} ${String(ms).padStart(7)}ms`);
  }

  const [job] = await db.select().from(auditJobs).where(eq(auditJobs.id, jobId)).limit(1);
  const [rev] = await db.select().from(auditRevisions).where(eq(auditRevisions.id, revisionId)).limit(1);
  const blocks = await db.select().from(outputBlocks).where(eq(outputBlocks.revisionId, revisionId));
  const findingRows = await db.select().from(findings).where(eq(findings.revisionId, revisionId));
  const refs = await db.select().from(evidenceRefs).where(eq(evidenceRefs.revisionId, revisionId));
  const calls = await db.select().from(modelCalls).where(eq(modelCalls.revisionId, revisionId));
  const [finalAudit] = await db.select().from(audits).where(eq(audits.id, audit.id)).limit(1);

  console.log("");
  const checks: boolean[] = [];
  checks.push(ok("job completed", job.status === "completed", job.error ?? ""));
  checks.push(ok("all 9 stages completed", stages.filter((s) => s.status === "completed").length === 9));
  checks.push(ok("blocks generated", blocks.length > 0, `${blocks.length} blocks`));
  checks.push(ok("findings extracted", findingRows.length > 0, `${findingRows.length} findings`));
  checks.push(ok("evidence references stored", refs.length > 0, `${refs.length} refs`));

  const distinctTypes = new Set(blocks.map((b) => b.type));
  checks.push(ok("block variety", distinctTypes.size >= 4, [...distinctTypes].join(", ")));

  // The product's core claim: a finding you cannot trace is not a finding.
  const findingsWithEvidence = findingRows.filter((f) => refs.some((r) => r.findingId === f.id));
  const supported = findingRows.filter((f) => f.claimType === "evidence_supported");
  const supportedWithEvidence = supported.filter((f) => refs.some((r) => r.findingId === f.id));
  checks.push(
    ok(
      "every evidence_supported finding cites evidence",
      supported.length === supportedWithEvidence.length,
      `${supportedWithEvidence.length}/${supported.length}`,
    ),
  );
  console.log(
    `  ℹ findings with evidence: ${findingsWithEvidence.length}/${findingRows.length} ` +
      `(claim types: ${[...new Set(findingRows.map((f) => f.claimType))].join(", ") || "none"})`,
  );

  // Every citation must resolve to something real in this audit.
  const inputIds = new Set(
    (await db.select({ id: auditInputs.id }).from(auditInputs).where(eq(auditInputs.auditId, audit.id))).map(
      (r) => r.id,
    ),
  );
  const docIds = new Set(
    (await db.select({ id: inputDocuments.id }).from(inputDocuments).where(eq(inputDocuments.inputId, input.id))).map(
      (r) => r.id,
    ),
  );
  const danglingInput = refs.filter((r) => !inputIds.has(r.inputId));
  const danglingDoc = refs.filter((r) => r.documentId && !docIds.has(r.documentId));
  checks.push(ok("no dangling evidence references", danglingInput.length === 0 && danglingDoc.length === 0));

  const withRows = refs.filter((r) => r.locator?.rowFrom !== undefined && r.locator?.rowFrom !== null);
  console.log(`  ℹ ${withRows.length}/${refs.length} refs cite a specific row`);
  if (withRows.length) {
    const sample = withRows.slice(0, 3);
    for (const r of sample) console.log(`     e.g. "${r.label}" → row ${r.locator.rowFrom}`);
  }

  checks.push(ok("reproducibility recorded", Boolean(rev.modelId && rev.promptVersion && rev.schemaVersion), `${rev.modelId} / prompt ${rev.promptVersion} / schema ${rev.schemaVersion}`));
  checks.push(ok("instruction snapshot frozen", rev.instructionSnapshot.length > 0, `${rev.instructionSnapshot.length} instructions`));
  checks.push(ok("input snapshot frozen", rev.inputSnapshot.length > 0, `${rev.inputSnapshot.length} inputs`));
  checks.push(ok("revision is immutable", rev.immutable === true));
  checks.push(ok("quality review ran", Boolean(rev.qualityReview), rev.qualityReview ? `score ${rev.qualityReview.score}, passed=${rev.qualityReview.passed}` : ""));
  checks.push(ok("audit plan stored", Boolean(rev.plan)));

  const toolCalls = calls.flatMap((c) => c.toolCalls);
  checks.push(ok("model used the deterministic tools", toolCalls.length > 0, `${toolCalls.length} tool calls`));
  const toolNames = [...new Set(toolCalls.map((t) => t.name))];
  console.log(`  ℹ tools used: ${toolNames.join(", ") || "none"}`);
  console.log(`  ℹ model calls: ${calls.length}, tokens in/out: ${calls.reduce((n, c) => n + (c.inputTokens ?? 0), 0)}/${calls.reduce((n, c) => n + (c.outputTokens ?? 0), 0)}`);

  checks.push(ok("audit reached a terminal status", ["completed", "review_needed"].includes(finalAudit.status), finalAudit.status));
  checks.push(ok("overall risk set", Boolean(finalAudit.overallRisk), finalAudit.overallRisk ?? ""));

  // Re-running must never mutate a published revision.
  let immutabilityHeld = false;
  try {
    await runAuditJob(jobId);
  } catch (error) {
    immutabilityHeld = String(error instanceof Error ? error.message : error).includes("published");
  }
  checks.push(ok("published revision refuses re-run", immutabilityHeld));

  if (rev.qualityReview) {
    console.log(`\n▸ Quality review: ${rev.qualityReview.summary}`);
    for (const c of rev.qualityReview.checks) {
      console.log(`  ${c.passed ? "✓" : "✗"} ${c.label}: ${c.detail.slice(0, 140)}`);
    }
  }

  console.log(`\n▸ Summary: ${rev.summary}\n`);
  console.log("▸ Blocks:");
  for (const b of blocks.sort((a, z) => a.position - z.position)) {
    console.log(`  ${String(b.position).padStart(2)}. ${b.type.padEnd(30)} ${b.title ?? ""}`);
  }
  console.log("\n▸ Findings:");
  for (const f of findingRows) {
    console.log(`  [${f.severity}/${f.confidence}/${f.claimType}] ${f.title}`);
  }

  const passed = checks.filter(Boolean).length;
  console.log(
    `\n${passed === checks.length ? "✅" : "❌"} ${passed}/${checks.length} checks passed in ${Math.round((Date.now() - started) / 1000)}s (revision ${revision})\n`,
  );
  process.exit(passed === checks.length ? 0 : 1);
}

main().catch((error) => {
  console.error("\n✖ smoke test failed:", error);
  process.exit(1);
});
