# Local pilot testing

Run commands from the `gridubuntu` directory. Use `npm.cmd` in Windows PowerShell.

1. Keep the existing private `.env` configuration. Set `APP_ORIGIN=http://localhost:5173` and `LOCAL_TEST_NODE_ENABLED=true`. `VICTRON_PILOT_NODE_ID` identifies the existing Genius Mukichi Residence database record.
2. Run `npm.cmd run dev -- --host 127.0.0.1 --port 5173 --strictPort`.
3. To prepare an unactivated account's local invitation, run `node --env-file=.env scripts/prepare-local-access.mjs jeffmuruh@gmail.com`. Open the private link in `.private/admin-invitation.txt` yourself, set a password, and enter the admin portal. No email is sent. Activated accounts retain their password and can sign in at `/login`.
4. For the pilot client, use the same command with `gtmukichi16@gmail.com`; the link is saved in `.private/client-invitation.txt`. Sign in as the client in a separate browser profile to test both roles.

The website runs on localhost; authentication, client assignments, node registration and administrative changes use the existing Supabase project. Localhost is therefore not a separate database sandbox.

The simulator is restricted to loopback hostnames and the configured pilot UUID. It supplies current power, battery state and generated energy history through the authenticated loaders in both portals. Refresh updates the values. Today uses hourly intervals; 7/30-day history uses daily intervals including the partial current day. Times use Harare (UTC+2). CSV files identify simulated data. No simulated energy is written to measurement tables or used for saved forecasts. Collection and provider commissioning actions are blocked for this local simulated node. Other nodes retain their normal provider behavior.

To connect real equipment later, set `LOCAL_TEST_NODE_ENABLED=false`, restart the local server, and use the node's Connection tab to select, test and verify a real VRM installation. A VRM access token does not replace the provider's installation ID. The existing encrypted token is retained; no new provider requests are needed for simulation.

Do not commit `.env` or `.private` files. Local changes are not automatically deployed to the hosted website.

## Prototype presentation

Authenticated pilot screens now use a compact Prototype status instead of repeated explanatory banners. The presentation updates every three seconds in the browser, using a deterministic shared clock-based energy scenario. Rolling power charts and directional flow indicators show changing solar, household, battery and grid conditions. Historical days vary deterministically. Hidden-tab updates pause, timers are cleaned up on navigation, and flow motion respects reduced-motion preferences. No extra three-second database/provider polling is introduced.

The underlying source metadata, localhost restriction, commissioning protections and CSV data-source labels remain intact. The presentation does not turn generated readings into verified measurements or persist them as measured energy. Preview fixtures remain separate from authenticated pilot screens.
