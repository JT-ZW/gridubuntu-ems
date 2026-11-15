<script>
 import {loadGoogleMaps} from '$lib/maps.js';
 let {data}=$props();let community=$state('all');let container;let map=$state.raw(null);let api;let Marker;let markers=[];let popup;let busy=$state(false);let failure=$state('');let destroyed=false;
 let filtered=$derived(data.nodes.filter(n=>community==='all'||(community==='unassigned'?!n.community_id:n.community_id===community)));
 let located=$derived(filtered.filter(n=>typeof n.latitude==='number'&&typeof n.longitude==='number'));
 async function openMap(){
  busy=true;failure='';
  try{api=await loadGoogleMaps(data.maps.browserKey);const maps=await api.importLibrary('maps');({AdvancedMarkerElement:Marker}=await api.importLibrary('marker'));if(destroyed)return;popup=new maps.InfoWindow();map=new maps.Map(container,{center:{lat:-19,lng:29.5},zoom:6,mapId:data.maps.mapId,mapTypeId:'satellite',mapTypeControl:true,streetViewControl:false,fullscreenControl:true,gestureHandling:'cooperative'});}
  catch(e){failure=e.message||'The map could not load. Try again.';}finally{busy=false;}
 }
 $effect(()=>{
  const current=map,nodes=located;if(!current)return;
  popup?.close();for(const marker of markers){api.event.clearInstanceListeners(marker);marker.map=null;}markers=[];
  const bounds=new api.LatLngBounds();
  for(const node of nodes){const position={lat:node.latitude,lng:node.longitude};bounds.extend(position);const marker=new Marker({map:current,position,title:node.display_name});marker.addListener('click',()=>{const content=document.createElement('div');const title=document.createElement('strong');title.textContent=node.display_name;const detail=document.createElement('p');detail.textContent=node.reference+' · '+node.location_label;const link=document.createElement('a');link.href='/admin/nodes/'+node.id;link.textContent='Manage energy node';content.append(title,detail,link);popup.setContent(content);popup.open({map:current,anchor:marker});});markers.push(marker);}
  if(nodes.length===1){current.setCenter({lat:nodes[0].latitude,lng:nodes[0].longitude});current.setZoom(17);}else if(nodes.length>1)current.fitBounds(bounds,48);else{current.setCenter({lat:-19,lng:29.5});current.setZoom(6);}
 });
 import {onDestroy,onMount} from 'svelte';
 onMount(()=>{const authFailure=()=>{failure='Google Maps rejected the configuration. Check the browser key, website/API restrictions and billing in Google Cloud.';popup?.close();for(const marker of markers){api?.event.clearInstanceListeners(marker);marker.map=null;}if(map)api?.event.clearInstanceListeners(map);map=null;};window.addEventListener('gridubuntu:maps-auth-failed',authFailure);return()=>window.removeEventListener('gridubuntu:maps-auth-failed',authFailure);});
 onDestroy(()=>{destroyed=true;popup?.close();for(const marker of markers){api?.event.clearInstanceListeners(marker);marker.map=null;}if(map)api?.event.clearInstanceListeners(map);});
</script>
<section class="admin-panel community-map">
 <div class="admin-panel-head"><div><span class="admin-eyebrow">YOUR COMMUNITY ON THE GROUND</span><h2>Energy node locations</h2></div><label>Community<select bind:value={community}><option value="all">All communities</option><option value="unassigned">Unassigned nodes</option>{#each data.communities as c}<option value={c.id}>{c.name}</option>{/each}</select></label></div>
 <p class="admin-help">{located.length} of {filtered.length} nodes have coordinates. Satellite imagery shows registered locations, not electrical connections or live energy transfers.</p>
 <div class="map-canvas" class:loaded={map} bind:this={container} aria-label="Satellite map of registered energy nodes"></div>
 {#if !map}<div class="map-placeholder"><strong>{!data.maps?.browserKey?'Google Maps configuration needed':'Explore your community from above'}</strong><p>{!data.maps?.browserKey?'Add GOOGLE_MAPS_BROWSER_KEY to your local .env, then restart the development server.':'Load Google satellite imagery to view the registered node coordinates. This contacts Google Maps.'}</p>{#if data.maps?.browserKey}<button class="admin-button" onclick={openMap} disabled={busy}>{busy?'Loading satellite map...':failure?'Try map again':'Load satellite map'}</button>{/if}</div>{/if}
 {#if failure}<p class="form-error" role="alert">{failure}</p>{/if}
 <div class="location-list" aria-label="Node locations">{#each filtered as node}<a href={'/admin/nodes/'+node.id+'?tab=overview'}><span><strong>{node.display_name}</strong><small>{node.reference}</small></span><span>{node.latitude!==null&&node.latitude!==undefined?`${node.latitude.toFixed(5)}, ${node.longitude.toFixed(5)}`:'Add coordinates'} →</span></a>{/each}{#if !filtered.length}<p class="admin-help">No nodes in this community yet.</p>{/if}</div>
 <p class="map-terms">Map content: <a href="https://maps.google.com/help/terms_maps.html" target="_blank" rel="noreferrer">Google Maps terms</a> · <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">Google privacy policy</a>. Exact node coordinates are available in the administrator workspace.</p>
</section>
<style>.community-map{margin-bottom:24px}.community-map label{display:grid;gap:6px;font-size:13px;color:#465a45}.community-map select{padding:10px;border:1px solid #cdd8c6;border-radius:8px;background:#fff;max-width:100%}.map-canvas{height:0;width:100%;border-radius:12px}.map-canvas.loaded{height:460px}.map-placeholder{min-height:240px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;background:#edf2e8;border:1px dashed #b8c8aa;border-radius:12px;padding:28px}.map-placeholder p{max-width:54ch;line-height:1.6;color:#53634c}.location-list{max-height:280px;overflow:auto;margin-top:16px}.location-list a{display:flex;justify-content:space-between;gap:16px;padding:14px 0;border-bottom:1px solid #e1e8dc;color:#30452b;text-decoration:none;font-size:13px}.location-list small{display:block;margin-top:5px;color:#62725b}.map-terms{font-size:12px;color:#62725b;line-height:1.6}.map-terms a{color:inherit}@media(max-width:640px){.map-canvas.loaded{height:340px}.location-list a{flex-direction:column;gap:7px}}</style>
