import "server-only";

import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import {
  auditInstructionLinks,
  audits,
  instructionVersions,
  instructions,
  templateVersions,
} from "@/db/schema";
import type { InstructionConflict, InstructionSnapshotEntry } from "@/db/schema";
import { generateStructured } from "@/lib/ai/client";
import { PLATFORM_SAFETY_INSTRUCTION } from "@/lib/ai/prompts";

/**
 * Resolving the instruction hierarchy (PRD §9.3).
 *
 * Rank is what makes an audit governable: when two instructions disagree, the one from a
 * higher authority wins, and the user can see why. Lower number = higher authority.
 */
const SOURCE_RANK: Record<InstructionSnapshotEntry["source"], number> = {
  platform_safety: 1,
  organization_mandatory: 2,
  client_mandatory: 3,
  template: 4,
  saved: 5,
  audit_specific: 6,
  chat: 7,
};

export function sortInstructions(entries: InstructionSnapshotEntry[]): InstructionSnapshotEntry[] {
  return [...entries].sort((a, b) => {
    const bySource = SOURCE_RANK[a.source] - SOURCE_RANK[b.source];
    if (bySource !== 0) return bySource;
    return a.priority - b.priority;
  });
}

/**
 * Builds the full, ordered instruction set for an audit. This is what gets frozen onto the
 * revision — editing an instruction afterwards must never change a past audit (PRD §9.4).
 */
export async function resolveInstructions(auditId: string): Promise<InstructionSnapshotEntry[]> {
  const [audit] = await db.select().from(audits).where(eq(audits.id, auditId)).limit(1);
  if (!audit) throw new Error(`Audit ${auditId} not found`);

  const entries: InstructionSnapshotEntry[] = [
    {
      source: "platform_safety",
      priority: 0,
      name: "Platform safety and evidence standards",
      text: PLATFORM_SAFETY_INSTRUCTION,
      mandatory: true,
    },
  ];

  // Organization- and client-level instructions that are marked mandatory apply whether or
  // not the user picked them: that is what makes them mandatory.
  const mandatory = await db
    .select({ instruction: instructions, version: instructionVersions })
    .from(instructions)
    .innerJoin(
      instructionVersions,
      and(
        eq(instructionVersions.instructionId, instructions.id),
        eq(instructionVersions.version, instructions.currentVersion),
      ),
    )
    .where(
      and(
        eq(instructions.workspaceId, audit.workspaceId),
        eq(instructions.mandatory, true),
        eq(instructions.status, "active"),
      ),
    );

  for (const row of mandatory) {
    if (!isApplicable(row.instruction, audit)) continue;
    const isClientScoped =
      row.instruction.category === "client" ||
      row.instruction.category === "subsidiary" ||
      row.instruction.clientId !== null;
    entries.push({
      source: isClientScoped ? "client_mandatory" : "organization_mandatory",
      priority: row.instruction.priority,
      instructionId: row.instruction.id,
      instructionVersionId: row.version.id,
      version: row.version.version,
      name: row.instruction.name,
      category: row.instruction.category,
      text: row.version.text,
      mandatory: true,
    });
  }

  if (audit.templateVersionId) {
    const [tv] = await db
      .select()
      .from(templateVersions)
      .where(eq(templateVersions.id, audit.templateVersionId))
      .limit(1);
    if (tv) {
      entries.push({
        source: "template",
        priority: 0,
        name: `Template: ${tv.defaultTitle}`,
        text: tv.instructions,
        mandatory: false,
      });
    }
  }

  const selected = await db
    .select({ link: auditInstructionLinks, instruction: instructions, version: instructionVersions })
    .from(auditInstructionLinks)
    .innerJoin(instructions, eq(instructions.id, auditInstructionLinks.instructionId))
    .innerJoin(
      instructionVersions,
      eq(instructionVersions.id, auditInstructionLinks.instructionVersionId),
    )
    .where(eq(auditInstructionLinks.auditId, auditId));

  for (const row of selected) {
    // A mandatory instruction the user also selected is already in the set at a higher rank.
    if (entries.some((e) => e.instructionId === row.instruction.id)) continue;
    entries.push({
      source: "saved",
      priority: row.instruction.priority,
      instructionId: row.instruction.id,
      instructionVersionId: row.version.id,
      version: row.version.version,
      name: row.instruction.name,
      category: row.instruction.category,
      text: row.version.text,
      mandatory: false,
    });
  }

  if (audit.customInstructions?.trim()) {
    entries.push({
      source: "audit_specific",
      priority: 0,
      name: "Instructions for this audit",
      text: audit.customInstructions.trim(),
      mandatory: false,
    });
  }

  return sortInstructions(entries);
}

type InstructionRow = typeof instructions.$inferSelect;
type AuditRow = typeof audits.$inferSelect;

