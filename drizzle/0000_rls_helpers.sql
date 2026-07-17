-- Membership test used by every row level security policy in `public`.
--
-- SECURITY DEFINER so that the policy on `workspace_members` can itself query
-- `workspace_members` without recursing through that table's own policy.
--
-- LANGUAGE plpgsql (not sql) on purpose: a `language sql` body is parsed when the
-- function is created, which would fail here because `workspace_members` does not
-- exist until the next migration. A plpgsql body is only parsed on first call.
--
-- `auth.uid()` reads a GUC that PostgREST/supabase-js sets from the request JWT. It
-- is NULL on a plain drizzle connection, which is expected: drizzle connects as
-- `postgres` (rolbypassrls = true) and never has RLS applied to it. These policies
-- guard the browser/PostgREST path only — server code enforces tenancy itself.
create or replace function public.is_workspace_member(ws uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  return exists (
    select 1
    from public.workspace_members m
    where m.workspace_id = ws
      and m.user_id = (select auth.uid())
  );
end;
$$;
--> statement-breakpoint
revoke all on function public.is_workspace_member(uuid) from public;
--> statement-breakpoint
grant execute on function public.is_workspace_member(uuid) to authenticated, service_role;
