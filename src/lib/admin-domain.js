import {numeric} from './energy.js';
export const uuidPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const adminSections=['overview','clients','nodes','communities','history','operations','forecasting','sharing','settings','activity'];
export function connectionLabel(connection,hasToken=false){if(!connection)return 'Not configured';if(!connection.active)return 'Paused';if(!hasToken)return 'Token needed';if(!connection.provider_installation_id)return 'Select installation';if(!connection.verified_at)return 'Verification needed';return 'Verified';}
export function buildAlerts(nodes,connections,snapshots,syncs,threshold=20,now=Date.now()){
 const alerts=[];
 for(const node of nodes){const c=connections.find(c=>c.node_id===node.id);if(!c?.active||!c.verified_at)continue;const s=snapshots.find(s=>s.node_id===node.id);const sync=syncs.find(r=>r.node_id===node.id);
  const add=(kind,title,fingerprint)=>alerts.push({node_id:node.id,node_name:node.display_name,reference:node.reference,kind,title,fingerprint});
  if(!s||!Number.isFinite(Date.parse(s.reported_at))||now-Date.parse(s.reported_at)>900000||Date.parse(s.reported_at)>now+60000)add('stale','Readings are delayed or their reporting time needs review',s?.reported_at||'no_readings');
  const soc=numeric(s?.measurements?.batterySoc?.value);if(soc!==null&&soc<threshold)add('low_battery',`Battery charge is ${soc}%`,s.reported_at);
  if(sync?.status==='failed')add('sync_failed','Latest collection failed',sync.started_at);
 }
 return alerts;
}
export function completeConsumptionDays(rows,now=Date.now()){
 const today=new Date(now+7200000).toISOString().slice(0,10);const days=new Map();
 for(const row of rows){if(row.metric!=='consumption'||row.resolution!=='hours'||numeric(row.energy_kwh)===null||Number(row.energy_kwh)<0)continue;const time=new Date(row.interval_start);if(!Number.isFinite(time.getTime())||time.getUTCMinutes()!==0||time.getUTCSeconds()!==0||Date.parse(row.interval_end)-time.getTime()!==3600000)continue;const cat=new Date(time.getTime()+7200000);const day=cat.toISOString().slice(0,10);if(day>=today)continue;if(!days.has(day))days.set(day,new Map());days.get(day).set(cat.getUTCHours(),Number(row.energy_kwh));}
 return [...days.entries()].filter(([,hours])=>hours.size===24).sort(([a],[b])=>a.localeCompare(b));
}
const median=values=>{const sorted=[...values].sort((a,b)=>a-b);const i=Math.floor(sorted.length/2);return sorted.length%2?sorted[i]:(sorted[i-1]+sorted[i])/2;};
export function demandBaseline(rows,now=Date.now()){
 const days=completeConsumptionDays(rows,now);if(days.length<8)throw new Error('At least 8 complete historical days are required for training and a separate validation day.');
 const recent=days.slice(-8);const latestDay=Date.parse(recent.at(-1)[0]+'T00:00:00+02:00');if(now-latestDay>72*3600000)throw new Error('Recent complete consumption data is required. Collect the missing days before forecasting.');
 const training=recent.slice(0,-1);const validation=recent.at(-1);const validationMae=Array.from({length:24},(_,h)=>Math.abs(median(training.map(([,v])=>v.get(h)))-validation[1].get(h))).reduce((s,v)=>s+v,0)/24;
 const fitting=days.slice(-7);const tomorrow=new Date(now+7200000);tomorrow.setUTCHours(0,0,0,0);const start=tomorrow.getTime()-7200000+86400000;
 return {training_start:fitting[0][0]+'T00:00:00+02:00',training_end:new Date(Date.parse(fitting.at(-1)[0]+'T00:00:00+02:00')+86400000).toISOString(),metrics:{validation_mae_kwh:validationMae,validation_day:validation[0],validation_training_start:training[0][0],training_days:7,complete_days:days.length,description:'Hourly median baseline; validation uses the preceding 7 complete days. No weather features or machine learning.'},predictions:Array.from({length:24},(_,h)=>({time:new Date(start+h*3600000).toISOString(),consumption_kwh:median(fitting.map(([,v])=>v.get(h)))}))};
}
