begin;
alter table public.portal_profiles add column active boolean not null default true;
alter table public.portal_profiles add column email text;
update public.portal_profiles p set email=u.email from auth.users u where p.id=u.id;
alter table public.portal_provider_connections add column revision integer not null default 1;
alter table public.portal_provider_connections add column verified_at timestamptz;
alter table public.portal_provider_connections add column verified_by uuid references auth.users(id);
alter table public.portal_provider_connections add column last_test_at timestamptz;
alter table public.portal_provider_connections add column last_test_status text;
alter table public.portal_provider_connections add column last_sync_at timestamptz;
alter table public.portal_audit_events add column details jsonb not null default '{}';
alter table public.portal_energy_intervals drop constraint portal_energy_intervals_metric_check;
alter table public.portal_energy_intervals add check(metric in ('solar','consumption','gridImport','gridExport'));
create sequence public.portal_node_reference_seq start 2;
create index portal_sync_node_time on public.portal_sync_runs(node_id,started_at desc);
create index portal_audit_time on public.portal_audit_events(created_at desc);

-- Server-only encrypted secrets; neither clients nor admins query this directly.
create table public.portal_connection_secrets(node_id uuid primary key references public.portal_nodes(id) on delete cascade,ciphertext text not null,updated_at timestamptz not null default now());
create table public.portal_connection_checks(node_id uuid primary key references public.portal_nodes(id) on delete cascade,revision integer not null,result jsonb not null,tested_at timestamptz not null default now());
create table public.portal_platform_settings(id boolean primary key default true check(id),support_email text not null default 'hello@gridubuntu.com',low_battery_percent integer not null default 20 check(low_battery_percent between 1 and 99));
insert into public.portal_platform_settings(id) values(true);
create table public.portal_allocation_policies(id uuid primary key default gen_random_uuid(),community_id uuid not null references public.portal_communities(id),version integer not null,model text not null check(model in ('equal_share','essential_first')),battery_reserve integer not null check(battery_reserve between 0 and 100),household_limit_kw numeric not null check(household_limit_kw>0),notes text not null default '',created_by uuid references auth.users(id),created_at timestamptz not null default now(),unique(community_id,version));
create table public.portal_alert_acknowledgements(node_id uuid not null references public.portal_nodes(id),kind text not null,fingerprint text not null,actor_id uuid not null references auth.users(id),created_at timestamptz not null default now(),primary key(node_id,kind,fingerprint));
create table public.portal_forecast_runs(id uuid primary key default gen_random_uuid(),node_id uuid not null references public.portal_nodes(id),model text not null default 'hourly_median_v1',generated_at timestamptz not null default now(),training_start timestamptz not null,training_end timestamptz not null,metrics jsonb not null,predictions jsonb not null,created_by uuid references auth.users(id));
create index portal_forecast_node_time on public.portal_forecast_runs(node_id,generated_at desc);
alter table public.portal_connection_secrets enable row level security;
alter table public.portal_connection_checks enable row level security;
alter table public.portal_platform_settings enable row level security;
alter table public.portal_allocation_policies enable row level security;
alter table public.portal_alert_acknowledgements enable row level security;
alter table public.portal_forecast_runs enable row level security;
revoke all on public.portal_connection_secrets,public.portal_connection_checks,public.portal_platform_settings,public.portal_allocation_policies,public.portal_alert_acknowledgements,public.portal_forecast_runs from public,anon,authenticated;
grant all on public.portal_connection_secrets,public.portal_connection_checks,public.portal_platform_settings,public.portal_allocation_policies,public.portal_alert_acknowledgements,public.portal_forecast_runs to service_role;
grant usage,select on public.portal_node_reference_seq to service_role;

-- Pausing a client revokes direct Data API access as well as website access.
create or replace function public.portal_can_read_node(target uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.portal_profiles p where p.id=(select auth.uid()) and p.active and
 (p.role='admin' or exists(select 1 from public.portal_node_memberships m where m.user_id=p.id and m.node_id=target)));
$$;
revoke execute on function public.portal_can_read_node(uuid) from public,anon;
grant execute on function public.portal_can_read_node(uuid) to authenticated,service_role;
alter policy membership_self_read on public.portal_node_memberships using(user_id=(select auth.uid()) and exists(select 1 from public.portal_profiles p where p.id=(select auth.uid()) and p.active));
alter table public.portal_schema_migrations enable row level security;
revoke all on public.portal_schema_migrations from public,anon,authenticated;

