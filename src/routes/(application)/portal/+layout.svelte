<script>import PortalShell from '$lib/components/PortalShell.svelte';let {data,children}=$props();</script>
<PortalShell email={data.user.email}>{@render children()}</PortalShell>
