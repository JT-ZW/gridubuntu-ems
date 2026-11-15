begin;
create function public.portal_admin_role_change(p_actor uuid,p_target uuid,p_role text,p_active boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.portal_profiles where id=p_actor and role='admin' and active) then raise exception 'admin_required' using errcode='42501';end if;
 if p_target=p_actor then raise exception 'self_access_change_forbidden';end if;
 if p_role not in ('admin','client') or p_active is null then raise exception 'invalid_role';end if;
 update public.portal_profiles set role=p_role,active=p_active where id=p_target;
 if not found then raise exception 'not_found';end if;
 insert into public.portal_audit_events(actor_id,action,details) values(p_actor,'admin.access_changed',jsonb_build_object('user_id',p_target,'role',p_role,'active',p_active));
end;$$;
create function public.portal_admin_remove_credential(p_actor uuid,p_node uuid,p_revision integer) returns void language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.portal_profiles where id=p_actor and role='admin' and active) then raise exception 'admin_required' using errcode='42501';end if;
 update public.portal_provider_connections set active=false,verified_at=null,verified_by=null,revision=revision+1 where node_id=p_node and revision=p_revision;
 if not found then raise exception 'connection_changed';end if;
 delete from public.portal_connection_secrets where node_id=p_node;
 insert into public.portal_audit_events(actor_id,node_id,action) values(p_actor,p_node,'connection.credential_removed');
end;$$;
revoke all on function public.portal_admin_role_change(uuid,uuid,text,boolean),public.portal_admin_remove_credential(uuid,uuid,integer) from public,anon,authenticated;
grant execute on function public.portal_admin_role_change(uuid,uuid,text,boolean),public.portal_admin_remove_credential(uuid,uuid,integer) to service_role;
commit;
