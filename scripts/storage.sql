-- Evidence bucket + policies.
--
-- This lives outside the drizzle migration chain on purpose: drizzle.config.ts sets
-- schemaFilter: ["public"], so drizzle never sees `storage` and must never try to
-- manage it. Run with `pnpm db:storage` after `pnpm db:migrate` — the policies below
-- reference public.workspace_members, which the core migration creates.
--
-- Path convention: {workspace_id}/{audit_id}/{uuid}-{filename}
-- The first path segment is the tenant key, which is what the policies check.

insert into storage.buckets (id, name, public, file_size_limit)
values ('evidence', 'evidence', false, 104857600)  -- 100 MB; private, served via signed URLs
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      public          = excluded.public;

-- No allowed_mime_types filter: the PRD requires that a user can upload *any* file and
-- that unreadable ones are stored and flagged rather than rejected at the door (§8.5).

drop policy if exists "evidence_members_select" on storage.objects;
create policy "evidence_members_select"
on storage.objects for select to authenticated
using (
  bucket_id = 'evidence'
  and public.is_workspace_member(((storage.foldername(name))[1])::uuid)
);

drop policy if exists "evidence_members_insert" on storage.objects;
create policy "evidence_members_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'evidence'
  and public.is_workspace_member(((storage.foldername(name))[1])::uuid)
);

drop policy if exists "evidence_members_update" on storage.objects;
create policy "evidence_members_update"
on storage.objects for update to authenticated
using (
  bucket_id = 'evidence'
  and public.is_workspace_member(((storage.foldername(name))[1])::uuid)
)
with check (
  bucket_id = 'evidence'
  and public.is_workspace_member(((storage.foldername(name))[1])::uuid)
);

drop policy if exists "evidence_members_delete" on storage.objects;
create policy "evidence_members_delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'evidence'
  and public.is_workspace_member(((storage.foldername(name))[1])::uuid)
);
