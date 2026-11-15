begin;
create table public.portal_contact_enquiries (
 id uuid primary key default gen_random_uuid(),request_id uuid not null unique,
 created_at timestamptz not null default now(),name text not null check(length(name) between 1 and 120),
 email text not null check(length(email) between 3 and 254),organisation text not null default '' check(length(organisation)<=120),
 phone text not null default '' check(length(phone)<=40),enquiry text not null,message text not null check(length(message) between 10 and 4000),
 consent_at timestamptz not null default now(),rate_key text not null,
 status text not null default 'new' check(status in ('new','reviewed','resolved')),
 notification_status text not null default 'pending' check(notification_status in ('pending','not_configured','sent','failed')),notified_at timestamptz
);
create index portal_contact_rate_window on public.portal_contact_enquiries(rate_key,created_at);
create index portal_contact_recent on public.portal_contact_enquiries(created_at desc);
alter table public.portal_contact_enquiries enable row level security;
revoke all on public.portal_contact_enquiries from public,anon,authenticated;
grant select,insert,update on public.portal_contact_enquiries to service_role;
create function public.portal_submit_enquiry(p_payload jsonb,p_rate_key text,p_request uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if p_rate_key !~ '^[a-f0-9]{64}$' or p_rate_key is null then raise exception 'invalid_request';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_rate_key,76111512));
 if exists(select 1 from public.portal_contact_enquiries where request_id=p_request and rate_key=p_rate_key) then return;end if;
 if (select count(*) from public.portal_contact_enquiries where rate_key=p_rate_key and created_at>now()-interval '15 minutes')>=3 then raise exception 'rate_limited';end if;
 insert into public.portal_contact_enquiries(request_id,name,email,organisation,phone,enquiry,message,rate_key)
 values(p_request,p_payload->>'name',p_payload->>'email',coalesce(p_payload->>'organisation',''),coalesce(p_payload->>'phone',''),p_payload->>'enquiry',p_payload->>'message',p_rate_key);
end;$$;
create function public.portal_enquiry_status(p_actor uuid,p_id uuid,p_status text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.portal_profiles where id=p_actor and role='admin' and active) then raise exception 'admin_required' using errcode='42501';end if;
 update public.portal_contact_enquiries set status=p_status where id=p_id;if not found then raise exception 'not_found';end if;
 insert into public.portal_audit_events(actor_id,action,details) values(p_actor,'contact.status_updated',jsonb_build_object('enquiry_id',p_id,'status',p_status));
end;$$;
revoke all on function public.portal_submit_enquiry(jsonb,text,uuid),public.portal_enquiry_status(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.portal_submit_enquiry(jsonb,text,uuid),public.portal_enquiry_status(uuid,uuid,text) to service_role;
commit;
