# Hosted prototype telemetry

The pilot uses `portal_nodes.telemetry_mode = 'prototype'`. This explicit database
setting works on HTTPS deployments without the localhost-only test flag or a
Vercel environment change. Other nodes default to `measured`.

Migration `202611150014_live_prototype_mode.sql` enables the existing pilot only
if it has neither a verified connection nor measured snapshots. Apply this
migration to the database before deploying code that selects the new column.

Authenticated clients still see only assigned nodes. Both portals use the same
generator and update the presentation every three seconds. Generated readings
are not stored as measured history or used for saved forecasts. Provider setup
and collection actions remain blocked for prototype nodes.

Before connecting this pilot to real equipment, change its `telemetry_mode` to
`measured` in Supabase, then complete normal provider verification. Explicit
measured mode also overrides the legacy local test flag.

The original deployment issue occurred because `simulationEnabled` accepted
only loopback hosts. Hosted prototype mode is now covered by regression tests.
