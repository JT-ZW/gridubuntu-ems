# Node locations on Google Maps

Administrators can register a node under Communities or Energy nodes using
**Register a node by map pin**. Choose a client and community if known, open the
map picker, zoom to the site and click to place a pin. Drag the pin to refine it.
Street, terrain, satellite and labelled satellite views are available. Coordinate
fields update with the selected position and remain available for keyboard entry.

The same picker is available in the client editor and individual node location
form. Clients can have multiple nodes, each with its own location.

Existing pins on the Communities map can be dragged. Changes remain unsaved
until **Save pin location** is pressed; Cancel restores the stored position.
Map pins represent registered locations, not live GPS tracking.

Registration saves the node, coordinates and optional client membership in one
database transaction. It creates an unconnected node; provider verification is
still required before measured collection. All changes require administrator
access and use the existing audit trail.

Apply migration `202611150013_map_node_registration.sql` to each database used
by a deployment. Configure `GOOGLE_MAPS_BROWSER_KEY` on the host, with Maps
JavaScript API enabled, billing active and website restrictions allowing the
deployment origin. Optional `GOOGLE_MAPS_MAP_ID` defaults to Google's demo map
ID. Missing or rejected configuration leaves coordinate entry available.
