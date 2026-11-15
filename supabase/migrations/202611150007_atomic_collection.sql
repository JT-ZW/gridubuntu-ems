begin;
alter table public.portal_provider_connections add column last_attempt_at timestamptz;
create function public.portal_store_collection(p_node uuid,p_revision integer,p_snapshot jsonb,p_intervals jsonb,p_status text) returns void
language plpgsql security definer set search_path='' as $$
declare c public.portal_provider_connections;
begin
 select * into c from public.portal_provider_connections where node_id=p_node for update;
 if c.revision is distinct from p_revision or not c.active or c.verified_at is null then raise exception 'connection_changed';end if;
 if p_status not in ('connected','partial') or jsonb_typeof(p_snapshot->'metrics') is distinct from 'object' or p_snapshot->>'reportedAt' is null then raise exception 'invalid_collection';end if;
 insert into public.portal_telemetry_snapshots(node_id,reported_at,measurements) values(p_node,(p_snapshot->>'reportedAt')::timestamptz,p_snapshot->'metrics') on conflict(node_id,reported_at) do update set measurements=excluded.measurements,ingested_at=now();
 insert into public.portal_energy_intervals(node_id,metric,interval_start,interval_end,resolution,energy_kwh)
 select p_node,x.metric,x.interval_start,x.interval_end,x.resolution,x.energy_kwh from jsonb_to_recordset(p_intervals) as x(metric text,interval_start timestamptz,interval_end timestamptz,resolution text,energy_kwh numeric)
 on conflict(node_id,metric,interval_start,resolution) do update set energy_kwh=excluded.energy_kwh,interval_end=excluded.interval_end,ingested_at=now();
 insert into public.portal_sync_runs(node_id,status) values(p_node,p_status);
 update public.portal_provider_connections set last_sync_at=now() where node_id=p_node;
end;$$;
revoke all on function public.portal_store_collection(uuid,integer,jsonb,jsonb,text) from public,anon,authenticated;
grant execute on function public.portal_store_collection(uuid,integer,jsonb,jsonb,text) to service_role;
commit;
