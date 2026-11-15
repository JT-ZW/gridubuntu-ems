# Victron onboarding and manual sharing

## Add a physical Victron node

1. Invite the client through **Clients & access** if they do not already have an invited account. No email is sent automatically; share the private activation link yourself.
2. Open **Energy nodes → Client, energy system & location**. Enter the client/residence name, select the client account, supply the VRM access token and actual installation ID, and set the location label, GPS coordinates and optional community.
3. **Validate & register Victron node** checks that the token can access that ID and attempts read-only telemetry retrieval. Node details, encrypted credential, assignment, location and test result are saved in one database transaction. An inaccessible ID is rejected before registration. No raw token is returned to the browser or placed in audit details.
4. Open the resulting **Review node connection** link. Review readings, units and reporting times against VRM and verify the connection. A successful, recent test is required; partial/missing data does not silently commission a system. The collector subsequently ingests the verified node automatically. Satellite markers use the saved GPS coordinates.

The existing unconnected-node registration remains available for simulations or pre-registration. Local simulation for the original pilot remains separate from new physical-node onboarding. To replace that simulated pilot with real equipment, disable `LOCAL_TEST_NODE_ENABLED`, restart the server and configure its existing Connection tab; do not create a duplicate pilot to overwrite history.

## Edit fairness settings

Under **Sharing policies**, create a community policy or expand a saved policy's **Edit as a new version** form. Change the allocation approach, battery reserve, power limit and notes, then save. Earlier versions remain visible for review. These are intended settings, not inverter commands.

The **Client limits & energy credits** section lets you select an active assigned client/node pair and manually set daily allowance, maximum power, priority (1 highest), enabled/paused status and optional access start/end times. Date controls use Harare/CAT, regardless of the operator's browser timezone; dates are stored as UTC timestamps. Concurrent edits are rejected if the saved revision changed.

Save access settings before recording credits. Enter a positive kWh adjustment to add allowance or a negative amount to deduct, with a reason of at least five characters. The ledger records new entries rather than editing history, repeated submissions of the same request do not double-credit, and a debit cannot take the balance below zero. Correct mistakes using a new adjustment. Balances sum the full ledger; the recent-entry table shows only the latest 100 entries. All actions require an active admin and generate audit records. Browser clients cannot access the private administrative ledger tables.

One recorded credit is a 1 kWh administrative allowance. It is not a paid voucher, a verified physical energy delivery, an automatic deduction from consumption or an enforced switch-off schedule. Rules, access windows and priorities will need a separately tested allocation/control engine and measurement reconciliation before automatic enforcement. There are no household meter deductions or hardware commands in this release.

## UI and release checks

Forms use shared action alignment, wrapping buttons, visible focus states and date/time controls that follow the admin palette. Native calendar popups are rendered by the user's browser/operating system. Review Energy nodes, Sharing policies and Communities at mobile and desktop widths before accepting the visual release. The available Computer Use host could not safely establish the active browser URL, so an automated visual review was stopped.

Before deployment, configure runtime secrets on the production host (including the restricted Google browser key and your map ID), use the correct production `APP_ORIGIN`/Supabase redirects and Google allowed websites, disable simulation/design previews, and ensure migrations are current. The new schema migration is already applied to the connected Supabase project. Keep `.env` and `.private/` out of Git. The repository's GitHub workflow runs verification, **not deployment**; pushing does not itself prove the app is live. The current build emits a Worker plus static assets; deploy through a compatible configured host and smoke-test the actual domain.

One physical VRM installation may have only one active GridUbuntu node. Assign multiple clients to that node rather than duplicating its aggregate measurements. Duplicate registrations are rejected atomically, including simultaneous submissions. The Google Maps loader preflight returned HTTP 200 with the configured local browser key; this does not replace rendered map/marker acceptance.
