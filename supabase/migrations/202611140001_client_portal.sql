begin;
create table public.portal_profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text not null default '',
 role text not null default 'client' check (role in ('client','admin')),
 created_at timestamptz not null default now()
);
create table public.portal_communities (
 id uuid primary key default gen_random_uuid(),name text not null,created_at timestamptz not null default now()
);
create table public.portal_nodes (
 id uuid primary key default gen_random_uuid(),reference text not null unique,
 display_name text not null,community_id uuid references public.portal_communities(id),
 location_label text not null default 'Zimbabwe',timezone text not null default 'Africa/Harare',
 created_at timestamptz not null default now()
);
create table public.portal_node_memberships (
 node_id uuid not null references public.portal_nodes(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),primary key(node_id,user_id)
);
create index node_memberships_user on public.portal_node_memberships(user_id,node_id);
create table public.portal_provider_connections (
 node_id uuid primary key references public.portal_nodes(id) on delete cascade,
 provider text not null check (provider in ('victron')),
 provider_installation_id text check(provider_installation_id ~ '^[0-9]+$'),
 active boolean not null default true,created_at timestamptz not null default now()
);
-- No access tokens are stored in any client-accessible table.
create table public.portal_telemetry_snapshots (
 node_id uuid not null references public.portal_nodes(id) on delete cascade,
 reported_at timestamptz not null,ingested_at timestamptz not null default now(),
 measurements jsonb not null,primary key(node_id,reported_at)
);
create table public.portal_energy_intervals (
 node_id uuid not null references public.portal_nodes(id) on delete cascade,
 metric text not null check(metric in ('solar','consumption')),
 interval_start timestamptz not null,interval_end timestamptz not null,
 resolution text not null check(resolution in ('hours','days')),
 energy_kwh numeric not null check(energy_kwh>=0),source text not null default 'victron',
 ingested_at timestamptz not null default now(),
 check(interval_end>interval_start),primary key(node_id,metric,interval_start,resolution)
);
create index energy_intervals_history on public.portal_energy_intervals(node_id,interval_start);
create table public.portal_sync_runs (
 id bigint generated always as identity primary key,node_id uuid not null references public.portal_nodes(id),
 started_at timestamptz not null default now(),status text not null,code text
);
create table public.portal_audit_events (
 id bigint generated always as identity primary key,actor_id uuid references auth.users(id),
 node_id uuid references public.portal_nodes(id),action text not null,created_at timestamptz not null default now()
);

create function public.portal_can_read_node(target uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.portal_node_memberships m where m.node_id=target and m.user_id=(select auth.uid()))
 or exists(select 1 from public.portal_profiles p where p.id=(select auth.uid()) and p.role='admin');
$$;
revoke all on function public.portal_can_read_node(uuid) from public;
grant execute on function public.portal_can_read_node(uuid) to authenticated;

alter table public.portal_profiles enable row level security;
alter table public.portal_communities enable row level security;
alter table public.portal_nodes enable row level security;
alter table public.portal_node_memberships enable row level security;
alter table public.portal_provider_connections enable row level security;
alter table public.portal_telemetry_snapshots enable row level security;
alter table public.portal_energy_intervals enable row level security;
alter table public.portal_sync_runs enable row level security;
alter table public.portal_audit_events enable row level security;

-- Deny all browser writes, including role or membership escalation.
revoke all on public.portal_profiles,public.portal_communities,public.portal_nodes,public.portal_node_memberships,public.portal_provider_connections,public.portal_telemetry_snapshots,public.portal_energy_intervals,public.portal_sync_runs,public.portal_audit_events from anon,authenticated;
grant select on public.portal_profiles,public.portal_nodes,public.portal_node_memberships,public.portal_provider_connections,public.portal_telemetry_snapshots,public.portal_energy_intervals to authenticated;
grant all on public.portal_profiles,public.portal_communities,public.portal_nodes,public.portal_node_memberships,public.portal_provider_connections,public.portal_telemetry_snapshots,public.portal_energy_intervals,public.portal_sync_runs,public.portal_audit_events to service_role;
grant usage,select on public.portal_sync_runs_id_seq,public.portal_audit_events_id_seq to service_role;

create policy profiles_self_read on public.portal_profiles for select to authenticated using(id=(select auth.uid()));
create policy membership_self_read on public.portal_node_memberships for select to authenticated using(user_id=(select auth.uid()));
create policy nodes_assigned_read on public.portal_nodes for select to authenticated using(public.portal_can_read_node(id));
create policy connections_assigned_read on public.portal_provider_connections for select to authenticated using(public.portal_can_read_node(node_id));
create policy telemetry_assigned_read on public.portal_telemetry_snapshots for select to authenticated using(public.portal_can_read_node(node_id));
create policy energy_assigned_read on public.portal_energy_intervals for select to authenticated using(public.portal_can_read_node(node_id));

-- Disable public signups in Supabase Auth settings. The application also checks
-- verified auth.users.invited_at before granting a session access to the portal.
-- Do not add an INSERT trigger checking invited_at: Supabase sets it after
-- initially creating the auth user during its invitation transaction.
commit;
