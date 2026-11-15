begin;
create function public.portal_commission_connection(p_actor uuid,p_node uuid,p_revision integer,p_notes text) returns void language plpgsql security definer set search_path='' as $$
declare c public.portal_provider_connections; t public.portal_connection_checks;
begin
 if not exists(select 1 from public.portal_profiles where id=p_actor and role='admin' and active) then raise exception 'admin_required' using errcode='42501';end if;
 select * into c from public.portal_provider_connections where node_id=p_node for update;
 if c.revision is distinct from p_revision then raise exception 'connection_changed';end if;
 select * into t from public.portal_connection_checks where node_id=p_node and revision=p_revision;
 if not c.active or c.provider_installation_id is null or t.tested_at is null or t.tested_at<now()-interval '30 minutes' or (t.result->>'ready')::boolean is distinct from true then raise exception 'verification_required';end if;
 if length(trim(p_notes)) not between 10 and 1000 then raise exception 'confirmation_required';end if;
 update public.portal_provider_connections set verified_at=now(),verified_by=p_actor where node_id=p_node;
 update public.portal_connection_checks set result=jsonb_set(result,'{verification}',jsonb_build_object('notes',p_notes,'verified_by',p_actor,'verified_at',now())) where node_id=p_node;
 insert into public.portal_audit_events(actor_id,node_id,action,details) values(p_actor,p_node,'connection.commission',jsonb_build_object('revision',p_revision,'installation_id',c.provider_installation_id,'comparison_notes',p_notes));
end;$$;
revoke all on function public.portal_commission_connection(uuid,uuid,integer,text) from public,anon,authenticated;
grant execute on function public.portal_commission_connection(uuid,uuid,integer,text) to service_role;
commit;
