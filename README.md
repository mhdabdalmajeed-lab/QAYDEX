# Caydex

An AI audit workspace. Organisations define how audits should be conducted, supply whatever
financial evidence they have, and a GPT model produces an interactive, evidence-linked audit
that can be interrogated, revised and exported.

It is deliberately **not** an accounting system. There is no global ledger, no customer master,
no supplier module. Every piece of accounting data lives inside the audit it was uploaded for,
and the domain sections (Ledger, Budgets, Cash, Customers, Suppliers) are *filtered audit
libraries*, not data browsers.

## Quick start

```bash
pnpm install
cp .env.example .env.local     # fill in Supabase + OpenAI + an encryption key
pnpm db:setup                  # migrate, create the storage bucket, seed 130 templates
pnpm dev
```

Then open http://localhost:3000, create an account, and create a workspace.

To exercise the whole audit pipeline end to end against the live model (this spends tokens):

```bash
pnpm smoke
```

It builds a workspace, a general ledger with planted anomalies, runs all nine stages, and
asserts the things the product actually promises: findings cite resolvable evidence, the
revision records its model/prompt/schema versions, the quality review ran, and the published
revision refuses to be re-run.

## Environment

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Auth + Storage from the browser and server |
| `DATABASE_URL` | App runtime. The **transaction pooler** — `prepare: false` is required (see `src/db/index.ts`) |
| `DIRECT_URL` | Migrations only. drizzle-kit needs a direct connection for DDL and advisory locks |
| `OPENAI_API_KEY` | The audit engine |
| `APP_ENCRYPTION_KEY` | AES-256-GCM key encrypting integration credentials at rest. Rotating it invalidates stored credentials |

## Scripts

| Script | What it does |
| --- | --- |
| `pnpm dev` / `build` / `start` | Next.js (Turbopack) |
| `pnpm typecheck` / `lint` | TypeScript / ESLint |
| `pnpm db:generate` | Diff `src/db/schema.ts` into a migration. **Review the SQL** — this is the RLS checkpoint |
| `pnpm db:migrate` | Apply migrations over `DIRECT_URL` |
| `pnpm db:storage` | Create the `evidence` bucket and its policies (outside the drizzle chain — see below) |
| `pnpm db:seed` | Seed the 130 templates and the approved-model registry. Idempotent |
| `pnpm db:setup` | migrate + storage + seed |
| `pnpm smoke` | Full pipeline test against the live model |

**There is no `db:push`, on purpose.** `drizzle-kit push` introspects live RLS state, and this
database has an `ensure_rls` event trigger that enables RLS on every new `public` table. Since
drizzle's snapshot records `isRLSEnabled: false` for a table it did not explicitly enable, `push`
would emit `ALTER TABLE ... DISABLE ROW LEVEL SECURITY` and silently expose the table to `anon`.
`generate` + `migrate` diff snapshot-to-snapshot and never read the database, so they are safe.

## Architecture

The sidebar is deliberately seven flat destinations — **AI, Ledger, Budgets, Cash, Customers,
Suppliers, Integrations** — with no sub-items. Filtering belongs on the page it filters (each
section carries its own status tabs and filter bar), so the sidebar stays a map of the product
rather than a copy of every view. Templates, Instructions, the unfiltered audit library, the
audit trail and Settings live in the user menu, where you look for them once a month rather than
every day. `nav-config.ts` is the single source of truth.

```
src/
  app/
    (auth)/            sign-in, sign-up, callback
    (app)/w/[slug]/    the workspace shell: chat, domain libraries, audits, templates,
                       instructions, integrations, settings
    api/               uploads, chat streaming, exports, job progress
    share/[token]/     public read-only audit view
  components/
    blocks/            the 55 generative output-block renderers + the exhaustive switch
    ui/                shadcn (base-nova / Base UI)
  db/                  drizzle schema — 35 tables, every one with an RLS policy
  lib/
    ai/                models registry, prompts, block schemas, tools, the engine
    parsing/           per-format parsers (xlsx, csv, pdf, docx, json, xml, zip, images)
    export/            pdf, docx, xlsx, csv, html
    auth/              session + permission guards
  server/actions/      "use server" mutations
```

### The audit pipeline

Nine stages (`src/lib/ai/engine.ts`), each an independently retryable row in `audit_job_stages`:

`intake → parsing → context → planning → analysis → evidence_review → interface_generation →
quality_review → publication`

