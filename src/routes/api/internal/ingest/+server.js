import {json} from '@sveltejs/kit';import {createClient} from '@supabase/supabase-js';
import {config} from '$lib/server/config';import {readInstallation} from '$lib/server/vrm';
async function sameSecret(actual,expected){
 if(!actual||!expected)return false;
 const hash=async value=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)));
 const [a,b]=await Promise.all([hash(actual),hash(expected)]);let diff=0;for(let i=0;i<a.length;i++)diff|=a[i]^b[i];return diff===0;
}
export async function POST(event){
 const c=config(event);const credential=event.request.headers.get('authorization')?.replace(/^Bearer /,'');
 if(!await sameSecret(credential,c.INGESTION_SECRET))return json({error:'Unauthorized'},{status:401});
 const serverKey=c.SUPABASE_SECRET_KEY||c.SUPABASE_SERVICE_ROLE_KEY;
 if(!c.SUPABASE_URL||!serverKey||!c.VICTRON_PILOT_NODE_ID||c.VICTRON_MAPPING_VERIFIED!=='true')return json({error:'Ingestion requires a configured and commissioned installation.'},{status:503});
 const sb=createClient(c.SUPABASE_URL,serverKey,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:connection,error:connectionError}=await sb.from('portal_provider_connections').select('node_id,provider,provider_installation_id').eq('node_id',c.VICTRON_PILOT_NODE_ID).eq('active',true).single();
 if(connectionError||connection?.provider!=='victron')return json({error:'Pilot connection unavailable.'},{status:503});
 try{
  const data=await readInstallation(c,connection,'today');
  if(!data.snapshot && !data.history)throw new Error('provider_unavailable');
  if(data.snapshot?.reportedAt){const {error}=await sb.from('portal_telemetry_snapshots').upsert({node_id:connection.node_id,reported_at:data.snapshot.reportedAt,measurements:data.snapshot.metrics},{onConflict:'node_id,reported_at'});if(error)throw new Error('storage_error');}
  // One authoritative daily energy interval per metric. Repeated runs replace
  // the provisional current-day value; they never append duplicate energy.
  const daily=await readInstallation(c,connection,'30d');
  for(const [payload,resolution,duration] of [[data,'hours',3600000],[daily,'days',86400000]]){
   const rows=['solar','consumption'].flatMap(metric=>(payload.history?.[metric]||[]).filter(p=>p.value!==null&&p.value>=0).map(p=>({node_id:connection.node_id,metric,interval_start:p.time,interval_end:new Date(Date.parse(p.time)+duration).toISOString(),resolution,energy_kwh:p.value})));
   if(rows.length){const {error}=await sb.from('portal_energy_intervals').upsert(rows,{onConflict:'node_id,metric,interval_start,resolution'});if(error)throw new Error('storage_error');}
  }
  const {error:syncError}=await sb.from('portal_sync_runs').insert({node_id:connection.node_id,status:data.status});if(syncError)throw new Error('storage_error');
  return json({status:'recorded',reportedAt:data.snapshot?.reportedAt || null});
 }catch{
  await sb.from('portal_sync_runs').insert({node_id:connection.node_id,status:'failed',code:'ingestion_failed'});
  return json({error:'Ingestion failed. Check the private sync log and provider connection.'},{status:502});
 }
}
