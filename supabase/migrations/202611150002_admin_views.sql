begin;
create view public.portal_latest_snapshots with(security_invoker=true) as select distinct on(node_id) node_id,reported_at,measurements from public.portal_telemetry_snapshots order by node_id,reported_at desc;
create view public.portal_latest_syncs with(security_invoker=true) as select distinct on(node_id) node_id,started_at,status,code from public.portal_sync_runs order by node_id,started_at desc;
revoke all on public.portal_latest_snapshots,public.portal_latest_syncs from public,anon,authenticated;
grant select on public.portal_latest_snapshots,public.portal_latest_syncs to service_role;
commit;
