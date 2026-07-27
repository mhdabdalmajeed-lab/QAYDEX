/**
 * Seeds the approved-model registry.
 *
 * Idempotent: re-running upserts by model id.
 *
 *   pnpm db:seed
 *
 * Env comes from `tsx --env-file=.env.local` rather than a dotenv call in this file:
 * static imports are hoisted, so `@/db` would read DATABASE_URL before config() ran.
 */
import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { approvedModels } from "@/db/schema";
import { MODEL_SEEDS } from "@/lib/ai/models";

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
  await seedModels();
  process.exit(0);
}

main().catch((error) => {
  console.error("✖ seed failed:", error);
  process.exit(1);
});
