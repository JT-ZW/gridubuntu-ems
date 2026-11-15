<script>
 import MapLocationPicker from "./MapLocationPicker.svelte";
 import {enhance} from '$app/forms';
 let {client,preview=false,nodes=[],memberships=[],maps={}}=$props();
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
  <div class="editor-body">
  <div class="details-column">
  {#if error}<p class="error" role="alert">{error}</p>{/if}
  <form id={'client-details-'+client.id} method="POST" use:enhance={submit}>
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
       <MapLocationPicker bind:latitude={node.latitude} bind:longitude={node.longitude} {maps} disabled={preview||busy}/>
      </div>
     {/each}
     <div class="assign-node"><label>Assign an existing node<select bind:value={selectedNode}><option value="">Select a registered node</option>{#each availableNodes as node}<option value={node.id}>{node.reference} · {node.display_name}</option>{/each}</select></label><button type="button" class="admin-button secondary" disabled={!selectedNode} onclick={addExisting}>Add node</button></div>
     <button type="button" class="admin-button secondary" onclick={addNew}>Register another node +</button>
     <p>New nodes are registered without a provider connection. Configure their energy integration under Energy nodes. Editing a shared node updates its location for everyone assigned to it.</p>
    </section>
   </fieldset>
  </form>
  </div>
  <section class="account-access" aria-label="Account access">
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
  <div class="actions"><button type="button" class="admin-button secondary" disabled={busy} onclick={close}>Cancel</button><button type="submit" form={'client-details-'+client.id} class="admin-button" disabled={busy||preview}>{busy?'Saving…':'Save changes'}</button></div>
 </div>
</dialog>

<style>
 dialog{margin:auto;width:min(1120px,calc(100vw - 48px));max-width:none;max-height:calc(100dvh - 48px);padding:0;border:1px solid #d4e0c9;border-radius:18px;background:#fafcf7;color:#24412f;box-shadow:0 24px 80px #102b2933;overflow:hidden}
 dialog::backdrop{background:#102b29a6}.editor{display:flex;flex-direction:column;max-height:calc(100dvh - 50px)}header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:22px 28px;border-bottom:1px solid #dce5d5;flex-shrink:0}h2{font-size:25px;line-height:1.25;margin:6px 0}header p{margin:0;overflow-wrap:anywhere;font-size:13px;color:#60735b}.close{border:1px solid #d4e0c9;background:#eff4e9;border-radius:8px;width:36px;height:36px;flex-shrink:0;font-size:25px;cursor:pointer;color:inherit}
 .editor-body{overflow:auto;overscroll-behavior:contain;min-height:0;padding:24px 28px;display:grid;grid-template-columns:minmax(0,1fr) 250px;gap:28px;align-items:start}.details-column{min-width:0}.editor label{margin:0}fieldset{border:0;padding:0;margin:0;min-width:0}label{display:grid;gap:7px;font-size:13px;min-width:0}section{border-top:1px solid #dce5d5;margin-top:22px;padding-top:20px}h3{font-size:15px;margin:0}section p{font-size:12px;line-height:1.8;color:#60735b;margin:8px 0 16px}.account-access{border-top:0;border-left:1px solid #dce5d5;margin-top:0;padding:0 0 0 24px}.account-access form+form{margin-top:12px}.account-access button{width:100%}
 .node-card{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px;padding:16px;border:1px solid #d4e0c9;border-radius:10px;margin:16px 0;background:#fff}.node-heading{display:flex;justify-content:space-between;align-items:center;gap:12px;grid-column:1/-1}.node-heading strong{font-size:12px}.node-heading button{width:auto}.coordinates{display:grid;grid-template-columns:1fr 1fr;gap:14px;grid-column:1/-1}.assign-node{display:flex;align-items:flex-end;gap:10px;margin:16px 0}.assign-node label{flex:1;min-width:0}.assign-node button{width:auto;flex-shrink:0}
 .actions{display:flex;justify-content:flex-end;gap:10px;padding:16px 28px;border-top:1px solid #dce5d5;background:#f3f7ed;flex-shrink:0}.error{background:#fbede8;color:#893d2b;padding:12px;border-radius:8px;font-size:13px}button:disabled{cursor:not-allowed}
 @media(max-width:900px){dialog{width:calc(100vw - 32px);max-height:calc(100dvh - 32px)}.editor{max-height:calc(100dvh - 34px)}.editor-body{grid-template-columns:1fr;gap:24px}.account-access{border-left:0;border-top:1px solid #dce5d5;padding:20px 0 0}.account-access form{display:inline-block;vertical-align:top;margin-right:10px}.account-access form+form{margin-top:0}.account-access button{width:auto}}
 @media(max-width:540px){dialog{width:calc(100vw - 16px);max-height:calc(100dvh - 16px);border-radius:12px}.editor{max-height:calc(100dvh - 18px)}header{padding:18px}.editor-body{padding:18px;gap:20px}.node-card{grid-template-columns:1fr;padding:14px}.coordinates{gap:10px}.assign-node{flex-wrap:wrap}.assign-node label{flex-basis:100%}.account-access form{display:block;margin-right:0}.account-access form+form{margin-top:10px}.account-access button{width:100%}.actions{padding:14px 18px}.actions button{flex:1}}
</style>