- **Planning** — the model writes its own audit plan from the instructions and the evidence manifest.
- **Analysis** — a tool loop. The model decides *what* to investigate; `src/lib/ai/tools.ts` does
  the reading and the arithmetic (`query_table`, `read_document`, `compute`, `search_evidence`).
  Every tool call is persisted, which is what makes a finding auditable.
- **Interface generation** — the model returns a validated discriminated union of blocks and
  chooses their arrangement itself. Citations are then checked deterministically: a reference that
  does not resolve to a real input is stripped, and a claim resting on it is demoted from
  `evidence_supported` to `unverified_hypothesis` rather than deleted.
- **Quality review** — a *separate* model pass grades instruction compliance, evidence coverage,
  unsupported conclusions and numerical consistency. A failed review publishes the audit as
  **review needed**, never as complete.

Retrying skips completed stages, so a transient failure costs only what actually failed.

### Principles the code enforces

- **No hard-coded audit rules.** Nothing in this repo decides what counts as a finding. There are
  no thresholds, no "flag if amount >", no materiality constant. If you are tempted to add one,
  it belongs in an instruction or a template, where the organisation owns it.
- **Evidence or it did not happen.** Every material claim carries an input + locator. The engine
  verifies citations resolve before storing anything.
- **A guess must never look like a fact.** Every block and finding carries a claim type, and the
  UI renders `unverified_hypothesis` visibly differently from `evidence_supported`.
- **Completed revisions are immutable.** Re-running produces a new revision; the old one stays
  readable, with its own model id, prompt version, instruction snapshot and input snapshot.
  Editing an instruction never changes an audit that already used it.
- **Severity is never colour alone** — always an icon and a word too.

## Things that will bite you

These are all verified against the live stack, not assumed:

- **This is Next.js 16.** `params`/`searchParams`/`cookies()`/`headers()` are Promises; sync access
  is gone. Middleware is `proxy.ts`. `error.tsx`'s second prop is `unstable_retry`, not `reset`.
  `revalidateTag(tag)` needs a second argument. `forbidden()`/`unauthorized()` are canary-gated.
- **Drizzle bypasses RLS.** It connects as `postgres` (`rolbypassrls = true`), so the policies in
  the schema protect only the browser/PostgREST path. `src/lib/auth/guards.ts` is the real
  boundary, and every query must carry its own `workspaceId` predicate.
- **`auth.uid()` is NULL under drizzle**, so never use `DEFAULT auth.uid()` — pass ids explicitly.
- **Uploads must not be Server Actions**: those cap bodies at 1MB. `/api/uploads` is a Route
  Handler, and it is excluded from `proxy.ts`'s matcher because Proxy buffers request bodies and
  **silently truncates** anything over 10MB.
- **`temperature` and `top_p` are rejected by the gpt-5.6 line**, even though responses echo them
  back. Consistency comes from a pinned model, a versioned prompt and strict schemas.
- **zod emits `oneOf`; the API rejects it.** `src/lib/ai/json-schema.ts` rewrites it to `anyOf`
  and strips `$schema`. It also throws on `format: "email"`, which makes the API hang forever
  rather than error.
- **In zod schemas for model output, use `.nullable()`, never `.optional()`** — strict mode
  requires every property to be in `required`.
- **recharts does not server-render.** Any file importing it needs `"use client"` and a
  fixed-height container. It also cannot draw into PDFs, so `src/lib/export/pdf.tsx` draws charts
  with `@react-pdf/renderer`'s own SVG primitives.
- **`xlsx` comes from the SheetJS CDN**, not npm — the npm build is stale and carries advisories.
- Storage policies live in `scripts/storage.sql`, outside the drizzle chain, because
  `drizzle.config.ts` filters to the `public` schema and must never touch `storage`.

## Status

Implemented: multi-tenant workspaces (internal + audit firm), the 10-role permission model, auth
and onboarding, 130 seeded templates, the instructions library with versioning and conflict
detection, file/text/integration inputs with real parsers, the nine-stage engine, the 55-block
generative interface, the audit detail page with its input panel and floating chat, audit-grounded
chat, revisions and comparison, exports, activity logging and the approved-model registry.

Integrations model the connection lifecycle and audit-scoped snapshot imports, but the individual
provider OAuth flows (QuickBooks, Xero, …) are not implemented — those providers are labelled as
such in the UI rather than faked.

Jobs run in-process via `after()`, which suits a single Node server. On a serverless deployment,
replace `startJob` in `src/lib/jobs/runner.ts` with a worker consuming the `audit_jobs` table; the
queue is already a table, so nothing else changes.
