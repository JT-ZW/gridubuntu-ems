begin;
create table public.portal_collector_state(id boolean primary key default true check(id),enabled boolean not null default false,schedule text not null default '*/15 * * * *',job_id bigint,site_url text,last_enqueued_at timestamptz,last_request_id bigint,last_http_status integer);
alter table public.portal_collector_state enable row level security;
revoke all on public.portal_collector_state from public,anon,authenticated;
grant all on public.portal_collector_state to service_role;
insert into public.portal_collector_state(id) values(true);
commit;
