DROP POLICY "audit_instruction_links_members" ON "audit_instruction_links" CASCADE;--> statement-breakpoint
DROP TABLE "audit_instruction_links" CASCADE;--> statement-breakpoint
DROP POLICY "instruction_versions_members" ON "instruction_versions" CASCADE;--> statement-breakpoint
DROP TABLE "instruction_versions" CASCADE;--> statement-breakpoint
DROP POLICY "instructions_members" ON "instructions" CASCADE;--> statement-breakpoint
DROP TABLE "instructions" CASCADE;--> statement-breakpoint
ALTER TABLE "audits" DROP COLUMN "instruction_conflicts";--> statement-breakpoint
DROP TYPE "public"."instruction_category";