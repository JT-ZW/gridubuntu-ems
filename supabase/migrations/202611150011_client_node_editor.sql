begin;
-- Save the client and all submitted node locations in a single transaction.
-- Existing memberships are retained; assigning additional nodes is additive.
create function public.portal_save_client_details(p_actor uuid,p_payload jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare uid uuid:=(p_payload->>'user_id')::uuid; item jsonb; nid uuid; saved jsonb; fullname text:=trim(p_payload->>'full_name');
begin
 if not exists(select 1 from public.portal_profiles where id=p_actor and role='admin' and active) then raise exception 'admin_required' using errcode='42501';end if;
 if fullname is null or length(fullname) not between 1 and 120 or jsonb_typeof(p_payload->'nodes') is distinct from 'array' then raise exception 'invalid_details';end if;
 if jsonb_array_length(p_payload->'nodes')>100 then raise exception 'invalid_details';end if;
 perform 1 from public.portal_profiles where id=uid and role='client' for update;
 if not found then raise exception 'invalid_client';end if;
 perform public.portal_admin_write(p_actor,'client.save',jsonb_build_object('user_id',uid,'full_name',fullname));
 -- Lock existing nodes in a stable order when several clients share systems.
 perform 1 from public.portal_nodes where id in (select nullif(value->>'node_id','')::uuid from jsonb_array_elements(p_payload->'nodes')) order by id for update;
 for item in select value from jsonb_array_elements(p_payload->'nodes') loop
  nid=nullif(item->>'node_id','')::uuid;
  if length(trim(coalesce(item->>'display_name',''))) not between 2 and 120 or length(trim(coalesce(item->>'location_label',''))) not between 1 and 120 then raise exception 'invalid_details';end if;
  if nid is null then
   saved=public.portal_admin_write(p_actor,'node.save',jsonb_build_object('display_name',trim(item->>'display_name'),'location_label',trim(item->>'location_label')));
   nid=(saved->>'node_id')::uuid;
  else
   update public.portal_nodes set display_name=trim(item->>'display_name'),location_label=trim(item->>'location_label') where id=nid;
   if not found then raise exception 'not_found';end if;
   insert into public.portal_audit_events(actor_id,node_id,action,details) values(p_actor,nid,'node.registration_updated',jsonb_build_object('display_name',item->>'display_name','location_label',item->>'location_label'));
  end if;
  perform public.portal_set_node_location(p_actor,nid,(item->>'latitude')::double precision,(item->>'longitude')::double precision);
  perform public.portal_admin_write(p_actor,'membership.add',jsonb_build_object('user_id',uid,'node_id',nid));
 end loop;
end;$$;
revoke all on function public.portal_save_client_details(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.portal_save_client_details(uuid,jsonb) to service_role;
commit;
