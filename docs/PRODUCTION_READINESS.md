# GridUbuntu release assessment — 15 November 2026

**Decision: controlled pilot candidate; not yet approved for general production.** This is a source/configuration and automated functional review, not independent penetration testing, certification, a browser visual sign-off or a live-meter accuracy assessment. Forecasting and hardware integration are explicitly deferred, but excluding those does not remove the software and operational release gaps below.

## Milestones and delivered behavior

| Milestone from the two prototype phases | Current evidence | Remaining scope |
| --- | --- | --- |
| Client/admin web interfaces | Invitation-only auth; active-role checks; per-node membership; node/client/community administration | Public app domain release, recovery email acceptance, admin MFA and browser/accessibility acceptance |
| Usage tracking and EMS backend | Read-only VRM adapter, units/timestamps/missing-data handling, commissioned mapping, encrypted node tokens, stored intervals and atomic collection | Genuine site accuracy comparison and sustained live soak; meter-to-household attribution for shared systems |
| Location mapping | Google satellite component, community filter, coordinate validation, audited admin updates | Supply restricted browser key and verified GPS locations; validate real imagery and marker interactions |
| Fairness / load balancing | Versioned equal-share / essential-first policies, editable client limits/priorities/access windows and an admin credit/debit ledger | Allocation rules engine, household entitlements/accounting and fairness tests; drafts do not execute or distribute energy |
| Demand forecasting | Historical storage and an hourly-median baseline with held-out validation | Deferred: representative measured history, ML, weather integration and accuracy acceptance |
| Token-based or timed access | Invited website access plus manual energy entitlement records | Manual kWh credit/debit records and timed entitlement settings are implemented; automatic redemption, deductions and enforcement are deferred |
| Analytics / reporting / audit | Energy charts, CSV exports, sync status, recorded administrative changes | Reconciliation, traceable report definitions, retention, external audit-log protection and any required billing-grade validation |
| IoT control / expansion to 6–10 nodes | Provider boundary remains GET-only; no switching commands | Deferred: controllers, relays, sensors, electrical interlocks and field acceptance; multi-node software load/soak still required |
| Documentation / demo | Local development, admin, database and map setup guides | Operational handover, restore exercise and final stakeholder demo/report |

## Controls verified in code and automated checks

- Server-verified invited users, active-role checks on admin actions, and client database row isolation. Immediate access revocation is enforced. Browser clients cannot call privileged mutation RPCs or read encrypted provider credentials.
- Provider calls are restricted to fixed read-only VRM endpoints, with timeouts and bounded cache. Installation selection refuses to guess among accessible sites. Credential encryption is bound to the node UUID.
- Revision guards and atomic database ingestion prevent stale mappings and partial writes; repeated interval ingestion is idempotent. Historical nodes cannot be silently remapped to different equipment.
- Simulation is restricted to the configured pilot on loopback hosts; simulated reads do not enter measured-history tables or saved forecasts. The same generator supplies both authenticated portals.
- Coordinate pairs have server/database bounds checks, privileged updates and audit records. No guessed household locations are seeded.
- Private routes use no-store/noindex, secure HTTPS cookies, frame blocking, MIME protection and limited browser permissions. HTTPS responses now include HSTS; authentication pages suppress referrers. Recovery confirmation now supports PKCE code exchange as well as private hashed-token invitations.
- Added CI configuration for unit/Svelte/build/Worker checks and a production-dependency audit. The workflow has not run on GitHub until committed/pushed and is not evidence of a successful hosted release.

## Gates before a wider production release

