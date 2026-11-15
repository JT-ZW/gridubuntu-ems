# GridUbuntu — Website and client energy portal

SvelteKit marketing website and invitation-only client application. The original marketing design, fonts, imagery, screenshots, and team profiles are preserved.

## Development

`npm install`
`npm run dev`

Private settings belong in `.env`; see `.env.example` for blank configuration fields. Never commit credentials.

## Validation

`npm run check`
`npm test`
`npm run build`
`npm run test:worker`

Vercel/Linux builds use the official Vercel adapter and generate `.vercel/output`. Windows local builds retain the portable Worker output (`dist/server/index.js` and `dist/client`). See [Vercel deployment](docs/VERCEL_DEPLOYMENT.md).

## Client application

`/login`, `/portal`, `/portal/history`, `/portal/system`, and `/portal/account`.

`/portal-preview` contains explicitly labelled illustrative fixtures. It never reads live residence data. Disable `PORTAL_PREVIEW_ENABLED` after review.

See [client portal setup](docs/CLIENT_PORTAL_SETUP.md) for Supabase database migration, invitations, pilot assignment, Victron commissioning, historical ingestion, and deployment to `app.gridubuntu.com`.

The real pilot token is not included. Hardware readings must be reconciled with VRM before the connection is marked verified. Marketing product screens remain screenshots; the contact form opens a draft for the visitor to send.

Original website design: https://gridubuntu-frontend.fly.dev/

## Administrator workflows

See [Victron onboarding and manual energy administration](docs/ADMIN_ONBOARDING_AND_ENERGY.md), [Google Maps setup](docs/GOOGLE_MAPS_SETUP.md) and the [production readiness assessment](docs/PRODUCTION_READINESS.md). GitHub CI validates the deployment artifact; the connected Vercel project publishes preview branches and production `main`. Production environment variables must be configured separately.