-- Only the server service role can execute mutations, and every mutation also
-- checks a real, active administrator. Data writes and audit entries are atomic.
create function public.portal_admin_write(p_actor uuid,p_action text,p_payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare nid uuid; uid uuid; cid uuid; rid uuid; current_connection public.portal_provider_connections; revision_value integer; result jsonb; detail jsonb := '{}';
begin
 if not exists(select 1 from public.portal_profiles where id=p_actor and role='admin' and active) then raise exception 'admin_required' using errcode='42501';end if;
 nid=nullif(p_payload->>'node_id','')::uuid;
 uid=nullif(p_payload->>'user_id','')::uuid;
 cid=nullif(p_payload->>'community_id','')::uuid;
 if p_action='node.save' then
  if length(trim(p_payload->>'display_name')) not between 2 and 120 then raise exception 'invalid_name';end if;
  if nid is null then
   insert into public.portal_nodes(reference,display_name,community_id,location_label) values('GU-ZW-'||lpad(nextval('public.portal_node_reference_seq')::text,4,'0'),trim(p_payload->>'display_name'),cid,p_payload->>'location_label') returning id into nid;
   insert into public.portal_provider_connections(node_id,provider) values(nid,'victron');
  else
   update public.portal_nodes set display_name=trim(p_payload->>'display_name'),community_id=cid,location_label=p_payload->>'location_label' where id=nid;if not found then raise exception 'not_found';end if;
  end if;
  detail=jsonb_build_object('display_name',p_payload->>'display_name');
 elsif p_action='community.save' then
  if length(trim(p_payload->>'name')) not between 2 and 120 then raise exception 'invalid_name';end if;
  if cid is null then insert into public.portal_communities(name) values(trim(p_payload->>'name')) returning id into cid;
  else update public.portal_communities set name=trim(p_payload->>'name') where id=cid;if not found then raise exception 'not_found';end if;end if;
  detail=jsonb_build_object('community_id',cid,'name',p_payload->>'name');
 elsif p_action='client.save' then
  if not exists(select 1 from auth.users where id=uid and invited_at is not null) or exists(select 1 from public.portal_profiles where id=uid and role='admin') then raise exception 'invalid_client';end if;
  insert into public.portal_profiles(id,full_name,email) select uid,p_payload->>'full_name',email from auth.users where id=uid on conflict(id) do update set full_name=excluded.full_name,email=excluded.email;
  if nid is not null then insert into public.portal_node_memberships(node_id,user_id) values(nid,uid) on conflict do nothing;end if;
  detail=jsonb_build_object('user_id',uid);
 elsif p_action='client.access' then
  update public.portal_profiles set active=(p_payload->>'active')::boolean where id=uid and role='client';if not found then raise exception 'invalid_client';end if;
  detail=jsonb_build_object('user_id',uid,'active',(p_payload->>'active')::boolean);
 elsif p_action in ('membership.add','membership.remove') then
  if not exists(select 1 from public.portal_profiles where id=uid and role='client') then raise exception 'invalid_client';end if;
  if p_action='membership.add' then insert into public.portal_node_memberships(node_id,user_id) values(nid,uid) on conflict do nothing;
  else delete from public.portal_node_memberships where node_id=nid and user_id=uid;end if;
  detail=jsonb_build_object('user_id',uid);
 elsif p_action in ('connection.token','connection.select','connection.pause','connection.check','connection.commission') then
  select * into current_connection from public.portal_provider_connections where node_id=nid for update;
  if not found then raise exception 'not_found';end if;
  if current_connection.revision<>(p_payload->>'revision')::integer then raise exception 'connection_changed';end if;
  if p_action='connection.token' then
   insert into public.portal_connection_secrets(node_id,ciphertext) values(nid,p_payload->>'ciphertext') on conflict(node_id) do update set ciphertext=excluded.ciphertext,updated_at=now();
   update public.portal_provider_connections set revision=revision+1,verified_at=null,verified_by=null,last_test_at=null,last_test_status=null,active=true where node_id=nid;
  elsif p_action='connection.select' then
   if current_connection.provider_installation_id is distinct from (p_payload->>'installation_id') and (exists(select 1 from public.portal_telemetry_snapshots where node_id=nid) or exists(select 1 from public.portal_energy_intervals where node_id=nid)) then raise exception 'history_mapping_locked';end if;
   update public.portal_provider_connections set provider_installation_id=p_payload->>'installation_id',revision=revision+1,verified_at=null,verified_by=null,last_test_at=null,last_test_status=null,active=true where node_id=nid;
  elsif p_action='connection.pause' then
   update public.portal_provider_connections set active=false,verified_at=null,verified_by=null,revision=revision+1 where node_id=nid;
  elsif p_action='connection.check' then
   insert into public.portal_connection_checks(node_id,revision,result) values(nid,current_connection.revision,p_payload->'result') on conflict(node_id) do update set revision=excluded.revision,result=excluded.result,tested_at=now();
   update public.portal_provider_connections set last_test_at=now(),last_test_status=case when (p_payload->'result'->>'ready')::boolean then 'passed' else 'needs_review' end where node_id=nid;
  else
   if not current_connection.active or current_connection.provider_installation_id is null or not exists(select 1 from public.portal_connection_checks where node_id=nid and revision=current_connection.revision and tested_at>now()-interval '30 minutes' and (result->>'ready')::boolean) then raise exception 'verification_required';end if;
   if length(trim(p_payload->>'notes'))<10 or (p_payload->>'confirmed')::boolean is distinct from true then raise exception 'confirmation_required';end if;
   update public.portal_provider_connections set verified_at=now(),verified_by=p_actor where node_id=nid;
  end if;
  detail=jsonb_build_object('revision',current_connection.revision,'installation_id',case when p_action='connection.select' then p_payload->>'installation_id' else current_connection.provider_installation_id end);
 elsif p_action='policy.save' then
  perform pg_advisory_xact_lock(hashtextextended(cid::text,761115));
  select coalesce(max(version),0)+1 into revision_value from public.portal_allocation_policies where community_id=cid;
  insert into public.portal_allocation_policies(community_id,version,model,battery_reserve,household_limit_kw,notes,created_by) values(cid,revision_value,p_payload->>'model',(p_payload->>'battery_reserve')::int,(p_payload->>'household_limit_kw')::numeric,p_payload->>'notes',p_actor) returning id into rid;
  detail=jsonb_build_object('community_id',cid,'version',revision_value,'policy_id',rid);
 elsif p_action='settings.save' then
  update public.portal_platform_settings set support_email=p_payload->>'support_email',low_battery_percent=(p_payload->>'low_battery_percent')::int where id=true;
 elsif p_action='alert.ack' then
  insert into public.portal_alert_acknowledgements(node_id,kind,fingerprint,actor_id) values(nid,p_payload->>'kind',p_payload->>'fingerprint',p_actor) on conflict do nothing;
  detail=jsonb_build_object('kind',p_payload->>'kind','fingerprint',p_payload->>'fingerprint');
 elsif p_action='forecast.save' then
  insert into public.portal_forecast_runs(node_id,training_start,training_end,metrics,predictions,created_by) values(nid,(p_payload->>'training_start')::timestamptz,(p_payload->>'training_end')::timestamptz,p_payload->'metrics',p_payload->'predictions',p_actor) returning id into rid;
  detail=jsonb_build_object('forecast_id',rid);
 elsif p_action in ('client.link_created','connection.synced') then detail=jsonb_build_object('user_id',uid);
 else raise exception 'unsupported_action';end if;
 insert into public.portal_audit_events(actor_id,node_id,action,details) values(p_actor,nid,p_action,detail);
 return jsonb_build_object('node_id',nid,'community_id',cid,'id',rid);
end;
$$;
revoke all on function public.portal_admin_write(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.portal_admin_write(uuid,text,jsonb) to service_role;

-- Required now that real administrative access is being introduced.
alter policy settings_operator_all on public.system_settings using(public.auth_user_role() in ('operator','service_role')) with check(public.auth_user_role() in ('operator','service_role'));
do $$ declare item record;begin for item in select tablename from pg_tables where schemaname='public' loop execute format('revoke truncate,references,trigger on public.%I from anon,authenticated',item.tablename);end loop;end;$$;
commit;
