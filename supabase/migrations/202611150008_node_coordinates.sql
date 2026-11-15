begin;
alter table public.portal_nodes add column latitude double precision, add column longitude double precision;
alter table public.portal_nodes add constraint portal_nodes_coordinates_valid check (
 (latitude is null and longitude is null) or
 (latitude is not null and longitude is not null and latitude between -90 and 90 and longitude between -180 and 180)
);
create function public.portal_set_node_location(p_actor uuid,p_node uuid,p_latitude double precision,p_longitude double precision) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.portal_profiles where id=p_actor and role='admin' and active) then raise exception 'admin_required' using errcode='42501';end if;
 update public.portal_nodes set latitude=p_latitude,longitude=p_longitude where id=p_node;
 if not found then raise exception 'not_found';end if;
 insert into public.portal_audit_events(actor_id,node_id,action,details) values(p_actor,p_node,'node.location_updated',jsonb_build_object('latitude',p_latitude,'longitude',p_longitude));
end;$$;
revoke all on function public.portal_set_node_location(uuid,uuid,double precision,double precision) from public,anon,authenticated;
grant execute on function public.portal_set_node_location(uuid,uuid,double precision,double precision) to service_role;
commit;
