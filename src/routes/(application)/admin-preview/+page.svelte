<script>import AdminShell from '$lib/components/AdminShell.svelte';import AdminView from '$lib/components/AdminView.svelte';let {data}=$props();</script>
<AdminShell preview section={data.section}><AdminView {data}/></AdminShell>
