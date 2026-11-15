begin;
-- Model one physical VRM installation as one active node. Share its client
-- memberships instead of duplicating the same aggregate energy measurements.
create unique index portal_unique_active_installation on public.portal_provider_connections(provider,provider_installation_id) where active and provider_installation_id is not null;
commit;
