begin;
create view public.portal_client_directory with(security_barrier=true) as select p.id,p.full_name,p.email,p.role,p.active,p.created_at,u.invited_at,u.email_confirmed_at,u.last_sign_in_at from public.portal_profiles p join auth.users u on u.id=p.id;
revoke all on public.portal_client_directory from public,anon,authenticated;
grant select on public.portal_client_directory to service_role;
commit;
