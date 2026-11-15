import { error,redirect } from '@sveltejs/kit';
import { config } from './config';
import { readInstallation } from './vrm';
import {rangeBounds,freshness} from '../energy.js';
import {serviceClient,nodeToken} from './service';

export async function loadPortal(event,range='today') {
 if(!await event.locals.getUser())redirect(303,'/login');
 const sb=event.locals.supabase;
 const {data:nodes,error:nodeError}=await sb.from('portal_nodes').select('id,reference,display_name,location_label,timezone').order('created_at');
 if(nodeError)return {node:null,nodes:[],status:'database_unavailable',snapshot:null,history:null,devices:[],verified:false};
 if(!nodes?.length)return {node:null,nodes:[],status:'no_assignment',snapshot:null,history:null,devices:[],verified:false};
 const requested=event.url.searchParams.get('node');
 const node=requested?nodes.find(n=>n.id===requested):nodes[0];if(!node)error(403,'This residence is not assigned to your account.');
 const {data:connection}=await sb.from('portal_provider_connections').select('*').eq('node_id',node.id).maybeSingle();
 let telemetry={status:'not_configured',snapshot:null,history:null,devices:[],verified:false};
 if(connection?.provider==='victron') {
  try {if(!connection.active)telemetry.status='paused';else if(!connection.verified_at)telemetry.status=connection.provider_installation_id?'awaiting_verification':'awaiting_installation';else{const token=await nodeToken(event,serviceClient(event),node.id);telemetry=token?await readInstallation({...config(event),NODE_ACCESS_TOKEN:token},connection,range):telemetry;}}catch(error){telemetry={...telemetry,status:error.kind==='installation_selection_required'?'awaiting_installation':'unavailable'};}
 }
 // Uncommissioned mappings must never be represented as validated client data.
 if(!telemetry.verified && ['connected','partial'].includes(telemetry.status))telemetry={...telemetry,status:'awaiting_verification',snapshot:null,history:null};
 // Persisted, commissioned readings remain useful during provider outages,
 // provided their original reporting times and stale status remain visible.
 const c=config(event);
 if(connection?.verified_at && connection.active){
  if(!telemetry.snapshot){
   const {data:stored}=await sb.from('portal_telemetry_snapshots').select('reported_at,measurements').eq('node_id',node.id).order('reported_at',{ascending:false}).limit(1).maybeSingle();
   if(stored){const metrics=Object.fromEntries(Object.entries(stored.measurements).map(([key,m])=>[key,m?{...m,freshness:freshness(m.reportedAt)}:null]));telemetry.snapshot={reportedAt:stored.reported_at,metrics};telemetry.stored=true;}
  }
  if(!telemetry.history){
   const bounds=rangeBounds(range);const {data:stored}=await sb.from('portal_energy_intervals').select('metric,interval_start,energy_kwh').eq('node_id',node.id).eq('resolution',bounds.interval).gte('interval_start',new Date(bounds.start*1000).toISOString()).lte('interval_start',new Date(bounds.end*1000).toISOString()).order('interval_start');
   if(stored?.length){const history={totals:{}};for(const metric of ['solar','consumption','gridImport','gridExport']){const points=stored.filter(r=>r.metric===metric).map(r=>({time:r.interval_start,value:Number(r.energy_kwh)}));history[metric]=points;history.totals[metric]=points.length?points.reduce((s,p)=>s+p.value,0):null;}telemetry.history=history;telemetry.stored=true;}
  }
 }
 return {node,nodes,...telemetry};
}
