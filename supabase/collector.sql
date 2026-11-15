-- Called only by Postgres cron or the trusted service role. Credentials are
-- resolved from Vault at runtime and are never embedded in the cron command.
create or replace function public.portal_enqueue_collection() returns bigint
language plpgsql security definer set search_path='' as $$
declare secret text;site_access text;endpoint text;request_id bigint;previous_id bigint;http_status integer;
begin
 select decrypted_secret into secret from vault.decrypted_secrets where name='gridubuntu_collector_authorization';
 select decrypted_secret into site_access from vault.decrypted_secrets where name='gridubuntu_site_service_access';
 select site_url,last_request_id into endpoint,previous_id from public.portal_collector_state where id=true;
 if secret is null or endpoint is null then raise exception 'collector_configuration_missing';end if;
 select status_code into http_status from net._http_response where id=previous_id;
 select net.http_post(url:=endpoint||'/api/internal/ingest',headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||secret)||case when site_access is null then '{}'::jsonb else jsonb_build_object('OAI-Sites-Authorization','Bearer '||site_access) end,body:='{}'::jsonb,timeout_milliseconds:=120000) into request_id;
 update public.portal_collector_state set last_enqueued_at=now(),last_request_id=request_id,last_http_status=coalesce(http_status,last_http_status) where id=true;
 return request_id;
end;$$;
revoke all on function public.portal_enqueue_collection() from public,anon,authenticated;
grant execute on function public.portal_enqueue_collection() to service_role;
create or replace function public.portal_set_collector_enabled(p_actor uuid,p_enabled boolean) returns void language plpgsql security definer set search_path='' as $$
declare target bigint;
begin
 if not exists(select 1 from public.portal_profiles where id=p_actor and role='admin' and active) then raise exception 'admin_required' using errcode='42501';end if;
 select job_id into target from public.portal_collector_state where id=true;
 if target is null then raise exception 'collector_configuration_missing';end if;
 update cron.job set active=p_enabled where jobid=target;
 if not found then raise exception 'collector_configuration_missing';end if;
 update public.portal_collector_state set enabled=p_enabled where id=true;
 insert into public.portal_audit_events(actor_id,action,details) values(p_actor,'collector.schedule_changed',jsonb_build_object('enabled',p_enabled));
end;$$;
revoke all on function public.portal_set_collector_enabled(uuid,boolean) from public,anon,authenticated;
grant execute on function public.portal_set_collector_enabled(uuid,boolean) to service_role;
