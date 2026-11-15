# Community satellite maps

Open **Admin → Communities** for the map and community filter. Open a node's **Overview → Node coordinates** to save latitude and longitude in decimal degrees. Both fields are required together; leave both blank to clear the location. Coordinates are validated in the server and database, and changes are recorded in the admin audit trail. No location has been invented for Genius Mukichi Residence.

Add to your ignored `.env`, then restart the development server:

```
GOOGLE_MAPS_BROWSER_KEY=your_restricted_browser_key
GOOGLE_MAPS_MAP_ID=your_google_maps_map_id
```

In Google Cloud, enable billing and **Maps JavaScript API**. Restrict this browser key to **Websites / HTTP referrers** and restrict its API access to **Maps JavaScript API**. For local testing allow `http://localhost:5173/*` and `http://127.0.0.1:5173/*`. For deployment add only the actual app hosts, such as `https://app.gridubuntu.com/*` if that is the selected host. Prefer separate local and production keys and set usage quotas/budget alerts. Do not reuse a server-only key. The key is intentionally delivered to authenticated administrators' browsers; storing it in `.env` does not make a JavaScript Maps key secret.

Use your own Google map ID in production. If omitted, the component uses Google's `DEMO_MAP_ID` for local development with advanced markers. Satellite is the initial map type; Google's standard map controls and attribution remain available. The map loads on request, is reused across filter changes, fits the plotted nodes, and provides accessible node links outside the map. Nodes without coordinates appear in the list but are not plotted. Click a marker to open its node details. Map lines or satellite images do not certify physical wiring, land ownership or shared-energy flows.

The map is in the administrator workspace; there is no public endpoint listing household coordinates. Assigned clients' existing database permissions still allow access to their own node record. Register verified locations with appropriate household permission. Coordinates are sent to Google when the map is loaded.

Until a valid key and verified coordinates are supplied, configuration/empty states can be tested, but imagery, marker interactions, billing/referrer behavior and Google authentication failure states cannot be signed off against the real service.

Official references: [API setup](https://developers.google.com/maps/documentation/javascript/get-api-key), [API loading](https://developers.google.com/maps/documentation/javascript/load-maps-js-api), [key restrictions](https://developers.google.com/maps/api-security-best-practices).
