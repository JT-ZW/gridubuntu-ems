-- REVIEWED PROPOSAL, NOT APPLIED BY THE PORTAL MIGRATION RUNNER.
-- Review the existing application's operator accounts before executing.
-- Role source: trusted auth.users.app_metadata via existing auth_user_role().
-- Existing 'operator' access is retained; the portal's future admin server can
-- use service_role. The incident public-read policy is deliberately unchanged.
begin;

alter policy settings_operator_all on public.system_settings
 using (public.auth_user_role() in ('operator','service_role'))
 with check (public.auth_user_role() in ('operator','service_role'));

-- These privileges are unnecessary for browser clients; CRUD grants and their
-- existing RLS policies are retained for compatibility with the old application.
do $$
declare target record;
begin
 for target in select tablename from pg_tables where schemaname='public'
 loop
  execute format('revoke truncate, references, trigger on table public.%I from anon, authenticated',target.tablename);
 end loop;
end;
$$;

alter table public.portal_schema_migrations enable row level security;
revoke all on public.portal_schema_migrations from anon, authenticated;
revoke execute on function public.portal_can_read_node(uuid) from public, anon;
grant execute on function public.portal_can_read_node(uuid) to authenticated, service_role;

commit;
