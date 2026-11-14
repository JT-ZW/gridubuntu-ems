import { error,redirect } from '@sveltejs/kit';
import { config } from './config';
import { readInstallation } from './vrm';
import {rangeBounds,freshness} from '../energy.js';

export async function loadPortal(event,range='today') {
 if(!await event.locals.getUser())redirect(303,'/login');
 const sb=event.locals.supabase;
 const {data:nodes,error:nodeError}=await sb.from('portal_nodes').select('id,reference,display_name,location_label,timezone').order('created_at');
 if(nodeError)return {node:null,nodes:[],status:'database_unavailable',snapshot:null,history:null,devices:[],verified:false};
 if(!nodes?.length)return {node:null,nodes:[],status:'no_assignment',snapshot:null,history:null,devices:[],verified:false};
 const requested=event.url.searchParams.get('node');
 const node=requested?nodes.find(n=>n.id===requested):nodes[0];if(!node)error(403,'This residence is not assigned to your account.');
 const {data:connection}=await sb.from('portal_provider_connections').select('node_id,provider,provider_installation_id').eq('node_id',node.id).eq('active',true).maybeSingle();
 let telemetry={status:'not_configured',snapshot:null,history:null,devices:[],verified:false};
 if(connection?.provider==='victron') {
  try {telemetry=await readInstallation(config(event),connection,range);}catch{telemetry={...telemetry,status:'unavailable'};}
 }
 // Uncommissioned mappings must never be represented as validated client data.
 if(!telemetry.verified && telemetry.status!=='not_configured' && telemetry.status!=='unavailable')telemetry={...telemetry,status:'awaiting_verification',snapshot:null,history:null};
 // Persisted, commissioned readings remain useful during provider outages,
 // provided their original reporting times and stale status remain visible.
 const c=config(event);
 if(c.VICTRON_MAPPING_VERIFIED==='true' && node.id===c.VICTRON_PILOT_NODE_ID){
  if(!telemetry.snapshot){
   const {data:stored}=await sb.from('portal_telemetry_snapshots').select('reported_at,measurements').eq('node_id',node.id).order('reported_at',{ascending:false}).limit(1).maybeSingle();
   if(stored){const metrics=Object.fromEntries(Object.entries(stored.measurements).map(([key,m])=>[key,m?{...m,freshness:freshness(m.reportedAt)}:null]));telemetry.snapshot={reportedAt:stored.reported_at,metrics};telemetry.stored=true;}
  }
  if(!telemetry.history){
   const bounds=rangeBounds(range);const {data:stored}=await sb.from('portal_energy_intervals').select('metric,interval_start,energy_kwh').eq('node_id',node.id).eq('resolution',bounds.interval).gte('interval_start',new Date(bounds.start*1000).toISOString()).lte('interval_start',new Date(bounds.end*1000).toISOString()).order('interval_start');
   if(stored?.length){const solar=stored.filter(r=>r.metric==='solar').map(r=>({time:r.interval_start,value:Number(r.energy_kwh)}));const consumption=stored.filter(r=>r.metric==='consumption').map(r=>({time:r.interval_start,value:Number(r.energy_kwh)}));telemetry.history={solar,consumption,totals:{solar:solar.length?solar.reduce((s,p)=>s+p.value,0):null,consumption:consumption.length?consumption.reduce((s,p)=>s+p.value,0):null,gridImport:null,gridExport:null}};telemetry.stored=true;}
  }
 }
 return {node,nodes,...telemetry};
}
