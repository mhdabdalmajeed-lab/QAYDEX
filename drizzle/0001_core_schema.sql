CREATE TYPE "public"."audit_domain" AS ENUM('general', 'ledger', 'budgets', 'cash', 'customers', 'suppliers');--> statement-breakpoint
CREATE TYPE "public"."audit_status" AS ENUM('draft', 'queued', 'processing', 'needs_input', 'completed', 'review_needed', 'approved', 'failed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."claim_type" AS ENUM('evidence_supported', 'reasonable_interpretation', 'unverified_hypothesis', 'missing_information', 'user_claim', 'judgment_required');--> statement-breakpoint
CREATE TYPE "public"."confidence" AS ENUM('high', 'medium', 'low');--> statement-breakpoint
CREATE TYPE "public"."connection_status" AS ENUM('connected', 'error', 'disconnected', 'pending');--> statement-breakpoint
CREATE TYPE "public"."document_kind" AS ENUM('table', 'text', 'page', 'sheet', 'image');--> statement-breakpoint
CREATE TYPE "public"."export_format" AS ENUM('pdf', 'docx', 'xlsx', 'csv', 'html');--> statement-breakpoint
CREATE TYPE "public"."export_kind" AS ENUM('full_report', 'executive_summary', 'findings', 'management_letter', 'remediation_plan', 'evidence_appendix', 'blocks', 'activity', 'instructions', 'input_list');--> statement-breakpoint
CREATE TYPE "public"."finding_status" AS ENUM('open', 'in_progress', 'accepted', 'disputed', 'resolved');--> statement-breakpoint
CREATE TYPE "public"."import_mode" AS ENUM('snapshot', 'refresh_on_revision');--> statement-breakpoint
CREATE TYPE "public"."input_kind" AS ENUM('file', 'text', 'integration');--> statement-breakpoint
CREATE TYPE "public"."input_status" AS ENUM('pending', 'parsing', 'parsed', 'failed', 'unsupported');--> statement-breakpoint
CREATE TYPE "public"."instruction_category" AS ENUM('organization', 'client', 'subsidiary', 'department', 'audit_type', 'accounting_standard', 'industry', 'reporting', 'risk', 'data_handling', 'output_formatting');--> statement-breakpoint
CREATE TYPE "public"."instruction_source" AS ENUM('platform_safety', 'organization_mandatory', 'client_mandatory', 'template', 'saved', 'audit_specific', 'chat');--> statement-breakpoint
CREATE TYPE "public"."job_stage" AS ENUM('intake', 'parsing', 'context', 'planning', 'analysis', 'evidence_review', 'interface_generation', 'quality_review', 'publication');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('queued', 'running', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."lifecycle_status" AS ENUM('draft', 'active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."member_role" AS ENUM('owner', 'admin', 'finance_manager', 'internal_auditor', 'auditor', 'reviewer', 'approver', 'contributor', 'read_only', 'client_user');--> statement-breakpoint
CREATE TYPE "public"."message_role" AS ENUM('user', 'assistant', 'system', 'tool');--> statement-breakpoint
CREATE TYPE "public"."model_status" AS ENUM('approved', 'candidate', 'deprecated');--> statement-breakpoint
CREATE TYPE "public"."revision_status" AS ENUM('draft', 'processing', 'completed', 'failed', 'approved');--> statement-breakpoint
CREATE TYPE "public"."risk_level" AS ENUM('critical', 'high', 'medium', 'low', 'none');--> statement-breakpoint
CREATE TYPE "public"."run_status" AS ENUM('pending', 'running', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."severity" AS ENUM('critical', 'high', 'medium', 'low', 'info');--> statement-breakpoint
CREATE TYPE "public"."stage_status" AS ENUM('pending', 'running', 'completed', 'failed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."visibility" AS ENUM('workspace', 'private', 'client', 'system');--> statement-breakpoint
CREATE TYPE "public"."workspace_type" AS ENUM('internal', 'firm');--> statement-breakpoint
CREATE TABLE "activity_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"actor_id" uuid,
	"actor_email" text,
	"action" text NOT NULL,
	"target_type" text,
	"target_id" uuid,
	"audit_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ip" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity_log" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "approved_models" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid,
	"model_id" text NOT NULL,
	"label" text NOT NULL,
	"status" "model_status" DEFAULT 'candidate' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"params" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"eval_notes" text,
	"context_window" integer,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "approved_models" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "audit_inputs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"audit_id" uuid NOT NULL,
	"kind" "input_kind" NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" "input_status" DEFAULT 'pending' NOT NULL,
	"file_path" text,
	"file_name" text,
	"file_size" integer,
	"mime_type" text,
	"checksum" text,
	"text_content" text,
	"connection_id" uuid,
	"import_id" uuid,
	"warnings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"detected" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"parse_error" text,
	"parsed_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"removed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "audit_inputs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "audit_instruction_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"audit_id" uuid NOT NULL,
	"instruction_id" uuid NOT NULL,
	"instruction_version_id" uuid NOT NULL,
	"source" "instruction_source" DEFAULT 'saved' NOT NULL,
	"added_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_instruction_links" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "audit_job_stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"stage" "job_stage" NOT NULL,
	"status" "stage_status" DEFAULT 'pending' NOT NULL,
	"attempt" integer DEFAULT 0 NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"detail" text,
	"output" jsonb,
	"tokens" jsonb,
	"error" text,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_job_stages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "audit_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"audit_id" uuid NOT NULL,
	"revision_id" uuid NOT NULL,
	"status" "job_status" DEFAULT 'queued' NOT NULL,
	"current_stage" "job_stage",
	"attempt" integer DEFAULT 0 NOT NULL,
	"error" text,
	"idempotency_key" text NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"heartbeat_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_jobs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "audit_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"audit_id" uuid NOT NULL,
	"revision" integer NOT NULL,
	"status" "revision_status" DEFAULT 'draft' NOT NULL,
	"model_id" text,
	"model_params" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"prompt_version" text,
	"schema_version" text,
	"template_version_id" uuid,
	"instruction_snapshot" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"input_snapshot" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"plan" jsonb,
	"quality_review" jsonb,
	"summary" text,
	"overall_risk" "risk_level",
	"reason" text,
	"immutable" boolean DEFAULT false NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"approved_at" timestamp with time zone,
	"approved_by" uuid
);
--> statement-breakpoint
ALTER TABLE "audit_revisions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "audits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"client_id" uuid,
	"engagement_id" uuid,
	"entity_id" uuid,
	"template_id" uuid,
	"template_version_id" uuid,
	"name" text NOT NULL,
	"objective" text,
	"scope" text,
	"domain" "audit_domain" DEFAULT 'general' NOT NULL,
	"subcategory" text,
	"period_start" date,
	"period_end" date,
	"period_label" text,
	"status" "audit_status" DEFAULT 'draft' NOT NULL,
	"overall_risk" "risk_level",
	"finding_count" integer DEFAULT 0 NOT NULL,
	"custom_instructions" text,
	"instruction_conflicts" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"current_revision_id" uuid,
	"creator_id" uuid,
	"reviewer_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "audits" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "block_states" (
	"block_id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"hidden" boolean DEFAULT false NOT NULL,
	"include_in_report" boolean DEFAULT true NOT NULL,
	"narrative_override" text,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "block_states" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"industry" text,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"branding" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clients" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"audit_id" uuid NOT NULL,
	"finding_id" uuid,
	"block_id" uuid,
	"author_id" uuid,
	"body" text NOT NULL,
	"mentions" uuid[],
	"resolved" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "comments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "conversation_audits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"conversation_id" uuid NOT NULL,
	"audit_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "conversation_audits" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"title" text DEFAULT 'New conversation' NOT NULL,
	"created_by" uuid,
	"pinned" boolean DEFAULT false NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "conversations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "engagements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"name" text NOT NULL,
	"status" "lifecycle_status" DEFAULT 'active' NOT NULL,
	"period_start" date,
	"period_end" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "engagements" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "entities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"legal_name" text NOT NULL,
	"entity_type" text,
	"registration_details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"base_currency" text DEFAULT 'USD' NOT NULL,
	"fiscal_period" text,
	"parent_entity_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "entities" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "evidence_refs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"revision_id" uuid NOT NULL,
	"finding_id" uuid,
	"block_id" uuid,
	"input_id" uuid NOT NULL,
	"document_id" uuid,
	"locator" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"excerpt" text,
	"label" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "evidence_refs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "exports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"audit_id" uuid NOT NULL,
	"revision_id" uuid,
	"kind" "export_kind" NOT NULL,
	"format" "export_format" NOT NULL,
	"status" "run_status" DEFAULT 'pending' NOT NULL,
	"file_path" text,
	"file_size" integer,
	"options" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"error" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "exports" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "finding_states" (
	"finding_id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"status" "finding_status" DEFAULT 'open' NOT NULL,
	"owner_id" uuid,
	"due_date" date,
	"management_response" text,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "finding_states" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "findings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"audit_id" uuid NOT NULL,
	"revision_id" uuid NOT NULL,
	"key" text NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"detail" text NOT NULL,
	"risk_category" text NOT NULL,
	"severity" "severity" NOT NULL,
	"confidence" "confidence" NOT NULL,
	"confidence_note" text,
	"claim_type" "claim_type" DEFAULT 'evidence_supported' NOT NULL,
	"financial_impact" numeric(20, 2),
	"financial_impact_currency" text,
	"impact_basis" text,
	"affected_periods" text[],
	"affected_entities" text[],
	"affected_accounts" text[],
	"potential_explanations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"recommended_followup" text,
	"recommended_remediation" text,
	"instructions_referenced" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "findings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "input_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"input_id" uuid NOT NULL,
	"kind" "document_kind" NOT NULL,
	"name" text NOT NULL,
	"sheet_name" text,
	"page_number" integer,
	"seq" integer DEFAULT 0 NOT NULL,
	"row_count" integer,
	"col_count" integer,
	"columns" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"rows" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"text_content" text,
	"summary" text,
	"truncated" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "input_documents" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "instruction_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"instruction_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"text" text NOT NULL,
	"changelog" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "instruction_versions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "instructions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" "instruction_category" NOT NULL,
	"owner_id" uuid,
	"client_id" uuid,
	"visibility" "visibility" DEFAULT 'workspace' NOT NULL,
	"priority" integer DEFAULT 100 NOT NULL,
	"mandatory" boolean DEFAULT false NOT NULL,
	"status" "lifecycle_status" DEFAULT 'active' NOT NULL,
	"tags" text[],
	"applicable_modules" text[],
	"applicable_entity_ids" uuid[],
	"applicable_template_ids" uuid[],
	"effective_date" date,
	"expiration_date" date,
	"current_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "instructions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "integration_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"provider_key" text NOT NULL,
	"name" text NOT NULL,
	"client_id" uuid,
	"entity_id" uuid,
	"status" "connection_status" DEFAULT 'pending' NOT NULL,
	"auth_type" text NOT NULL,
	"credentials_encrypted" text,
	"credentials_meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"connected_entity" text,
	"available_datasets" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"data_period" jsonb,
	"permissions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"last_sync_at" timestamp with time zone,
	"next_sync_at" timestamp with time zone,
	"error" text,
	"owner_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "integration_connections" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "integration_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"connection_id" uuid NOT NULL,
	"import_id" uuid,
	"type" text NOT NULL,
	"message" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "integration_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "integration_imports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"connection_id" uuid NOT NULL,
	"audit_id" uuid,
	"input_id" uuid,
	"dataset" text NOT NULL,
	"period_start" date,
	"period_end" date,
	"mode" "import_mode" DEFAULT 'snapshot' NOT NULL,
	"record_count" integer,
	"snapshot_checksum" text,
	"status" "run_status" DEFAULT 'pending' NOT NULL,
	"error" text,
	"requested_by" uuid,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "integration_imports" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "member_client_access" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "member_client_access" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"conversation_id" uuid NOT NULL,
	"role" "message_role" NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"blocks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"citations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"attachments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"suggested_followups" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"model_id" text,
	"tokens" jsonb,
	"status" "run_status" DEFAULT 'completed' NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "model_calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"job_id" uuid,
	"revision_id" uuid,
	"conversation_id" uuid,
	"stage" text NOT NULL,
	"model_id" text NOT NULL,
	"prompt_version" text,
	"request_summary" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"response_meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"tool_calls" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"input_tokens" integer,
	"output_tokens" integer,
	"latency_ms" integer,
	"status" "run_status" DEFAULT 'completed' NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "model_calls" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "output_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"audit_id" uuid NOT NULL,
	"revision_id" uuid NOT NULL,
	"type" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"title" text,
	"content" jsonb NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"schema_version" text,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "output_blocks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "saved_views" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" uuid,
	"page" text NOT NULL,
	"name" text NOT NULL,
	"filters" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "saved_views" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "share_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"audit_id" uuid NOT NULL,
	"revision_id" uuid,
	"token" text NOT NULL,
	"scope" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"last_accessed_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "share_links" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "template_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"default_title" text NOT NULL,
	"audit_description" text NOT NULL,
	"instructions" text NOT NULL,
	"recommended_inputs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"required_evidence" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"suggested_period" text,
	"expected_output_structure" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"suggested_followups" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"relevant_integrations" text[],
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "template_versions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"category" "audit_domain" NOT NULL,
	"subcategory" text,
	"description" text NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"visibility" "visibility" DEFAULT 'system' NOT NULL,
	"tags" text[],
	"current_version" integer DEFAULT 1 NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "templates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "workspace_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "member_role" DEFAULT 'contributor' NOT NULL,
	"title" text,
	"invited_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workspace_members" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"type" "workspace_type" DEFAULT 'internal' NOT NULL,
	"industry" text,
	"base_currency" text DEFAULT 'USD' NOT NULL,
	"accounting_standards" text[],
	"fiscal_year_start_month" integer DEFAULT 1 NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workspaces" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_audit_id_audits_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."audits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approved_models" ADD CONSTRAINT "approved_models_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approved_models" ADD CONSTRAINT "approved_models_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_inputs" ADD CONSTRAINT "audit_inputs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_inputs" ADD CONSTRAINT "audit_inputs_audit_id_audits_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."audits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_inputs" ADD CONSTRAINT "audit_inputs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_instruction_links" ADD CONSTRAINT "audit_instruction_links_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_instruction_links" ADD CONSTRAINT "audit_instruction_links_audit_id_audits_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."audits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_instruction_links" ADD CONSTRAINT "audit_instruction_links_instruction_id_instructions_id_fk" FOREIGN KEY ("instruction_id") REFERENCES "public"."instructions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_instruction_links" ADD CONSTRAINT "audit_instruction_links_instruction_version_id_instruction_versions_id_fk" FOREIGN KEY ("instruction_version_id") REFERENCES "public"."instruction_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_instruction_links" ADD CONSTRAINT "audit_instruction_links_added_by_users_id_fk" FOREIGN KEY ("added_by") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_job_stages" ADD CONSTRAINT "audit_job_stages_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_job_stages" ADD CONSTRAINT "audit_job_stages_job_id_audit_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."audit_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_jobs" ADD CONSTRAINT "audit_jobs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_jobs" ADD CONSTRAINT "audit_jobs_audit_id_audits_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."audits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_jobs" ADD CONSTRAINT "audit_jobs_revision_id_audit_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."audit_revisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_revisions" ADD CONSTRAINT "audit_revisions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_revisions" ADD CONSTRAINT "audit_revisions_audit_id_audits_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."audits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_revisions" ADD CONSTRAINT "audit_revisions_template_version_id_template_versions_id_fk" FOREIGN KEY ("template_version_id") REFERENCES "public"."template_versions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_revisions" ADD CONSTRAINT "audit_revisions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_revisions" ADD CONSTRAINT "audit_revisions_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audits" ADD CONSTRAINT "audits_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audits" ADD CONSTRAINT "audits_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audits" ADD CONSTRAINT "audits_engagement_id_engagements_id_fk" FOREIGN KEY ("engagement_id") REFERENCES "public"."engagements"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audits" ADD CONSTRAINT "audits_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audits" ADD CONSTRAINT "audits_template_id_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audits" ADD CONSTRAINT "audits_template_version_id_template_versions_id_fk" FOREIGN KEY ("template_version_id") REFERENCES "public"."template_versions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audits" ADD CONSTRAINT "audits_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audits" ADD CONSTRAINT "audits_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "block_states" ADD CONSTRAINT "block_states_block_id_output_blocks_id_fk" FOREIGN KEY ("block_id") REFERENCES "public"."output_blocks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "block_states" ADD CONSTRAINT "block_states_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "block_states" ADD CONSTRAINT "block_states_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_audit_id_audits_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."audits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_finding_id_findings_id_fk" FOREIGN KEY ("finding_id") REFERENCES "public"."findings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_block_id_output_blocks_id_fk" FOREIGN KEY ("block_id") REFERENCES "public"."output_blocks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_audits" ADD CONSTRAINT "conversation_audits_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_audits" ADD CONSTRAINT "conversation_audits_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_audits" ADD CONSTRAINT "conversation_audits_audit_id_audits_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."audits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engagements" ADD CONSTRAINT "engagements_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engagements" ADD CONSTRAINT "engagements_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entities" ADD CONSTRAINT "entities_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entities" ADD CONSTRAINT "entities_parent_entity_id_entities_id_fk" FOREIGN KEY ("parent_entity_id") REFERENCES "public"."entities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_refs" ADD CONSTRAINT "evidence_refs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_refs" ADD CONSTRAINT "evidence_refs_revision_id_audit_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."audit_revisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_refs" ADD CONSTRAINT "evidence_refs_finding_id_findings_id_fk" FOREIGN KEY ("finding_id") REFERENCES "public"."findings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_refs" ADD CONSTRAINT "evidence_refs_block_id_output_blocks_id_fk" FOREIGN KEY ("block_id") REFERENCES "public"."output_blocks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_refs" ADD CONSTRAINT "evidence_refs_input_id_audit_inputs_id_fk" FOREIGN KEY ("input_id") REFERENCES "public"."audit_inputs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_refs" ADD CONSTRAINT "evidence_refs_document_id_input_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."input_documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exports" ADD CONSTRAINT "exports_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exports" ADD CONSTRAINT "exports_audit_id_audits_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."audits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exports" ADD CONSTRAINT "exports_revision_id_audit_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."audit_revisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exports" ADD CONSTRAINT "exports_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finding_states" ADD CONSTRAINT "finding_states_finding_id_findings_id_fk" FOREIGN KEY ("finding_id") REFERENCES "public"."findings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finding_states" ADD CONSTRAINT "finding_states_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finding_states" ADD CONSTRAINT "finding_states_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finding_states" ADD CONSTRAINT "finding_states_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "findings" ADD CONSTRAINT "findings_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "findings" ADD CONSTRAINT "findings_audit_id_audits_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."audits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "findings" ADD CONSTRAINT "findings_revision_id_audit_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."audit_revisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "input_documents" ADD CONSTRAINT "input_documents_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "input_documents" ADD CONSTRAINT "input_documents_input_id_audit_inputs_id_fk" FOREIGN KEY ("input_id") REFERENCES "public"."audit_inputs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instruction_versions" ADD CONSTRAINT "instruction_versions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instruction_versions" ADD CONSTRAINT "instruction_versions_instruction_id_instructions_id_fk" FOREIGN KEY ("instruction_id") REFERENCES "public"."instructions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instruction_versions" ADD CONSTRAINT "instruction_versions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instructions" ADD CONSTRAINT "instructions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instructions" ADD CONSTRAINT "instructions_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instructions" ADD CONSTRAINT "instructions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_connections" ADD CONSTRAINT "integration_connections_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_connections" ADD CONSTRAINT "integration_connections_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_connections" ADD CONSTRAINT "integration_connections_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_connections" ADD CONSTRAINT "integration_connections_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_events" ADD CONSTRAINT "integration_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_events" ADD CONSTRAINT "integration_events_connection_id_integration_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."integration_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_events" ADD CONSTRAINT "integration_events_import_id_integration_imports_id_fk" FOREIGN KEY ("import_id") REFERENCES "public"."integration_imports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_imports" ADD CONSTRAINT "integration_imports_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_imports" ADD CONSTRAINT "integration_imports_connection_id_integration_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."integration_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_imports" ADD CONSTRAINT "integration_imports_audit_id_audits_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."audits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_imports" ADD CONSTRAINT "integration_imports_input_id_audit_inputs_id_fk" FOREIGN KEY ("input_id") REFERENCES "public"."audit_inputs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_imports" ADD CONSTRAINT "integration_imports_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_client_access" ADD CONSTRAINT "member_client_access_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_client_access" ADD CONSTRAINT "member_client_access_member_id_workspace_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."workspace_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_client_access" ADD CONSTRAINT "member_client_access_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_calls" ADD CONSTRAINT "model_calls_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_calls" ADD CONSTRAINT "model_calls_job_id_audit_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."audit_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_calls" ADD CONSTRAINT "model_calls_revision_id_audit_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."audit_revisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_calls" ADD CONSTRAINT "model_calls_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "output_blocks" ADD CONSTRAINT "output_blocks_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "output_blocks" ADD CONSTRAINT "output_blocks_audit_id_audits_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."audits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "output_blocks" ADD CONSTRAINT "output_blocks_revision_id_audit_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."audit_revisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_views" ADD CONSTRAINT "saved_views_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_views" ADD CONSTRAINT "saved_views_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_audit_id_audits_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."audits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_revision_id_audit_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."audit_revisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_versions" ADD CONSTRAINT "template_versions_template_id_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "templates" ADD CONSTRAINT "templates_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "templates" ADD CONSTRAINT "templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_log_workspace_idx" ON "activity_log" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "activity_log_audit_idx" ON "activity_log" USING btree ("audit_id");--> statement-breakpoint
CREATE UNIQUE INDEX "approved_models_unique" ON "approved_models" USING btree ("workspace_id","model_id");--> statement-breakpoint
CREATE INDEX "audit_inputs_audit_idx" ON "audit_inputs" USING btree ("audit_id");--> statement-breakpoint
CREATE UNIQUE INDEX "audit_instruction_links_unique" ON "audit_instruction_links" USING btree ("audit_id","instruction_id");--> statement-breakpoint
CREATE UNIQUE INDEX "audit_job_stages_unique" ON "audit_job_stages" USING btree ("job_id","stage");--> statement-breakpoint
CREATE UNIQUE INDEX "audit_jobs_idempotency_key" ON "audit_jobs" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "audit_jobs_audit_idx" ON "audit_jobs" USING btree ("audit_id");--> statement-breakpoint
CREATE UNIQUE INDEX "audit_revisions_unique" ON "audit_revisions" USING btree ("audit_id","revision");--> statement-breakpoint
CREATE INDEX "audits_workspace_idx" ON "audits" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "audits_domain_idx" ON "audits" USING btree ("workspace_id","domain");--> statement-breakpoint
CREATE INDEX "audits_status_idx" ON "audits" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "audits_client_idx" ON "audits" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "clients_workspace_idx" ON "clients" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "comments_audit_idx" ON "comments" USING btree ("audit_id");--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_audits_unique" ON "conversation_audits" USING btree ("conversation_id","audit_id");--> statement-breakpoint
CREATE INDEX "conversations_workspace_idx" ON "conversations" USING btree ("workspace_id","updated_at");--> statement-breakpoint
CREATE INDEX "engagements_client_idx" ON "engagements" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "entities_workspace_idx" ON "entities" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "evidence_refs_finding_idx" ON "evidence_refs" USING btree ("finding_id");--> statement-breakpoint
CREATE INDEX "evidence_refs_block_idx" ON "evidence_refs" USING btree ("block_id");--> statement-breakpoint
CREATE INDEX "evidence_refs_input_idx" ON "evidence_refs" USING btree ("input_id");--> statement-breakpoint
CREATE INDEX "exports_audit_idx" ON "exports" USING btree ("audit_id");--> statement-breakpoint
CREATE INDEX "findings_revision_idx" ON "findings" USING btree ("revision_id","position");--> statement-breakpoint
CREATE INDEX "findings_audit_idx" ON "findings" USING btree ("audit_id");--> statement-breakpoint
CREATE INDEX "findings_severity_idx" ON "findings" USING btree ("workspace_id","severity");--> statement-breakpoint
CREATE INDEX "input_documents_input_idx" ON "input_documents" USING btree ("input_id");--> statement-breakpoint
CREATE UNIQUE INDEX "instruction_versions_unique" ON "instruction_versions" USING btree ("instruction_id","version");--> statement-breakpoint
CREATE INDEX "instructions_workspace_idx" ON "instructions" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "instructions_category_idx" ON "instructions" USING btree ("workspace_id","category");--> statement-breakpoint
CREATE INDEX "integration_connections_workspace_idx" ON "integration_connections" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "integration_events_connection_idx" ON "integration_events" USING btree ("connection_id","created_at");--> statement-breakpoint
CREATE INDEX "integration_imports_connection_idx" ON "integration_imports" USING btree ("connection_id");--> statement-breakpoint
CREATE INDEX "integration_imports_audit_idx" ON "integration_imports" USING btree ("audit_id");--> statement-breakpoint
CREATE UNIQUE INDEX "member_client_access_unique" ON "member_client_access" USING btree ("member_id","client_id");--> statement-breakpoint
CREATE INDEX "messages_conversation_idx" ON "messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "model_calls_revision_idx" ON "model_calls" USING btree ("revision_id");--> statement-breakpoint
CREATE INDEX "output_blocks_revision_idx" ON "output_blocks" USING btree ("revision_id","position");--> statement-breakpoint
CREATE INDEX "saved_views_workspace_idx" ON "saved_views" USING btree ("workspace_id","page");--> statement-breakpoint
CREATE UNIQUE INDEX "share_links_token_key" ON "share_links" USING btree ("token");--> statement-breakpoint
CREATE UNIQUE INDEX "template_versions_unique" ON "template_versions" USING btree ("template_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "templates_slug_key" ON "templates" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "templates_category_idx" ON "templates" USING btree ("category");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_members_unique" ON "workspace_members" USING btree ("workspace_id","user_id");--> statement-breakpoint
CREATE INDEX "workspace_members_user_idx" ON "workspace_members" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workspaces_slug_key" ON "workspaces" USING btree ("slug");--> statement-breakpoint
CREATE POLICY "activity_log_members" ON "activity_log" AS PERMISSIVE FOR ALL TO "authenticated" USING (public.is_workspace_member("activity_log"."workspace_id")) WITH CHECK (public.is_workspace_member("activity_log"."workspace_id"));--> statement-breakpoint
CREATE POLICY "approved_models_read" ON "approved_models" AS PERMISSIVE FOR ALL TO "authenticated" USING ("approved_models"."workspace_id" is null or public.is_workspace_member("approved_models"."workspace_id")) WITH CHECK ("approved_models"."workspace_id" is not null and public.is_workspace_member("approved_models"."workspace_id"));--> statement-breakpoint
CREATE POLICY "audit_inputs_members" ON "audit_inputs" AS PERMISSIVE FOR ALL TO "authenticated" USING (public.is_workspace_member("audit_inputs"."workspace_id")) WITH CHECK (public.is_workspace_member("audit_inputs"."workspace_id"));--> statement-breakpoint
CREATE POLICY "audit_instruction_links_members" ON "audit_instruction_links" AS PERMISSIVE FOR ALL TO "authenticated" USING (public.is_workspace_member("audit_instruction_links"."workspace_id")) WITH CHECK (public.is_workspace_member("audit_instruction_links"."workspace_id"));--> statement-breakpoint
CREATE POLICY "audit_job_stages_members" ON "audit_job_stages" AS PERMISSIVE FOR ALL TO "authenticated" USING (public.is_workspace_member("audit_job_stages"."workspace_id")) WITH CHECK (public.is_workspace_member("audit_job_stages"."workspace_id"));--> statement-breakpoint
CREATE POLICY "audit_jobs_members" ON "audit_jobs" AS PERMISSIVE FOR ALL TO "authenticated" USING (public.is_workspace_member("audit_jobs"."workspace_id")) WITH CHECK (public.is_workspace_member("audit_jobs"."workspace_id"));--> statement-breakpoint
CREATE POLICY "audit_revisions_members" ON "audit_revisions" AS PERMISSIVE FOR ALL TO "authenticated" USING (public.is_workspace_member("audit_revisions"."workspace_id")) WITH CHECK (public.is_workspace_member("audit_revisions"."workspace_id"));--> statement-breakpoint
CREATE POLICY "audits_members" ON "audits" AS PERMISSIVE FOR ALL TO "authenticated" USING (public.is_workspace_member("audits"."workspace_id")) WITH CHECK (public.is_workspace_member("audits"."workspace_id"));--> statement-breakpoint
CREATE POLICY "block_states_members" ON "block_states" AS PERMISSIVE FOR ALL TO "authenticated" USING (public.is_workspace_member("block_states"."workspace_id")) WITH CHECK (public.is_workspace_member("block_states"."workspace_id"));--> statement-breakpoint
CREATE POLICY "clients_members" ON "clients" AS PERMISSIVE FOR ALL TO "authenticated" USING (public.is_workspace_member("clients"."workspace_id")) WITH CHECK (public.is_workspace_member("clients"."workspace_id"));--> statement-breakpoint
CREATE POLICY "comments_members" ON "comments" AS PERMISSIVE FOR ALL TO "authenticated" USING (public.is_workspace_member("comments"."workspace_id")) WITH CHECK (public.is_workspace_member("comments"."workspace_id"));--> statement-breakpoint
CREATE POLICY "conversation_audits_members" ON "conversation_audits" AS PERMISSIVE FOR ALL TO "authenticated" USING (public.is_workspace_member("conversation_audits"."workspace_id")) WITH CHECK (public.is_workspace_member("conversation_audits"."workspace_id"));--> statement-breakpoint
CREATE POLICY "conversations_members" ON "conversations" AS PERMISSIVE FOR ALL TO "authenticated" USING (public.is_workspace_member("conversations"."workspace_id")) WITH CHECK (public.is_workspace_member("conversations"."workspace_id"));--> statement-breakpoint
CREATE POLICY "engagements_members" ON "engagements" AS PERMISSIVE FOR ALL TO "authenticated" USING (public.is_workspace_member("engagements"."workspace_id")) WITH CHECK (public.is_workspace_member("engagements"."workspace_id"));--> statement-breakpoint
CREATE POLICY "entities_members" ON "entities" AS PERMISSIVE FOR ALL TO "authenticated" USING (public.is_workspace_member("entities"."workspace_id")) WITH CHECK (public.is_workspace_member("entities"."workspace_id"));--> statement-breakpoint
CREATE POLICY "evidence_refs_members" ON "evidence_refs" AS PERMISSIVE FOR ALL TO "authenticated" USING (public.is_workspace_member("evidence_refs"."workspace_id")) WITH CHECK (public.is_workspace_member("evidence_refs"."workspace_id"));--> statement-breakpoint
CREATE POLICY "exports_members" ON "exports" AS PERMISSIVE FOR ALL TO "authenticated" USING (public.is_workspace_member("exports"."workspace_id")) WITH CHECK (public.is_workspace_member("exports"."workspace_id"));--> statement-breakpoint
CREATE POLICY "finding_states_members" ON "finding_states" AS PERMISSIVE FOR ALL TO "authenticated" USING (public.is_workspace_member("finding_states"."workspace_id")) WITH CHECK (public.is_workspace_member("finding_states"."workspace_id"));--> statement-breakpoint
CREATE POLICY "findings_members" ON "findings" AS PERMISSIVE FOR ALL TO "authenticated" USING (public.is_workspace_member("findings"."workspace_id")) WITH CHECK (public.is_workspace_member("findings"."workspace_id"));--> statement-breakpoint
CREATE POLICY "input_documents_members" ON "input_documents" AS PERMISSIVE FOR ALL TO "authenticated" USING (public.is_workspace_member("input_documents"."workspace_id")) WITH CHECK (public.is_workspace_member("input_documents"."workspace_id"));--> statement-breakpoint
CREATE POLICY "instruction_versions_members" ON "instruction_versions" AS PERMISSIVE FOR ALL TO "authenticated" USING (public.is_workspace_member("instruction_versions"."workspace_id")) WITH CHECK (public.is_workspace_member("instruction_versions"."workspace_id"));--> statement-breakpoint
CREATE POLICY "instructions_members" ON "instructions" AS PERMISSIVE FOR ALL TO "authenticated" USING (public.is_workspace_member("instructions"."workspace_id")) WITH CHECK (public.is_workspace_member("instructions"."workspace_id"));--> statement-breakpoint
CREATE POLICY "integration_connections_members" ON "integration_connections" AS PERMISSIVE FOR ALL TO "authenticated" USING (public.is_workspace_member("integration_connections"."workspace_id")) WITH CHECK (public.is_workspace_member("integration_connections"."workspace_id"));--> statement-breakpoint
CREATE POLICY "integration_events_members" ON "integration_events" AS PERMISSIVE FOR ALL TO "authenticated" USING (public.is_workspace_member("integration_events"."workspace_id")) WITH CHECK (public.is_workspace_member("integration_events"."workspace_id"));--> statement-breakpoint
CREATE POLICY "integration_imports_members" ON "integration_imports" AS PERMISSIVE FOR ALL TO "authenticated" USING (public.is_workspace_member("integration_imports"."workspace_id")) WITH CHECK (public.is_workspace_member("integration_imports"."workspace_id"));--> statement-breakpoint
CREATE POLICY "member_client_access_members" ON "member_client_access" AS PERMISSIVE FOR ALL TO "authenticated" USING (public.is_workspace_member("member_client_access"."workspace_id")) WITH CHECK (public.is_workspace_member("member_client_access"."workspace_id"));--> statement-breakpoint
CREATE POLICY "messages_members" ON "messages" AS PERMISSIVE FOR ALL TO "authenticated" USING (public.is_workspace_member("messages"."workspace_id")) WITH CHECK (public.is_workspace_member("messages"."workspace_id"));--> statement-breakpoint
CREATE POLICY "model_calls_members" ON "model_calls" AS PERMISSIVE FOR ALL TO "authenticated" USING (public.is_workspace_member("model_calls"."workspace_id")) WITH CHECK (public.is_workspace_member("model_calls"."workspace_id"));--> statement-breakpoint
CREATE POLICY "output_blocks_members" ON "output_blocks" AS PERMISSIVE FOR ALL TO "authenticated" USING (public.is_workspace_member("output_blocks"."workspace_id")) WITH CHECK (public.is_workspace_member("output_blocks"."workspace_id"));--> statement-breakpoint
CREATE POLICY "saved_views_members" ON "saved_views" AS PERMISSIVE FOR ALL TO "authenticated" USING (public.is_workspace_member("saved_views"."workspace_id")) WITH CHECK (public.is_workspace_member("saved_views"."workspace_id"));--> statement-breakpoint
CREATE POLICY "share_links_members" ON "share_links" AS PERMISSIVE FOR ALL TO "authenticated" USING (public.is_workspace_member("share_links"."workspace_id")) WITH CHECK (public.is_workspace_member("share_links"."workspace_id"));--> statement-breakpoint
CREATE POLICY "template_versions_read" ON "template_versions" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "templates_read" ON "templates" AS PERMISSIVE FOR ALL TO "authenticated" USING ("templates"."workspace_id" is null or public.is_workspace_member("templates"."workspace_id")) WITH CHECK ("templates"."workspace_id" is not null and public.is_workspace_member("templates"."workspace_id"));--> statement-breakpoint
CREATE POLICY "workspace_members_members" ON "workspace_members" AS PERMISSIVE FOR ALL TO "authenticated" USING (public.is_workspace_member("workspace_members"."workspace_id")) WITH CHECK (public.is_workspace_member("workspace_members"."workspace_id"));--> statement-breakpoint
CREATE POLICY "workspaces_members" ON "workspaces" AS PERMISSIVE FOR ALL TO "authenticated" USING (public.is_workspace_member("workspaces"."id")) WITH CHECK (public.is_workspace_member("workspaces"."id"));