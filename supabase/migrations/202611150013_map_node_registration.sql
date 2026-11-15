begin;
create function public.portal_register_map_node(p_actor uuid,p_payload jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare saved jsonb;nid uuid;uid uuid:=nullif(p_payload->>'user_id','')::uuid;
begin
 if not exists(select 1 from public.portal_profiles where id=p_actor and role='admin' and active) then raise exception 'admin_required' using errcode='42501';end if;
 if length(trim(coalesce(p_payload->>'location_label',''))) not between 1 and 120 or p_payload->>'latitude' is null or p_payload->>'longitude' is null then raise exception 'invalid_location';end if;
 saved=public.portal_admin_write(p_actor,'node.save',p_payload-'node_id');nid=(saved->>'node_id')::uuid;
 perform public.portal_set_node_location(p_actor,nid,(p_payload->>'latitude')::double precision,(p_payload->>'longitude')::double precision);
 if uid is not null then perform public.portal_admin_write(p_actor,'membership.add',jsonb_build_object('user_id',uid,'node_id',nid));end if;
 return nid;
end;$$;
revoke all on function public.portal_register_map_node(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.portal_register_map_node(uuid,jsonb) to service_role;
commit;
