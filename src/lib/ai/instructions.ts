import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { audits } from "@/db/schema";
import type { InstructionSnapshotEntry } from "@/db/schema";
import { PLATFORM_SAFETY_INSTRUCTION } from "@/lib/ai/prompts";

/**
 * The instructions an audit runs under.
 *
 * There is no library of reusable instructions any more: an audit is told what it needs by
 * the platform, which it cannot waive, and by whatever the user wrote on the audit itself.
 * Rank still decides who wins when the two disagree — lower number = higher authority.
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
 * Builds the ordered instruction set for an audit. This is what gets frozen onto the
 * revision — editing the audit afterwards must never change a past run (PRD §9.4).
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

/** Renders the resolved set into the prompt, authority order made explicit. */
export function renderInstructions(entries: InstructionSnapshotEntry[]): string {
  return sortInstructions(entries)
    .map((entry, i) => {
      const authority = entry.mandatory ? "MANDATORY" : "advisory";
      return `### Instruction ${i + 1} — ${entry.name}\nSource: ${entry.source} (${authority}, authority rank ${SOURCE_RANK[entry.source]})\n\n${entry.text}`;
    })
    .join("\n\n");
}
