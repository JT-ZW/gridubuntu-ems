# Supabase review — 14 November 2026

## Decision

The existing Supabase project can support the new EMS. Its legacy schema should not become the new portal's data model unchanged. Keep the new `portal_` model as the pilot's source of truth, harden legacy access, then migrate verified legacy data deliberately. A new Supabase project is optional, not a technical requirement.

This review inspected live public-schema metadata, row counts, grants, policies, constraints, indexes and function privileges. No customer records or setting values were read. No legacy table or policy was changed. Detailed metadata is saved in the ignored `.private/database-audit.json`; it is not published.

## What exists

There are 27 public tables: 17 legacy tables and 10 portal tables (including the migration ledger).

| Area | Actual database state | Fit for the new EMS |
| --- | --- | --- |
| Legacy hardware | `nodes`: 3 records; hardware MAC address is required; watt limits, relay state and token balance are held on the node | Useful ESP32 prototype concepts, but unsuitable as the only model for a Victron installation, which is not identified by a required ESP32 MAC address |
| Legacy usage | `usage_logs`: 848 records; watts, kWh consumed, token balance and one recording time | Preserve for investigation. Verify origin, sampling intervals and kWh semantics before importing or training models |
| Legacy control | `relay_commands`: 319 records; `token_transactions`: empty | Keep separate from the read-only Victron client portal. A control history does not establish safe physical energy sharing |
| Other legacy features | Incident, feeder, substation, spatial and risk-prediction tables | These support a different asset/incident workflow. `risk_predictions` is not a household demand-forecasting model |
| Client identity | One portal profile, one membership and one pilot residence | Appropriate invitation-only pilot foundation; identity remains in Supabase Auth |
| Provider mapping | One `portal_provider_connections` record; installation selection pending | Correctly separates GridUbuntu's node UUID/reference from Victron's numeric `idSite`; no API token in this client-readable table |
| Telemetry/history | `portal_telemetry_snapshots` and `portal_energy_intervals`: empty | Appropriate starting point for measured data. The graphical preview is sample data; no real history has been collected yet |
| Operations | `portal_sync_runs`, `portal_audit_events`: empty | Foundations exist, but a running collector, administration and audit coverage must still be completed |

## Access findings

1. **High priority: legacy settings allow every authenticated user to read and change settings.** `settings_operator_all` on `system_settings` uses `auth.role() = 'authenticated'` for `ALL`. A read-only test with an unassigned authenticated identity could see all 44 settings. The same policy permits writes when combined with the existing grants. No write was attempted. The policy name does not enforce operator access.
2. **Legacy incidents are publicly readable.** `incidents_anon_read` uses `true` for anonymous SELECT, and anonymous SELECT is granted. Confirm whether this is intentional for the previous application before removing it. No incident contents were read.
3. **Legacy table privileges are broader than required.** Browser roles have privileges including TRUNCATE, REFERENCES and TRIGGER on legacy tables. RLS does not protect TRUNCATE. Remove these unnecessary privileges; this finding does not mean PostgREST currently exposes a truncate endpoint.
4. **New portal isolation is materially better.** All nine portal domain tables have RLS enabled. Clients have only SELECT on the six client-facing tables, with membership checks; they have no browser writes and no access to audit/sync tables. Existing RLS tests verify cross-client isolation and denied self-promotion.
5. **Small portal hardening:** the migration ledger has no browser grants but lacks RLS; `portal_can_read_node` has an inherited direct anonymous EXECUTE grant. Both can be tightened. Neither currently grants an anonymous client access to portal records.
6. **Two authorization conventions coexist.** Legacy EMS policies use `app_metadata.role` through `auth_user_role()`, some incident policies use the JWT's top-level role, and the portal uses `portal_profiles.role` plus memberships. Consolidate trusted operator/admin role checks before building the admin portal. Client-editable metadata must never grant an administrator role.

