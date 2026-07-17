/**
 * Seeds the system template library and the approved-model registry.
 *
 * Idempotent: re-running upserts by slug/model id. A template body only gets a new
 * version row when its content actually changed, so template_versions stays an honest
 * history rather than a log of seed runs — audits pin a template_version_id and must
 * keep resolving to the text they were generated from (PRD §9.4, §23).
 *
 *   pnpm db:seed
 *
 * Env comes from `tsx --env-file=.env.local` rather than a dotenv call in this file:
 * static imports are hoisted, so `@/db` would read DATABASE_URL before config() ran.
 */
import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { approvedModels, templateVersions, templates } from "@/db/schema";
import { MODEL_SEEDS } from "@/lib/ai/models";
import { AUDIT_TEMPLATES, TEMPLATE_COUNTS, validateTemplates } from "@/lib/templates";

/**
 * Postgres `jsonb` does not preserve object key order, so a value read back never
 * stringifies identically to the seed literal it came from. Comparing canonical forms
 * is what makes "has this template actually changed?" answerable — without it every
 * seed run would cut a new version of all 130 templates.
 */
function canonical(value: unknown): string {
  const walk = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") {
      return Object.fromEntries(
        Object.entries(v as Record<string, unknown>)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, val]) => [k, walk(val)]),
      );
    }
    return v;
  };
  return JSON.stringify(walk(value));
}

async function seedTemplates() {
  const problems = validateTemplates();
  if (problems.length > 0) {
    console.error("✖ template validation failed:");
    problems.forEach((p) => console.error("  -", p));
    process.exit(1);
  }

  let created = 0;
  let updated = 0;
  let unchanged = 0;

  for (const seed of AUDIT_TEMPLATES) {
    const [existing] = await db
      .select()
      .from(templates)
      .where(eq(templates.slug, seed.slug))
      .limit(1);

    let templateId: string;

    if (existing) {
      templateId = existing.id;
      await db
        .update(templates)
        .set({
          name: seed.name,
          category: seed.category,
          subcategory: seed.subcategory,
          description: seed.description,
          tags: seed.tags,
          updatedAt: new Date(),
        })
        .where(eq(templates.id, templateId));
    } else {
      const [row] = await db
        .insert(templates)
        .values({
          workspaceId: null,
          slug: seed.slug,
          name: seed.name,
          category: seed.category,
          subcategory: seed.subcategory,
          description: seed.description,
          isSystem: true,
          visibility: "system",
          tags: seed.tags,
          currentVersion: 0,
        })
        .returning();
      templateId = row.id;
      created += 1;
    }

    const versions = await db
      .select()
      .from(templateVersions)
      .where(eq(templateVersions.templateId, templateId));

    const newest = versions.sort((a, b) => b.version - a.version)[0];

    const nextBody = {
      defaultTitle: seed.defaultTitle,
      auditDescription: seed.auditDescription,
      instructions: seed.instructions,
      recommendedInputs: seed.recommendedInputs,
      requiredEvidence: seed.requiredEvidence,
      suggestedPeriod: seed.suggestedPeriod,
      expectedOutputStructure: seed.expectedOutputStructure,
      suggestedFollowups: seed.suggestedFollowups,
      relevantIntegrations: seed.relevantIntegrations,
    };

    const comparable = (v: typeof nextBody | (typeof versions)[number]) =>
      canonical({
        defaultTitle: v.defaultTitle,
        auditDescription: v.auditDescription,
        instructions: v.instructions,
        recommendedInputs: v.recommendedInputs,
        requiredEvidence: v.requiredEvidence,
        suggestedPeriod: v.suggestedPeriod,
        expectedOutputStructure: v.expectedOutputStructure,
        suggestedFollowups: v.suggestedFollowups,
        relevantIntegrations: v.relevantIntegrations,
      });

    const changed = !newest || comparable(newest) !== comparable(nextBody);

    if (!changed) {
      unchanged += 1;
      continue;
    }

    const version = (newest?.version ?? 0) + 1;
    await db.insert(templateVersions).values({ templateId, version, ...nextBody });
    await db.update(templates).set({ currentVersion: version }).where(eq(templates.id, templateId));
    if (existing) updated += 1;
  }

  console.log(
    `✔ templates: ${created} created, ${updated} new versions, ${unchanged} unchanged ` +
      `(${AUDIT_TEMPLATES.length} total)`,
  );
  console.log(`  distribution: ${JSON.stringify(TEMPLATE_COUNTS)}`);
}

async function seedModels() {
  for (const seed of MODEL_SEEDS) {
    const [existing] = await db
      .select()
      .from(approvedModels)
      .where(and(isNull(approvedModels.workspaceId), eq(approvedModels.modelId, seed.modelId)))
      .limit(1);

    if (existing) {
      // An administrator may have approved or retired a model in Settings; the seed
      // refreshes descriptive fields but must not override that decision.
      await db
        .update(approvedModels)
        .set({ label: seed.label, contextWindow: seed.contextWindow, params: seed.params })
        .where(eq(approvedModels.id, existing.id));
      continue;
    }

    await db.insert(approvedModels).values({
      workspaceId: null,
      modelId: seed.modelId,
      label: seed.label,
      status: seed.status,
      isDefault: seed.isDefault,
      contextWindow: seed.contextWindow,
      evalNotes: seed.evalNotes,
      params: seed.params,
      approvedAt: seed.status === "approved" ? new Date() : null,
    });
  }
  console.log(`✔ models: ${MODEL_SEEDS.length} registry entries`);
}

async function main() {
  await seedTemplates();
  await seedModels();
  process.exit(0);
}

main().catch((error) => {
  console.error("✖ seed failed:", error);
  process.exit(1);
});
