# GridUbuntu client portal

The existing marketing design remains intact. The SvelteKit application adds `/login`, `/portal`, `/portal/history`, `/portal/system`, and `/portal/account`. The future deployment host is `app.gridubuntu.com`. No domain or DNS changes have been made by this implementation.

## Local configuration

Use `.env.example` as the reference. `.env` and `.env.*` are ignored by Git except for the blank example. Never use a `PUBLIC_` prefix for a Victron token, Supabase server key, or scheduler secret. The Supabase publishable key is used server-side with user cookies; no privileged key is shipped to the browser.

Required for authentication:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `APP_ORIGIN`: the real deployment origin; use `http://localhost:5173` locally.

Set `PORTAL_PREVIEW_ENABLED=true` to expose `/portal-preview`. It contains only explicit fixtures and never reads a residence connection. Disable it after review. Without Supabase settings the preview is also available to review the interface before configuration.

## Database and invitation-only access

The project may already contain legacy EMS tables. All new tables use a `portal_` prefix and the migration does not modify legacy tables.

1. Set `SUPABASE_DB_URL` locally and run `node --env-file=.env scripts/migrate-portal.mjs`. This applies the migration transactionally, records the version, and creates the pilot node without a user assignment.
2. Run `node --env-file=.env scripts/test-rls.mjs`. This checks two isolated clients and denied role escalation, then rolls back every test record.
3. In Supabase Auth, disable public signups and anonymous sign-in. Set a minimum password length of 12, use appropriate rate limits, configure production SMTP, and add the application origin to the allowed redirect URLs. The portal additionally verifies `invited_at` from the server-validated Auth user. Uninvited users cannot enter it even if legacy project signup settings remain enabled.
4. Configure the **Invite user** email template to link to:

   `<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite">Accept GridUbuntu invitation</a>`

5. Configure the **Reset password** email template to link to:

   `<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery">Reset GridUbuntu password</a>`

6. Invite the client in Supabase Auth. This sends an email; do it only for the intended recipient. Configure templates before inviting. The confirmation page requires an explicit button press so email link scanners do not consume the token just by fetching the page.
7. Set a private `SUPABASE_SECRET_KEY` (new server secret) or `SUPABASE_SERVICE_ROLE_KEY` (legacy service-role key). Run `node --env-file=.env scripts/provision-pilot.mjs <invited-user-uuid>`. This script sends no email. It verifies that the user was invited and assigns **Genius Mukichi Residence**, reference **GU-ZW-0001**.

Do not create an INSERT trigger requiring `auth.users.invited_at`: Supabase sets that value after its initial user insertion. Portal membership and role writes are restricted to the service role; clients have read-only access under RLS.

## Victron commissioning

Set `VICTRON_VRM_ACCESS_TOKEN` in `.env` and the host's runtime secrets. Keep `VICTRON_PILOT_NODE_ID` equal to the generated GridUbuntu node UUID. This is distinct from the provider installation ID.

`VICTRON_VRM_INSTALLATION_ID` can be blank when the token can discover exactly one installation. Discovery uses `GET /users/me` then `GET /users/{user.id}/installations`. More than one installation requires explicit selection. The integration only permits GET requests to this fixed Victron API origin:

`https://vrmapi.victronenergy.com/v2`

Read endpoints: installation diagnostics, stats, and system-overview. No arbitrary proxy, settings, relay, inverter, alarm-clearing, or other control endpoint exists in this release.

Before setting `VICTRON_MAPPING_VERIFIED=true`:

- Compare system DBus paths and aggregated solar/consumption values with the actual VRM dashboard.
- Check that all installed solar sources and consumption phases are included once. Device-level duplicates are intentionally ignored. If the installation reports different paths, extend the explicit mapping and add a fixture test.
- Verify battery and grid power signs, SoC, units, source timestamps, and phase timing consistency.
- Compare `stats?type=live_feed` energy series and totals with VRM over the same Harare-local period. Do not sum unrelated means or treat cumulative counters as interval energy.
- Check missing-data behaviour, an outage, a revoked token, and provider rate limiting.

Until commissioning is enabled, client telemetry stays hidden and the portal displays an awaiting-verification state. Device availability depends on what this installation reports; missing data is never converted to zero. This cannot be verified against the pilot hardware until a real token is supplied.

## Historical collection and forecasting foundation

The server endpoint `POST /api/internal/ingest` requires a separate random `INGESTION_SECRET` as `Authorization: Bearer <secret>`. It also requires a private Supabase server key, a pilot token, and completed commissioning.

Configure a scheduler to invoke it every 5–15 minutes. The portal's own requests never write to the database. Ingestion stores source-timestamped snapshots plus hourly and daily energy intervals; uniqueness constraints make retries idempotent. The current day is provisional and is updated rather than added again. Daily backfill covers the last 30 days. Stored history remains available during provider outages and is never represented as a fresh live measurement.

Retention, raw commissioning records, weather ingestion, model training, forecasting accuracy evaluation, sharing rules, tokens, and hardware control are separate follow-on work. No forecast or live-control functionality is claimed by the client release.

## Deployment and checks

`npm run check`, `npm test`, `npm run build`.

The Worker adapter produces a bundled `dist/server/index.js` and `dist/client` assets for Sites. Configure runtime secrets through the hosting provider, not in Git or `.openai/hosting.json`. The Worker uses the host's `ASSETS` binding to serve static files and prerendered marketing pages. A Node test harness checks the bundled entrypoint using the same Fetch API interface.

Keep `/portal`, `/auth`, and `/api` responses private and uncached. The server sets no-store headers, uses HttpOnly same-site cookies, validates sessions with Supabase Auth, and rechecks membership via RLS before reading any provider connection. DNS for `app.gridubuntu.com`, Supabase redirect/SMTP configuration, real client invitation, actual Victron commissioning, and scheduler activation must be completed for a live pilot.
