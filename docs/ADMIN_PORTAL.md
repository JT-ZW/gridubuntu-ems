# GridUbuntu pilot administration

The administrator workspace is `/admin`; both clients and administrators sign in at `/login`. Role checks use the active, server-managed `portal_profiles` record on every request. A client session cannot load admin pages, invoke admin form actions, execute mutation RPCs or read encrypted credentials.

The first client remains Genius Mukichi, assigned to Genius Mukichi Residence / `GU-ZW-0001`. Its display name is independent of the Victron installation name. The configured token accesses multiple installations, so a human must select the correct one. No other installation has been selected or commissioned on the client's behalf.

The authorised administrator is `jeffmuruh@gmail.com`. Initial account setup generates a private activation link without sending email. It is stored in the ignored `.private/admin-invitation.txt`. Open it, deliberately continue, set a password of at least 12 characters, and sign in. Activation links expire according to Supabase Auth settings; the existing account's password is never printed or committed.

## Available workflows

| Area | Implemented behavior |
| --- | --- |
| Overview | Registered nodes, client access, verified connections, alerts, next setup step and recent audit events |
| Clients | Invitation/recovery link generation, profile names, assignments, immediate access revocation/restoration |
| Nodes | Registration with generated references, communities, detailed measured overview, equipment, history, private connection setup, membership and activity |
| Communities | Create and rename communities; assign nodes from node registration/detail forms |
| Connections | Validate and encrypt tokens, discover accessible sites, select a site, test readings, compare with VRM, commission, collect, pause and remove credentials |
| History | Stored measurements for today/7/30 days, generation/consumption chart and CSV export including grid intervals when reported |
| Operations | Delayed/future-time readings, low battery and failed latest-sync alerts; acknowledgement per event; collection history |
| Forecasting | Data readiness and an hourly median baseline gated on at least eight complete historical days, held-out validation MAE and saved next-day predictions |
| Sharing | Versioned allocation policy drafts, battery reserve and household power limit. These are planning records, not physical enforcement |
| Settings | Support email used by the client portal, battery threshold, registered-account roles, active/revoked access and collector schedule controls |
| Audit | Administrative actions recorded server-side, atomic with transactional database mutations; comparison notes retained on commissioning |

Invitation generation does **not** automatically email anyone. The admin receives a private expiring link to share deliberately. Existing activated clients receive a recovery link; this does not reveal their password. SMTP/email templates and domain allowlists must be configured separately if email delivery is introduced.

## Connect the pilot

1. Sign in as administrator and open Energy nodes → Genius Mukichi Residence → Connection.
2. The pilot token is already encrypted in server-only storage. Select **Find accessible installations**.
3. Select the correct physical site by its provider name. The numeric ID is saved automatically.
4. Run the read-only test. Review solar power, household load, battery charge, timestamps, source paths, today's energy totals and reported equipment.
5. Compare the values and units with the actual VRM dashboard, confirm residence ownership and enter verification notes. A successful test must be less than 30 minutes old.
6. Verify the connection, then collect its first measurements. Scheduled collection will subsequently handle active, verified nodes.

A node with stored measurements cannot be reassigned to a different installation. This prevents combining different sites' history. Register a new node instead. Replacing credentials or selecting a site resets verification. Removing a credential pauses monitoring but retains history and the provider-site mapping.

## Credential security

- `NODE_CREDENTIAL_ENCRYPTION_KEY` is a random 32-byte base64 AES-256 key. Keep it stable and back it up in a secure secret manager. Losing it requires re-entering provider tokens; rotating it requires re-encryption before switching keys.
- Each token is encrypted with a random IV and authenticated with its node UUID as additional data. Moving ciphertext to another node fails decryption.
- `portal_connection_secrets` has RLS and no public/anon/authenticated grants. Even an admin browser cannot query it. The authenticated admin server decrypts credentials only for permitted provider operations.
- Supabase server keys, database credentials, encryption keys and ingestion credentials never enter client bundles. Runtime keys are configured through hosting secrets, never the hosting manifest.
- Provider requests use a fixed host, endpoint allowlist and GET only. Neither client nor admin integration sends relay/inverter/charging commands.
- Commissioning metadata is per connection; the old `VICTRON_MAPPING_VERIFIED` environment flag is superseded by this workflow.

## Collection and scheduling

`POST /api/internal/ingest` requires the separate `INGESTION_SECRET` as a Bearer credential. A private Sites deployment additionally requires its platform service-access header. Website login cookies do not authorize this endpoint.

`scripts/configure-collector.mjs` enables Supabase `pg_cron` and `pg_net`, stores request credentials in Vault, and installs one named `gridubuntu-portal-collector` job for every 15 minutes. It preserves an existing paused job. The cron command contains only a function call, not plaintext credentials. The function resolves secrets at runtime; network request/response tables and the net schema are inaccessible to browser roles. Reconfigure Vault service access when deployment audience/credentials change; use the eventual `app.gridubuntu.com` origin after DNS and hosting setup.

The admin Settings page shows enabled state, last enqueue time and the last completed HTTP status. An HTTP 200 with zero eligible nodes is a successful no-op, not evidence of energy collection. Node outcomes and timestamps appear in Operations. Admins can pause/resume an installed schedule without exposing its credentials.

Each run processes up to ten nodes, with at most three nodes in flight. Larger networks rotate by last attempt; increase capacity/cadence deliberately before exceeding this pilot size. A node's last successful sync is distinct from its last attempt. Provider errors are sanitized and recorded as failures.

Snapshots, hourly/daily intervals, sync results and successful timestamps are committed atomically. The database rechecks connection revision, active status and commissioning under a row lock before storing. Late responses from a paused/reconfigured connection are rejected. Interval upserts replace provisional readings and do not double-count repeated requests. Daily and hourly resolutions are never summed together.

## Forecasting and sharing limits

The implemented forecast is a baseline, **not machine learning**. A complete day requires 24 measured, one-hour consumption intervals. Missing values, wrong interval durations and the current incomplete day do not count. Seven days train the validation model; the next complete day measures error. The final next-day prediction uses the latest seven complete days. Recent complete data is required. No weather features or calibrated uncertainty bounds are claimed. Keep collecting history before model selection and backtesting.

Allocation policies remain versioned planning drafts. Household contribution/consumption accounting needs appropriate meters, an immutable reconciled energy/credit ledger and explicit topology. Physical load balancing requires separately designed controls, acknowledgements, interlocks and fail-safe behavior. Saving a policy never switches hardware.

## Database and verification

Run migrations with `npm run db:migrate`. Existing portal/pilot rows are preserved. The legacy settings policy is restricted to its trusted operator/service roles, and unnecessary browser TRUNCATE/REFERENCES/TRIGGER grants have been removed. Existing anonymous incident-read behavior was left unchanged because it belongs to the previous application.

Useful checks:

```text
npm run check
npm test
npm run test:rls
node --env-file=.env scripts/test-admin-rls.mjs
node --env-file=.env scripts/test-admin-http.mjs
npm run build
npm run test:worker
```

The HTTP test requires a dedicated local server on port 5180. It creates temporary invited test users without sending email, exercises real authenticated actions, and removes its exact temporary records afterward. The database test rolls back its changes. Reference sequence gaps after tests are normal and have no billing meaning.

Browser-based visual verification was unavailable in the current execution environment; rendered-page, route, authentication, database isolation, mutation and build checks are used instead. Review the deployed preview at mobile and desktop widths before broad rollout.
