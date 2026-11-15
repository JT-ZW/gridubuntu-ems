# Vercel deployment

The GitHub repository is connected to Vercel project `jt-zws-projects/gridubuntu-ems`. The observed standard production URL is https://gridubuntu-ems.vercel.app; https://gridubuntu.com redirects to https://www.gridubuntu.com. Confirm the custom domain is assigned to this same project in Vercel.

## Build and branches

- Framework: SvelteKit. Build command: `npm run build`. Keep the framework's output-directory default; do not override it with `dist` or `build`.
- Node: 24.x. The official SvelteKit-2-compatible Vercel adapter 6.x emits `.vercel/output` for Vercel/Linux builds. The Worker adapter remains available for portable local Windows builds and explicit `npm run build:worker`; it is not the Vercel production output.
- Production branch: `main`. Other branches receive preview deployments when enabled in the connected project.
- GitHub CI runs unit tests, Svelte checks, the build, `test:deployment` and the production dependency audit. On Linux the deployment smoke test exercises the actual Vercel function output, static pages, private redirects, ingestion authorization and asset secret isolation.
- Vercel function duration is 120 seconds for bounded ingestion batches. Keep Fluid compute enabled if using a Hobby project; legacy Hobby function limits are lower.

Windows cannot create Vercel's route-alias symlinks without additional OS configuration. Default local Windows builds use the existing portable output; Vercel and Linux CI use the official Vercel adapter. No OS security settings are changed.

## Production environment

Local `.env` is deliberately ignored by Git and is not copied into Vercel by a push. Configure these in Vercel **Settings → Environment Variables → Production**, then redeploy:

```
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY
NODE_CREDENTIAL_ENCRYPTION_KEY
INGESTION_SECRET
GOOGLE_MAPS_BROWSER_KEY
GOOGLE_MAPS_MAP_ID
VICTRON_PILOT_NODE_ID
APP_ORIGIN=https://www.gridubuntu.com
PORTAL_PREVIEW_ENABLED=false
LOCAL_TEST_NODE_ENABLED=false
```

Use the existing credential-encryption key; generating a different key makes the saved node tokens unreadable. Keep server secret keys private; the Google Maps browser key is intentionally browser-visible and must be website/API-restricted. Database connection strings are needed for local migration/test commands, not routine Vercel app requests. New physical nodes use encrypted credentials saved through the admin UI, so a global VRM token is not required for them.

Configure the chosen actual production origin in Supabase Auth's Site URL and allowed redirect URLs, including `/auth/confirm`. Restrict Google Maps to that origin and Maps JavaScript API. For preview deployments use separately configured Preview values and their appropriate auth redirects; do not point preview invitations at localhost.

The pilot simulator deliberately remains restricted to localhost. A successful Vercel deployment does not enable generated readings on a public domain or commission the pilot's missing physical installation.

## Operations and verification

All committed portal migrations are already applied to the connected Supabase project. For a different database, apply them before use.

The existing ingestion schedule is in Supabase, not Vercel Cron. Its target currently belongs to the earlier private hosted preview. After Vercel's production secrets and ingestion authorization are verified, update that scheduler's endpoint/header configuration to the selected production host; do not send the old private-Site access credential to Vercel. Until this is done, do not claim scheduled collection is running against the new host.

Check GitHub CI and Vercel status for the exact merged commit, then test the actual production root, `/login`, protected `/portal` and `/admin` redirects, client/admin login, Maps, recovery links and authorized ingestion. A green build is not proof that production secrets, auth redirects or the collection schedule are configured.

Official references: [SvelteKit on Vercel](https://vercel.com/docs/frameworks/full-stack/sveltekit), [environments](https://vercel.com/docs/deployments/environments), [function duration](https://vercel.com/docs/functions/configuring-functions/duration).
