# Release review — 15 November 2026

Scope: public website, client portal, administrator workspace, System Health,
multi-node client editing, energy activity chart and Google Maps node placement.

## Verified

- 41 automated tests passed.
- Svelte checks: zero errors and zero warnings.
- Local production build and deployment HTTP smoke tests passed. Public pages
  render; protected routes redirect unauthenticated visitors; client assets do
  not contain private environment references.
- Production dependency audit: zero reported vulnerabilities.
- Database row-level security tests passed: assigned-node isolation and denied
  role escalation. Database test transactions were rolled back.
- Authenticated HTTP tests passed for admin routes, multi-node client updates,
  private invitation/recovery flows, location validation, map registration,
  role denial, policies, manual allowances, idempotent credits, revocation and
  logout. Invalid map registration rolls back the entire operation.
- Prototype client and administrator views remain consistent and do not persist
  generated readings as measured history.
- Actual Google Maps browser test: satellite imagery loaded, clicking placed a
  pin, dragging updated coordinates, all four map views worked, and mobile
  layout fitted the screen. A temporary node was registered through the form;
  its community pin was dragged and its updated location verified in Supabase.
  Temporary users and nodes were removed.
- Browser review covers 20 routes at desktop, tablet and mobile sizes. Fixed
  text contrast, admin page titles, mobile overflow, registration form padding,
  map region labels and keyboard access to overflowing tables. Browser evidence
  is kept privately under `.private/` rather than published with client data.
  Final sweep: 60 checks, no page overflow, JavaScript errors or automated WCAG
  A/AA violations after fonts and interactive controls initialized.

## Deployment and operational limits

- Windows uses the portable Worker adapter for local builds. The official
  Vercel adapter runs in Linux/Vercel; its deployment must still pass after push.
- Migration `202611150013_map_node_registration.sql` is applied to the configured
  Supabase database and must also be applied if deploying against another one.
- Production needs its own Google Maps browser key configuration and allowed
  domain. Node pins are stored locations, not live GPS tracking.
- Physical provider commissioning, actual hardware measurements and equipment
  control were not tested. No provider requests or equipment commands were
  sent by this review. The current underlying read adapter remains Victron VRM
  despite the requested SunSynk display-name change; a genuine SunSynk API
  integration requires separate implementation and verification.
- Resend email delivery remains deferred. Enquiries are stored privately;
  outgoing delivery is not enabled or claimed as tested.
- This review supports prototype release readiness; it is not certification of
  hardware safety, production uptime, disaster recovery or accessibility.

Review completed before committing and merging the release changes.
