# System Health

Administrators open `/admin/health` for a network overview, search and community/state filters, then select a node to monitor. The client portal's Energy History stays unchanged. Legacy `/admin/history` URLs redirect to the selected node's Energy history tab and preserve query parameters.

The selected-node views are Live overview, Equipment, Energy history and Diagnostics & events. Collection runs and audit events are queried for the selected node. History retains its existing date ranges and CSV export. Read-only collection and alert acknowledgement reuse the existing authenticated administrative actions. Configuration and connection tests remain available through the selected node's connection setup page.

Monitoring states distinguish reporting, low battery, stale/invalid timestamps, partial collection, failed/awaiting collection, incomplete configuration, paused monitoring and local prototype readings. `Reporting` means that available measurements have recent timestamps, not that electrical equipment has been certified healthy. Missing measurements remain unavailable. A failed API collection is not labelled an inverter failure.

Device names and firmware come from the connection test for the current connection revision; its retrieval time is displayed. Old inventory from a different revision is hidden. Temperature, device faults and operating modes are not invented where the current collector does not supply them. No new provider requests run merely by browsing health tabs; the portal refreshes stored data through the existing 60-second refresh. Local prototype power remains presentation-only.

Platform indicators show request-time database access, presence of configuration and the existing collector state. Scheduler HTTP status confirms an HTTP response, not individual device health or uptime. The overview has the platform's existing 500-node loading limit and does not claim unlimited fleet pagination.

Website enquiries remain under **Operations & enquiries**. System alerts and collection diagnostics are consolidated under System Health. Equipment controls, firmware updates and relay switching are outside this read-only monitoring workspace.
