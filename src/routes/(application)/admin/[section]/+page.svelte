<script>import AdminShell from '$lib/components/AdminShell.svelte';import AdminView from '$lib/components/AdminView.svelte';let {data,form}=$props();</script>
<AdminShell email={data.administrator.email} section={data.section}><AdminView {data} {form}/></AdminShell>
