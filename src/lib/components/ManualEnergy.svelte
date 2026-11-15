<script>
 import {keyboardScroll} from "$lib/table-scroll.js";
 import {localDate} from '$lib/manual-energy.js';import {formatValue,formatTime} from '$lib/energy.js';
 let {data}=$props();let selected=$state('');
 let memberships=$derived(data.memberships.filter(m=>data.clients.some(c=>c.id===m.user_id&&c.role==='client'&&c.active)));
 let member=$derived(memberships.find(m=>m.node_id+':'+m.user_id===selected)||memberships[0]);
 let account=$derived((data.energyAccounts||[]).find(a=>a.node_id===member?.node_id&&a.user_id===member?.user_id));
 let balance=$derived((data.tokenBalances||[]).find(a=>a.node_id===member?.node_id&&a.user_id===member?.user_id)?.balance_kwh||0);
 const person=id=>data.clients.find(c=>c.id===id)?.full_name||'Client';const node=id=>data.nodes.find(n=>n.id===id)?.display_name||'Node';
</script>
<section class="admin-panel"><div class="admin-panel-head"><div><span class="admin-eyebrow">MANUAL ENERGY ACCESS</span><h2>Client limits & energy credits</h2></div><span class="admin-status">Administrative records</span></div>
<p class="admin-help">Manage planned entitlements manually. One energy credit represents a 1 kWh allowance. Credits are not money, measured transfers or automatic meter deductions. Limits, dates and priorities are recorded here; hardware does not enforce them yet.</p>
<label class="admin-account-select">Client & energy node<select bind:value={selected}>{#each memberships as m}<option value={m.node_id+':'+m.user_id}>{person(m.user_id)} · {node(m.node_id)}</option>{/each}</select></label>
{#if member}
<div class="admin-credit-summary"><span>Recorded allowance balance<strong>{formatValue(balance,'kWh',3)}</strong></span><span>Account settings<strong>{account?(account.enabled?'Enabled':'Paused'):'Not set'}</strong></span></div>
{#key member.node_id+':'+member.user_id+':'+(account?.revision||0)}
<form method="POST" class="admin-form-grid"><input type="hidden" name="operation" value="entitlement.save"/><input type="hidden" name="node_id" value={member.node_id}/><input type="hidden" name="user_id" value={member.user_id}/><input type="hidden" name="revision" value={account?.revision||0}/>
<label>Daily energy allowance (kWh)<input type="number" name="daily_limit_kwh" min="0" max="10000" step="0.001" value={account?.daily_limit_kwh??5} required/></label>
<label>Maximum power (kW)<input type="number" name="max_power_kw" min="0.01" max="1000" step="0.01" value={account?.max_power_kw??1} required/></label>
<label>Priority (1 highest, 10 lowest)<input type="number" name="priority" min="1" max="10" step="1" value={account?.priority??5} required/></label>
<label>Access status<select name="enabled" value={String(account?.enabled??true)}><option value="true">Enabled</option><option value="false">Paused</option></select></label>
<label>Access starts · CAT (optional)<input type="datetime-local" name="valid_from" value={localDate(account?.valid_from)}/></label>
<label>Access ends · CAT (optional)<input type="datetime-local" name="valid_until" value={localDate(account?.valid_until)}/></label>
<div class="admin-form-actions admin-span-two"><button class="admin-button" disabled={data.preview}>Save access settings</button><span class="admin-help">Blank dates mean no time boundary.</span></div></form>
{/key}
<form method="POST" class="admin-form-grid admin-credit-adjust"><input type="hidden" name="operation" value="token.adjust"/><input type="hidden" name="node_id" value={member.node_id}/><input type="hidden" name="user_id" value={member.user_id}/><input type="hidden" name="request_id" value={data.adjustmentId||''}/>
<label>Adjustment (kWh)<input name="delta_kwh" type="number" min="-100000" max="100000" step="0.001" required placeholder="Positive to add; negative to deduct"/></label>
<label>Reason<input name="reason" minlength="5" maxlength="500" required placeholder="Explain the allowance or correction"/></label>
<div class="admin-form-actions admin-span-two"><button class="admin-button secondary" disabled={data.preview||!account}>Record credit / debit</button><span class="admin-help">Save access settings first. Debits cannot make the balance negative. Corrections use new ledger entries.</span></div></form>
{:else}<div class="admin-empty">Assign an active client to a node to manage their energy access.</div>{/if}</section>
<section class="admin-panel"><div class="admin-panel-head"><h2>Energy credit ledger</h2><span class="admin-status">Latest 100 entries</span></div><div class="admin-table-scroll" use:keyboardScroll role="region" aria-label="Scrollable data table"><table class="admin-table"><thead><tr><th>Time · CAT</th><th>Client / node</th><th>Adjustment</th><th>Reason</th></tr></thead><tbody>{#each data.tokenLedger||[] as entry}<tr><td>{formatTime(entry.created_at)}</td><td>{person(entry.user_id)}<small>{node(entry.node_id)}</small></td><td>{Number(entry.delta_kwh)>0?'+':''}{formatValue(entry.delta_kwh,'kWh',3)}</td><td>{entry.reason}</td></tr>{/each}{#if !data.tokenLedger?.length}<tr><td colspan="4">No manual energy adjustments yet.</td></tr>{/if}</tbody></table></div></section>
