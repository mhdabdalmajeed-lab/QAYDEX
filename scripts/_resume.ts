import { eq } from "drizzle-orm";
import { db } from "@/db";
import { auditJobStages, auditJobs } from "@/db/schema";
import { runAuditJob } from "@/lib/ai/engine";

async function main() {
  const jobId = "e30f3641-de13-472c-a423-0e7f9557bf25";
  // Simulate what reclaimStaleJobs does to an orphaned run.
  await db.update(auditJobs).set({ status: "failed", error: "orphaned" }).where(eq(auditJobs.id, jobId));
  await db.update(auditJobStages).set({ status: "failed" }).where(eq(auditJobStages.jobId, jobId));

  const before = await db.select().from(auditJobStages).where(eq(auditJobStages.jobId, jobId));
  console.log("before retry — completed stages:", before.filter(s => s.status === "completed").length + "/9");

  const t = Date.now();
  await runAuditJob(jobId);
  const after = await db.select().from(auditJobStages).where(eq(auditJobStages.jobId, jobId));
  console.log("after retry  — completed stages:", after.filter(s => s.status === "completed").length + "/9");
  console.log("took", Math.round((Date.now() - t) / 1000) + "s");
  process.exit(0);
}
main().catch(e => { console.error("resume failed:", e.message); process.exit(1); });
