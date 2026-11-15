<script>
 import {enhance} from '$app/forms';
 let {client,preview=false,nodes=[],memberships=[]}=$props();
 let dialog;
 let busy=$state(false);
 let error=$state('');
 let fullName=$state('');
 let editedNodes=$state([]);
 let selectedNode=$state('');
 let availableNodes=$derived(nodes.filter(n=>!editedNodes.some(edit=>edit.node_id===n.id)));
 const draft=node=>({key:node.id,node_id:node.id,display_name:node.display_name,location_label:node.location_label,latitude:node.latitude??'',longitude:node.longitude??''});
 function open(){fullName=client.full_name;error='';selectedNode='';editedNodes=nodes.filter(n=>memberships.some(m=>m.user_id===client.id&&m.node_id===n.id)).map(draft);dialog.showModal();}
 function addExisting(){const node=nodes.find(n=>n.id===selectedNode);if(node&&!editedNodes.some(n=>n.node_id===node.id))editedNodes=[...editedNodes,draft(node)];selectedNode='';}
 function addNew(){editedNodes=[...editedNodes,{key:crypto.randomUUID(),node_id:null,display_name:'',location_label:'',latitude:'',longitude:''}];}
 function close(){if(!busy)dialog.close();}
 function submit(){
  busy=true;error='';
  return async ({result,update})=>{
   try{
    if(result.type==='success'&&result.data?.success){
     await update({reset:false});dialog.close();
    }else if(result.type==='failure'||result.type==='success'){
     error=result.data?.message||'Unable to save. Please try again.';
    }else if(result.type==='redirect'){
     await update();
    }else{error='Unable to connect. Please try again.';}
   }finally{busy=false;}
  };
 }
</script>

<button type="button" class="admin-button secondary" onclick={open} aria-label={'Manage '+client.full_name}>Manage →</button>
<dialog bind:this={dialog} aria-labelledby={'client-title-'+client.id} oncancel={event=>{if(busy)event.preventDefault();}}>
 <div class="editor">
  <header><div><span class="admin-eyebrow">CLIENT DETAILS</span><h2 id={'client-title-'+client.id}>Manage client</h2><p>{client.email}</p></div><button type="button" class="close" aria-label="Close client editor" disabled={busy} onclick={close}>×</button></header>
  {#if error}<p class="error" role="alert">{error}</p>{/if}
  <form method="POST" use:enhance={submit}>
   <fieldset disabled={busy||preview}>
    <input type="hidden" name="operation" value="client.details"/>
    <input type="hidden" name="user_id" value={client.id}/>
    <input type="hidden" name="nodes" value={JSON.stringify(editedNodes)}/>
    <label>Full name<input name="full_name" bind:value={fullName} required maxlength="120" autocomplete="name"/></label>
    <section aria-label="Client energy nodes">
     <h3>Energy nodes & locations</h3><p>Assign multiple systems to this client. Verified GPS coordinates place each node on the community map. Leave both coordinates blank if the location is unknown.</p>
     {#each editedNodes as node,index (node.key)}
      <div class="node-card">
       <div class="node-heading"><strong>Node {index+1}</strong>{#if !memberships.some(m=>m.user_id===client.id&&m.node_id===node.node_id)}<button type="button" class="admin-button secondary" onclick={()=>editedNodes=editedNodes.filter(n=>n.key!==node.key)}>Remove</button>{/if}</div>
       <label>Node name<input bind:value={node.display_name} required minlength="2" maxlength="120"/></label>
       <label>Location / address<input bind:value={node.location_label} required maxlength="120" placeholder="Town, suburb or community"/></label>
       <div class="coordinates"><label>Latitude<input type="number" step="any" min="-90" max="90" bind:value={node.latitude}/></label><label>Longitude<input type="number" step="any" min="-180" max="180" bind:value={node.longitude}/></label></div>
      </div>
     {/each}
     <div class="assign-node"><label>Assign an existing node<select bind:value={selectedNode}><option value="">Select a registered node</option>{#each availableNodes as node}<option value={node.id}>{node.reference} · {node.display_name}</option>{/each}</select></label><button type="button" class="admin-button secondary" disabled={!selectedNode} onclick={addExisting}>Add node</button></div>
     <button type="button" class="admin-button secondary" onclick={addNew}>Register another node +</button>
     <p>New nodes are registered without a provider connection. Configure their energy integration under Energy nodes. Editing a shared node updates its location for everyone assigned to it.</p>
    </section>
    <div class="actions"><button type="button" class="admin-button secondary" onclick={close}>Cancel</button><button class="admin-button">{busy?'Saving…':'Save changes'}</button></div>
   </fieldset>
  </form>
  <section aria-label="Account access">
   <h3>Account access</h3><p>Manage activation and access to the client portal.</p>
   <form method="POST" use:enhance={submit}>
    <input type="hidden" name="operation" value="client.invite"/><input type="hidden" name="email" value={client.email}/><input type="hidden" name="full_name" value={client.full_name}/>
    <button class="admin-button secondary" disabled={busy||preview}>{client.email_confirmed_at?'Create recovery link':'Refresh invitation link'}</button>
   </form>
   <form method="POST" use:enhance={submit}>
    <input type="hidden" name="operation" value="client.access"/><input type="hidden" name="user_id" value={client.id}/><input type="hidden" name="active" value={client.active?'false':'true'}/>
    <button class="admin-button" class:danger={client.active} disabled={busy||preview}>{client.active?'Revoke portal access':'Restore portal access'}</button>
   </form>
  </section>
 </div>
</dialog>

<style>
 .node-card{display:grid;gap:14px;padding:16px;border:1px solid #d4e0c9;border-radius:10px;margin:16px 0;background:#fff}.node-heading{display:flex;justify-content:space-between;align-items:center;gap:12px}.node-heading button{width:auto}.coordinates{display:grid;grid-template-columns:1fr 1fr;gap:12px}.assign-node{display:flex;align-items:flex-end;gap:10px;margin:16px 0}.assign-node label{flex:1;min-width:0}.assign-node button{width:auto}@media(max-width:480px){.coordinates{grid-template-columns:1fr}.assign-node{flex-wrap:wrap}.assign-node label{flex-basis:100%}}
 dialog{margin:auto;width:min(520px,calc(100vw - 32px));max-height:calc(100dvh - 40px);padding:0;border:1px solid #d4e0c9;border-radius:18px;background:#fafcf7;color:#24412f;box-shadow:0 24px 80px #102b2933;overflow:auto}
 dialog::backdrop{background:#102b29a6}
 .editor{padding:28px}header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:24px}h2{font-size:25px;line-height:1.25;margin:8px 0}header p{margin:0;overflow-wrap:anywhere;font-size:13px;color:#60735b}.close{border:1px solid #d4e0c9;background:#eff4e9;border-radius:8px;width:36px;height:36px;flex-shrink:0;font-size:25px;cursor:pointer;color:inherit}fieldset{border:0;padding:0;margin:0;min-width:0}label{display:grid;gap:8px;font-size:13px}.actions{display:flex;justify-content:flex-end;gap:10px;margin-top:24px}section{border-top:1px solid #dce5d5;margin-top:26px;padding-top:22px}h3{font-size:15px;margin:0}section p{font-size:12px;color:#60735b;margin:8px 0 16px}section form+form{margin-top:10px}section button{width:100%}.error{background:#fbede8;color:#893d2b;padding:12px;border-radius:8px;font-size:13px}button:disabled{cursor:not-allowed}@media(max-width:480px){.editor{padding:20px}.actions button{flex:1}}
</style>