/** Applicability filters (PRD §9.2) — scope, dates, and template/entity targeting. */
function isApplicable(instruction: InstructionRow, audit: AuditRow): boolean {
  const today = new Date().toISOString().slice(0, 10);
  if (instruction.effectiveDate && instruction.effectiveDate > today) return false;
  if (instruction.expirationDate && instruction.expirationDate < today) return false;

  if (instruction.clientId && instruction.clientId !== audit.clientId) return false;

  const entityIds = instruction.applicableEntityIds;
  if (entityIds && entityIds.length > 0) {
    if (!audit.entityId || !entityIds.includes(audit.entityId)) return false;
  }

  const templateIds = instruction.applicableTemplateIds;
  if (templateIds && templateIds.length > 0) {
    if (!audit.templateId || !templateIds.includes(audit.templateId)) return false;
  }

  const modules = instruction.applicableModules;
  if (modules && modules.length > 0 && !modules.includes(audit.domain)) return false;

  return true;
}

const conflictSchema = z.object({
  conflicts: z.array(
    z.object({
      aRef: z.string().describe("The `ref` value of the first instruction, exactly as given."),
      bRef: z.string().describe("The `ref` value of the second instruction, exactly as given."),
      description: z
        .string()
        .describe(
          "One or two sentences stating precisely what the two instructions ask for that cannot both be honoured.",
        ),
    }),
  ),
});

/**
 * Finds instructions that genuinely cannot both be honoured (PRD §9.3).
 *
 * This is a model call rather than a rule engine on purpose: a conflict is a semantic
 * relationship between two pieces of prose ("ignore FX differences" vs "report all FX
 * movement"), not something a keyword check can find. The result is surfaced to the user to
 * resolve — the platform deliberately never picks a winner silently.
 */
export async function detectInstructionConflicts(
  workspaceId: string,
  entries: InstructionSnapshotEntry[],
  modelId?: string,
): Promise<InstructionConflict[]> {
  const numbered = entries.map((entry, i) => ({ ref: `i${i}`, entry }));
  if (numbered.length < 2) return [];

  const listing = numbered
    .map(
      ({ ref, entry }) =>
        `<instruction ref="${ref}" source="${entry.source}" name="${entry.name}">\n${entry.text}\n</instruction>`,
    )
    .join("\n\n");

  const result = await generateStructured({
    model: modelId,
    schemaName: "instruction_conflicts",
    schema: conflictSchema,
    effort: "low",
    context: { workspaceId, stage: "instruction_conflicts" },
    system:
      "You compare audit instructions and report only DIRECT contradictions: pairs where following " +
      "one necessarily means disobeying the other. Examples of a real conflict: one says to exclude " +
      "immaterial FX differences while another says to report every FX movement; one demands a " +
      "one-page executive summary while another demands exhaustive transaction-level detail. " +
      "Differences of emphasis, scope, or topic are NOT conflicts — two instructions covering " +
      "different areas simply coexist. A more specific instruction refining a general one is NOT a " +
      "conflict. Be conservative: reporting a false conflict forces a user to resolve a non-problem. " +
      "If nothing truly contradicts, return an empty array.",
    input: `Find direct contradictions among these audit instructions.\n\n${listing}`,
  });

  return result.conflicts
    .map((conflict) => {
      const a = numbered.find((n) => n.ref === conflict.aRef);
      const b = numbered.find((n) => n.ref === conflict.bRef);
      if (!a || !b || a.ref === b.ref) return null;
      return {
        aRef: conflict.aRef,
        bRef: conflict.bRef,
        aName: a.entry.name,
        bName: b.entry.name,
        description: conflict.description,
      } satisfies InstructionConflict;
    })
    .filter((c): c is InstructionConflict => c !== null);
}

/** Renders the resolved set into the prompt, authority order made explicit. */
export function renderInstructions(entries: InstructionSnapshotEntry[]): string {
  return sortInstructions(entries)
    .map((entry, i) => {
      const authority = entry.mandatory ? "MANDATORY" : "advisory";
      return `### Instruction ${i + 1} — ${entry.name}\nSource: ${entry.source} (${authority}, authority rank ${SOURCE_RANK[entry.source]})\n\n${entry.text}`;
    })
    .join("\n\n");
}

export async function loadInstructionOptions(workspaceId: string) {
  const rows = await db
    .select({ instruction: instructions, version: instructionVersions })
    .from(instructions)
    .innerJoin(
      instructionVersions,
      and(
        eq(instructionVersions.instructionId, instructions.id),
        eq(instructionVersions.version, instructions.currentVersion),
      ),
    )
    .where(and(eq(instructions.workspaceId, workspaceId), eq(instructions.status, "active")));
  return rows;
}

export async function instructionsByIds(workspaceId: string, ids: string[]) {
  if (ids.length === 0) return [];
  return db
    .select()
    .from(instructions)
    .where(and(eq(instructions.workspaceId, workspaceId), inArray(instructions.id, ids)));
}
