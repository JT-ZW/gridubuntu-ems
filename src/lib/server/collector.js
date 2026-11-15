import {readInstallation} from './vrm';
import {result,nodeToken} from './service';
import {config} from './config';
export async function collectNode(event,sb,connection){
 if(!connection.active||!connection.verified_at)throw new Error('verification_required');
 const token=await nodeToken(event,sb,connection.node_id);if(!token)throw new Error('credential_unavailable');
 const c={...config(event),NODE_ACCESS_TOKEN:token};
 try {
  await result(sb.from('portal_provider_connections').update({last_attempt_at:new Date().toISOString()}).eq('node_id',connection.node_id).eq('revision',connection.revision));
  const data=await readInstallation(c,connection,'today');const daily=await readInstallation(c,connection,'30d');
  const useful=Object.values(data.snapshot?.metrics||{}).some(Boolean);if(!useful||!data.snapshot?.reportedAt)throw new Error('provider_unavailable');
  const intervals=[];
  for(const [payload,resolution,duration] of [[data,'hours',3600000],[daily,'days',86400000]]){
   const rows=['solar','consumption','gridImport','gridExport'].flatMap(metric=>(payload.history?.[metric]||[]).filter(p=>typeof p.value==='number'&&Number.isFinite(p.value)&&p.value>=0).map(p=>({node_id:connection.node_id,metric,interval_start:p.time,interval_end:new Date(Date.parse(p.time)+duration).toISOString(),resolution,energy_kwh:p.value})));
   intervals.push(...rows);
  }
  const status=data.status==='connected'&&daily.status==='connected'?'connected':'partial';
  await result(sb.rpc('portal_store_collection',{p_node:connection.node_id,p_revision:connection.revision,p_snapshot:data.snapshot,p_intervals:intervals,p_status:status}));
  return {nodeId:connection.node_id,status,reportedAt:data.snapshot.reportedAt};
 }catch{await sb.from('portal_sync_runs').insert({node_id:connection.node_id,status:'failed',code:'collection_failed'});throw new Error('collection_failed');}
}
