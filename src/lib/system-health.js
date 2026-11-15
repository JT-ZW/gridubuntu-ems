import {numeric} from './energy.js';

export function monitoringState(connection,snapshot,sync,hasCredential,threshold=20,now=Date.now()){
 if(connection?.simulated||snapshot?.simulated)return {key:'prototype',label:'Prototype readings',detail:'Presentation data; equipment condition is not assessed.'};
 if(connection?.active===false)return {key:'paused',label:'Monitoring paused',detail:'Collection is paused; this does not indicate equipment failure.'};
 if(!connection||!hasCredential||!connection.provider_installation_id||!connection.verified_at)return {key:'setup',label:'Setup required',detail:'Complete and verify the provider connection before monitoring.'};
 if(sync?.status==='failed')return {key:'unavailable',label:'Collection failed',detail:'The latest collection failed. Equipment condition is unknown.'};
 const metrics=Object.values(snapshot?.measurements||{}).filter(m=>numeric(m?.value)!==null);
 if(!metrics.length)return {key:'unavailable',label:'Awaiting readings',detail:'No usable measurements have been collected.'};
 if(metrics.some(m=>{const at=Date.parse(m.reportedAt||snapshot?.reported_at);return !Number.isFinite(at)||at>now+60000||now-at>900000;}))return {key:'delayed',label:'Readings need review',detail:'One or more readings are missing a valid timestamp, delayed or future-dated.'};
 if(sync?.status==='partial')return {key:'partial',label:'Partial collection',detail:'Only part of the provider response was collected.'};
 const charge=numeric(snapshot?.measurements?.batterySoc?.value);
 if(charge!==null&&charge<threshold)return {key:'attention',label:'Low battery reading',detail:`Reported battery charge is below the ${threshold}% warning threshold.`};
 return {key:'reporting',label:'Reporting',detail:'Available measurements are recent. This does not certify equipment health.'};
}

export function networkRows(data,now=Date.now()){
 return data.nodes.map(node=>{
  const connection=data.connections.find(c=>c.node_id===node.id),snapshot=data.snapshots.find(s=>s.node_id===node.id),sync=data.syncs.find(s=>s.node_id===node.id);
  return {node,connection,snapshot,sync,state:monitoringState(connection,snapshot,sync,data.secrets.some(s=>s.node_id===node.id),data.settings.low_battery_percent,now)};
 });
}
