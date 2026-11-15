<script>let {data}=$props();</script>
<section class="admin-panel"><div class="admin-panel-head"><div><span class="admin-eyebrow">CONNECT A VICTRON NODE</span><h2>Client, energy system & location</h2></div></div><p class="admin-help">Enter the actual VRM installation ID and its access token. We validate access, test read-only data and save the node, client assignment and map location together. Invite a new client in Clients & access first, then select their account here.</p>
<form method="POST" class="admin-form-grid"><input type="hidden" name="operation" value="node.onboard"/>
 <label>Client / residence name<input name="display_name" required minlength="2" maxlength="120" placeholder="e.g. Genius Mukichi Residence"/></label>
 <label>Client account<select name="user_id" required><option value="">Select invited client</option>{#each data.clients.filter(c=>c.role==='client'&&c.active) as client}<option value={client.id}>{client.full_name} · {client.email}</option>{/each}</select></label>
 <label>Victron installation ID<input name="installation_id" required pattern="[0-9]{1,24}" maxlength="24" inputmode="numeric" autocomplete="off"/></label>
 <label>Victron access token<input name="token" type="password" required maxlength="8192" autocomplete="new-password"/></label>
 <label>Location label<input name="location_label" required maxlength="120" placeholder="Town or community, Zimbabwe"/></label>
 <label>Community<select name="community_id"><option value="">Assign later</option>{#each data.communities as c}<option value={c.id}>{c.name}</option>{/each}</select></label>
 <label>Latitude<input name="latitude" type="number" required min="-90" max="90" step="any" placeholder="Decimal degrees"/></label>
 <label>Longitude<input name="longitude" type="number" required min="-180" max="180" step="any" placeholder="Decimal degrees"/></label>
 <div class="admin-form-actions admin-span-two"><button class="admin-button" disabled={data.preview}>Validate & register Victron node</button><span class="admin-help">The token remains encrypted on the server. Review and verify the readings before live monitoring.</span></div>
</form></section>
