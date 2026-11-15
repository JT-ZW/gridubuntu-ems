begin;
create table public.portal_energy_accounts(
 node_id uuid references public.portal_nodes(id),user_id uuid references public.portal_profiles(id),
 enabled boolean not null default true,daily_limit_kwh numeric not null check(daily_limit_kwh between 0 and 10000),
 max_power_kw numeric not null check(max_power_kw>0 and max_power_kw<=1000),priority integer not null check(priority between 1 and 10),
 valid_from timestamptz,valid_until timestamptz,revision integer not null default 1,updated_at timestamptz not null default now(),
 primary key(node_id,user_id),check(valid_until is null or valid_from is null or valid_until>valid_from)
);
create table public.portal_energy_token_ledger(
 id uuid primary key, node_id uuid not null,user_id uuid not null,delta_kwh numeric not null check(delta_kwh<>0 and abs(delta_kwh)<=100000),
 reason text not null check(length(trim(reason)) between 5 and 500),created_by uuid not null references auth.users(id),created_at timestamptz not null default now(),
 foreign key(node_id,user_id) references public.portal_energy_accounts(node_id,user_id)
);
alter table public.portal_energy_accounts enable row level security;
alter table public.portal_energy_token_ledger enable row level security;
revoke all on public.portal_energy_accounts,public.portal_energy_token_ledger from public,anon,authenticated;
grant select,insert,update on public.portal_energy_accounts to service_role;
grant select,insert on public.portal_energy_token_ledger to service_role;
create view public.portal_energy_balances with(security_invoker=true) as select node_id,user_id,sum(delta_kwh) as balance_kwh from public.portal_energy_token_ledger group by node_id,user_id;
revoke all on public.portal_energy_balances from public,anon,authenticated;
grant select on public.portal_energy_balances to service_role;
create function public.portal_manual_energy(p_actor uuid,p_action text,p_payload jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare nid uuid:=(p_payload->>'node_id')::uuid;uid uuid:=(p_payload->>'user_id')::uuid;rev integer;amount numeric;balance numeric;entry public.portal_energy_token_ledger;
begin
 if not exists(select 1 from public.portal_profiles where id=p_actor and role='admin' and active) then raise exception 'admin_required' using errcode='42501';end if;
 if not exists(select 1 from public.portal_node_memberships m join public.portal_profiles p on p.id=m.user_id where m.node_id=nid and m.user_id=uid and p.role='client' and p.active) then raise exception 'invalid_client';end if;
 perform pg_advisory_xact_lock(hashtextextended(nid::text||uid::text,0));
 if p_action='entitlement.save' then
  select revision into rev from public.portal_energy_accounts where node_id=nid and user_id=uid;
  if coalesce(rev,0)<>(p_payload->>'revision')::integer then raise exception 'connection_changed';end if;
  insert into public.portal_energy_accounts(node_id,user_id,enabled,daily_limit_kwh,max_power_kw,priority,valid_from,valid_until)
  values(nid,uid,(p_payload->>'enabled')::boolean,(p_payload->>'daily_limit_kwh')::numeric,(p_payload->>'max_power_kw')::numeric,(p_payload->>'priority')::integer,nullif(p_payload->>'valid_from','')::timestamptz,nullif(p_payload->>'valid_until','')::timestamptz)
  on conflict(node_id,user_id) do update set enabled=excluded.enabled,daily_limit_kwh=excluded.daily_limit_kwh,max_power_kw=excluded.max_power_kw,priority=excluded.priority,valid_from=excluded.valid_from,valid_until=excluded.valid_until,revision=portal_energy_accounts.revision+1,updated_at=now();
 elsif p_action='token.adjust' then
  amount:=(p_payload->>'delta_kwh')::numeric;
  select * into entry from public.portal_energy_token_ledger where id=(p_payload->>'request_id')::uuid;
  if found then
   if entry.node_id=nid and entry.user_id=uid and entry.delta_kwh=amount and entry.reason=p_payload->>'reason' and entry.created_by=p_actor then return;end if;
   raise exception 'request_conflict';
  end if;
  if not exists(select 1 from public.portal_energy_accounts where node_id=nid and user_id=uid) then raise exception 'account_required';end if;
  select coalesce(sum(delta_kwh),0) into balance from public.portal_energy_token_ledger where node_id=nid and user_id=uid;
  if balance+amount<0 then raise exception 'insufficient_energy_credit';end if;
  insert into public.portal_energy_token_ledger(id,node_id,user_id,delta_kwh,reason,created_by) values((p_payload->>'request_id')::uuid,nid,uid,amount,p_payload->>'reason',p_actor);
 else raise exception 'unsupported_operation';end if;
 insert into public.portal_audit_events(actor_id,node_id,action,details) values(p_actor,nid,p_action,p_payload);
end;$$;
create function public.portal_onboard_victron(p_actor uuid,p_node uuid,p_payload jsonb,p_ciphertext text,p_check jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare uid uuid:=nullif(p_payload->>'user_id','')::uuid;
begin
 if not exists(select 1 from public.portal_profiles where id=p_actor and role='admin' and active) then raise exception 'admin_required' using errcode='42501';end if;
 if length(trim(p_payload->>'display_name')) not between 2 and 120 or length(trim(p_payload->>'location_label')) not between 1 and 120 or p_payload->>'installation_id' !~ '^\d{1,24}$' or p_ciphertext is null or p_ciphertext not like 'v1.%' then raise exception 'invalid_node';end if;
 if uid is not null and not exists(select 1 from public.portal_profiles p join auth.users u on u.id=p.id where p.id=uid and p.role='client' and p.active and u.invited_at is not null) then raise exception 'invalid_client';end if;
 insert into public.portal_nodes(id,reference,display_name,community_id,location_label,latitude,longitude) values(p_node,'GU-ZW-'||lpad(nextval('public.portal_node_reference_seq')::text,4,'0'),trim(p_payload->>'display_name'),nullif(p_payload->>'community_id','')::uuid,p_payload->>'location_label',(p_payload->>'latitude')::double precision,(p_payload->>'longitude')::double precision);
 insert into public.portal_provider_connections(node_id,provider,provider_installation_id,last_test_at,last_test_status) values(p_node,'victron',p_payload->>'installation_id',now(),p_check->>'status');
 insert into public.portal_connection_secrets(node_id,ciphertext) values(p_node,p_ciphertext);
 insert into public.portal_connection_checks(node_id,revision,result,tested_at) values(p_node,1,p_check,now());
 if uid is not null then insert into public.portal_node_memberships(node_id,user_id) values(p_node,uid);end if;
 insert into public.portal_audit_events(actor_id,node_id,action,details) values(p_actor,p_node,'node.onboarded',p_payload);
end;$$;
revoke all on function public.portal_manual_energy(uuid,text,jsonb),public.portal_onboard_victron(uuid,uuid,jsonb,text,jsonb) from public,anon,authenticated;
grant execute on function public.portal_manual_energy(uuid,text,jsonb),public.portal_onboard_victron(uuid,uuid,jsonb,text,jsonb) to service_role;
commit;
