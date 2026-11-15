begin;
alter table public.portal_nodes add column telemetry_mode text not null default 'measured'
 check (telemetry_mode in ('measured','prototype'));
-- Enable only the existing uncommissioned pilot. Other nodes stay measured.
update public.portal_nodes n set telemetry_mode='prototype'
where n.reference='GU-ZW-0001'
 and not exists(select 1 from public.portal_provider_connections c where c.node_id=n.id and c.verified_at is not null)
 and not exists(select 1 from public.portal_telemetry_snapshots s where s.node_id=n.id);
commit;