1. **Identity and abuse controls:** implement and enforce MFA for administrators, review Supabase auth/redirect/session settings, verify effective rate limits at the public app boundary, and exercise legitimate recovery and revoked-user journeys. Private admin-generated activation links work; delivery by the configured email provider and browser PKCE recovery still need acceptance testing. No recovery email was sent during this review.
2. **Operational ownership:** establish uptime/error/collector alerts with a named responder, escalation and incident runbooks. An on-screen alert is not an out-of-band incident notification. Define acceptable data age and recovery time.
3. **Recovery and retention:** verify database backup/PITR settings, successfully restore to an isolated environment, back up the credential encryption key separately, and test credential rotation. Define retention/archival for telemetry, sync logs, audits and personal data. These settings were not assumed from a Supabase plan.
4. **Deployment and security acceptance:** configure the chosen gridubuntu.com app host with HTTPS and approved auth origins, disable design previews and simulation for production, restrict Google keys, review CSP and dependencies, and commission an independent security assessment. The shared private hosted preview is not the public customer production deployment.
5. **Scale and continuity:** load/soak test 6–10 nodes and realistic data volumes, test provider outages/rate limits and recovery, and establish performance budgets. Current admin lists are bounded to 500 nodes/clients and 2,000 memberships; paging is needed before exceeding those bounds. The collector processes at most 10 nodes per 15-minute batch with three concurrent nodes, so its schedule/batch strategy must be revisited before claiming a 15-minute freshness SLA above 10 nodes. Historical backfill/reconciliation beyond the current 30-day retrieval window needs an explicit procedure.
6. **Product acceptance:** complete mobile/desktop, keyboard and screen-reader testing; validate actual Google Maps behavior after key setup; exercise invitation/password recovery in normal user browsers. Automated HTML/HTTP checks do not establish full visual or accessibility compliance.
7. **Energy-sharing acceptance:** even without relays, agree and test software allocation invariants, essential-load priorities, token/time entitlements and reconciliation. A single installation's aggregate household consumption does not prove separately metered users' consumption or fair transfers. Avoid billing or delivered-energy claims until the measurement and accounting chain is validated.

## Safe current use

Use the current app for an invited, supervised pilot and stakeholder demonstration. Administration still changes the existing Supabase database even when readings are simulated. Continue collecting no physical data from unrelated VRM installations. Switch to measured monitoring only after selecting and verifying the correct site. Promote to wider production after the applicable gates above have recorded owners, evidence and acceptance.

## Verification recorded in this review

- 27 unit tests passed, including coordinate validation and PKCE/hash invitation confirmation.
- Svelte check: zero errors and zero warnings.
- Production build and compiled Worker route/private-asset checks passed.
- Supabase client row-isolation and rolled-back admin/RPC tests passed, including coordinate permissions, bounds, clearing and audit writes.
- Authenticated HTTP workflow tests passed, including map location listing, coordinate updates/invalid input, client/admin denial, role changes, access revocation and invitation generation; temporary test records were removed. Provider credential/discovery tests passed using the configured token; no unrelated installation measurements were requested.
- npm production-dependency audit reported zero vulnerabilities at review time. This is not a penetration-test result.
- Real Google imagery/markers, email delivery/recovery browser journey, visual/accessibility acceptance, load/soak and restore drills remain unverified.

## Manual administration update

The manual sharing/onboarding migration adds protected client energy accounts, an append-only administrative credit ledger, balances over the full ledger, idempotent adjustments, nonnegative-balance checks and atomic Victron registration with coordinates and existing client assignment. Saved fairness policies can be revised as a new version. These additions close the missing manual-administration UI, not automated allocation or physical enforcement. See [workflow guide](ADMIN_ONBOARDING_AND_ENERGY.md). The configured Google browser key is present locally; live imagery and visual interaction acceptance remain pending because Computer Use stopped when it could not verify the browser URL.

Final automated checks after manual-admin changes: 27 unit tests, Svelte validation (zero errors/warnings), production build, compiled Worker routes/secret isolation, client RLS, rolled-back admin/onboarding/ledger database tests and authenticated HTTP admin/client workflows all passed. Temporary HTTP records were removed. Full physical onboarding still requires a real authorized installation and comparison with VRM; provider preparation was unit-tested with injected responses and atomic persistence was verified in a rolled-back database transaction. No production certification is implied.
