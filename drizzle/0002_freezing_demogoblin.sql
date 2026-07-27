-- Removes the template library.
--
-- The FK constraints are dropped with IF EXISTS because the two DROP TABLE ... CASCADE
-- statements above already take them with the tables they point at; without the guard the
-- migration fails on "constraint does not exist" the first time it is applied.
--
-- audit_instruction_links.source keeps its 'template' enum value. Rows written before this
-- migration still hold it, and removing a value from a Postgres enum means recreating the
-- type — which would fail on exactly those rows.
ALTER TABLE "template_versions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "templates" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY "template_versions_read" ON "template_versions" CASCADE;--> statement-breakpoint
DROP TABLE "template_versions" CASCADE;--> statement-breakpoint
DROP POLICY "templates_read" ON "templates" CASCADE;--> statement-breakpoint
DROP TABLE "templates" CASCADE;--> statement-breakpoint
ALTER TABLE "audit_revisions" DROP CONSTRAINT IF EXISTS "audit_revisions_template_version_id_template_versions_id_fk";
--> statement-breakpoint
ALTER TABLE "audits" DROP CONSTRAINT IF EXISTS "audits_template_id_templates_id_fk";
--> statement-breakpoint
ALTER TABLE "audits" DROP CONSTRAINT IF EXISTS "audits_template_version_id_template_versions_id_fk";
--> statement-breakpoint
ALTER TABLE "audit_revisions" DROP COLUMN "template_version_id";--> statement-breakpoint
ALTER TABLE "audits" DROP COLUMN "template_id";--> statement-breakpoint
ALTER TABLE "audits" DROP COLUMN "template_version_id";--> statement-breakpoint
ALTER TABLE "instructions" DROP COLUMN "applicable_template_ids";