`docs/sql/reviewed-access-adjustments.sql` contains a concrete, transaction-wrapped correction. It has **not been applied**: it changes access used by the previous application. Review the intended legacy operators and public incident workflow first. It preserves legacy operator/service access while removing general-client settings access. It deliberately leaves the existing anonymous incident policy unchanged pending that product decision. The proposal was tested against this database inside a rolled-back transaction: an ordinary client saw no settings, the legacy operator retained access to all 44 settings, and unnecessary TRUNCATE/anonymous helper privileges were removed. All schema changes from that test were rolled back.

## Required next work

### Before using the pilot with real customers

- Apply the reviewed access correction and verify that legitimate legacy operators still work. Decide whether anonymous incident reading is intended.
- Confirm the invitation-only Auth configuration, email templates/SMTP and allowed redirects for `app.gridubuntu.com`. The portal's invited-account and membership checks do not globally disable signup in a shared Supabase project.
- Select Genius's actual VRM installation and verify its system-level measurement mappings, timestamps, units and energy totals against VRM. Only then enable commissioned data display.
- Schedule the existing authenticated ingestion endpoint. API polling alone does not build persistent training history. Set an independent ingestion secret and collect both hourly and daily intervals without double-counting overlapping resolutions.
- Keep API credentials server-only. For multiple nodes, replace the single pilot environment token with a server-only encrypted secret store (for example Supabase Vault) and a private connection-to-secret reference. Never add a token column to the client-readable provider connection table.

### Before multi-node operation and forecasting

- Add per-connection commissioning state, verification date, metric mapping version, token reference and last successful sync. Current commissioning and token configuration are deliberately pilot-wide environment settings.
- Add measured grid import/export intervals alongside solar and consumption. The current provider response can show grid totals, but persisted history currently stores only solar and consumption.
- Record interval completeness, quality, provisional/final state, provider update time and provenance. A partial sum must not be treated as complete daily demand. Preserve outages and missing readings as gaps.
- Add weather observations/forecasts, model versions, training-window metadata, forecast issue/target times and prediction intervals. Store evaluation against seasonal/day-of-week baselines; do not treat the legacy incident-risk table as an energy-demand model.
- Define retention/partitioning once sampling volume is known. Existing node/time keys support the pilot. Add operational indexes as sync/audit volume grows.
- Migrate legacy nodes and memberships through an explicit mapping table, validate ownership and historical units, then archive the old schema. Avoid two independently editable node registries indefinitely.

### Before shared energy, credits or control

- Define a community membership/role model, metering points and physical topology. Victron installation totals alone cannot accurately attribute consumption or contributions to several households behind one installation: that requires per-household metering.
- Add versioned allocation policies and an immutable, reconciled energy/credit ledger. `nodes.token_balance` and a top-up table alone are insufficient for contribution accounting, deductions, reversals and dispute resolution.
- Keep control commands, approvals, device acknowledgements, interlocks and fail-safe behavior separate from telemetry. The Victron integration remains GET-only; future admin controls need an independently reviewed control design.

## Victron check

The configured token successfully authenticated and returned many accessible installations. Automatic discovery correctly refused to select an arbitrary site. Genius Mukichi Residence is GridUbuntu's display label and need not match a provider site name. No diagnostics or consumption data from those other installations were requested.

Users can configure a token without manually typing an Installation ID when that token can access exactly one site. This token requires an explicit site selection; the future admin portal can show a dropdown populated from the token and save the selected site's ID automatically. Victron still uses its real `idSite` internally; a GridUbuntu-generated reference cannot replace it. Once selected, save that mapping to the pilot connection. The token is not inherently unique to a household. Until then the client connection remains pending; it does not combine all accessible installations or assign their data to Genius.

See [Victron VRM API documentation](https://vrm-api-docs.victronenergy.com/) and the [Node-RED package's site-ID configuration](https://flows.nodered.org/node/victron-vrm-api).
