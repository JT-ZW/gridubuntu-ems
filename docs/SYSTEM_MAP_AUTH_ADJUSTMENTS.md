# SunSynk name, map and production authentication adjustments

Branch: `fix/sunsynk-auth-community-map`.

The displayed equipment name now reads **SunSynk** in the portals, onboarding form and operation messages. This is a display-name change requested for the prototype. Existing VRM endpoints, numeric installation IDs, encrypted credentials, database provider identifiers and configuration variable names remain unchanged. This does not implement or verify the different SunSynk cloud API. Do not enter an unrelated SunSynk cloud credential into the existing VRM integration.

The community map previously initialized Google Maps inside a zero-height container. The canvas now has a stable 460px desktop / 340px mobile height before initialization. With a configured browser key it loads automatically and provides Street, Terrain, Satellite and Satellite + streets controls. The default hybrid view combines satellite imagery and road labels. Missing keys and Google authentication/loading failures display an actionable state rather than an unexplained blank panel. Location markers still require registered GPS coordinates; no household positions are invented.

Authentication still requires runtime configuration in Vercel. Standard Supabase integration aliases (`SUPABASE_ANON_KEY`, `PUBLIC_SUPABASE_*`, `NEXT_PUBLIC_SUPABASE_*`) are now recognized in addition to the existing canonical names. This does not generate credentials or bypass authentication when values are absent. `/api/health` returns configuration status (200 or 503) without disclosing secrets; it is a configuration check, not proof of database availability or live telemetry accuracy.

To enable production sign-in and admin operations, import the ignored `.private/vercel-production.env` file into the Vercel project's **Production** environment and redeploy, or connect Vercel so the settings can be applied securely. Never commit this private file. Keep the existing encryption key. Configure Supabase's production auth URLs and Google Maps referrers for `https://www.gridubuntu.com/*` (and the apex host if used). Preview deployments need their own Preview environment configuration.

The current execution environment has no connected Vercel integration or authenticated Vercel CLI session. Source changes cannot substitute for the missing production settings. The private import file is already prepared; production sign-in is not considered fixed until the deployed login and authenticated admin/client flows have been verified after configuration.
