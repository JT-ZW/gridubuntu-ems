<script>import AdminShell from '$lib/components/AdminShell.svelte';import AdminNode from '$lib/components/AdminNode.svelte';let {data,form}=$props();</script>
<AdminShell email={data.administrator.email} section="nodes"><AdminNode {data} {form}/></AdminShell>
