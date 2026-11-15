import { numeric,timestamp,freshness,rangeBounds } from '../energy.js';

const BASE='https://vrmapi.victronenergy.com/v2';
export class VrmError extends Error {constructor(kind){super(kind);this.kind=kind;}}
export async function vrmGet(token,path,params={},fetcher=fetch) {
 // No arbitrary host, method, user-supplied path, or device-control route.
 if(!/^\/(users\/me|users\/\d+\/installations|installations\/\d+\/(diagnostics|stats|system-overview))$/.test(path))throw new VrmError('unsupported_endpoint');
 const url=new URL(BASE+path);for(const [k,v] of Object.entries(params))url.searchParams.set(k,String(v));
 let response;
 try {response=await fetcher(url,{method:'GET',headers:{'x-authorization':`Token ${token}`,Accept:'application/json'},signal:AbortSignal.timeout(12000),redirect:'error'});}catch{throw new VrmError('unreachable');}
 if(!response.ok)throw new VrmError(response.status===429?'rate_limited':response.status===401||response.status===403?'access_denied':'provider_error');
 let data;try{data=await response.json();}catch{throw new VrmError('invalid_response');}
 if(data.success===false)throw new VrmError('provider_error');return data;
}
export async function listInstallations(token,fetcher=fetch) {
 const me=await vrmGet(token,'/users/me',{},fetcher);
 const userId=me.user?.id ?? me.user?.idUser ?? me.records?.idUser ?? me.idUser;
 if(!/^\d+$/.test(String(userId)))throw new VrmError('discovery_unavailable');
 const result=await vrmGet(token,`/users/${userId}/installations`,{},fetcher);
 return (Array.isArray(result.records)?result.records:[]).filter(s=>/^\d+$/.test(String(s.idSite))).map(s=>({id:String(s.idSite),name:String(s.name||'Unnamed installation')}));
}
export async function discoverInstallation(token,fetcher=fetch) {
 const sites=await listInstallations(token,fetcher);
 if(sites.length!==1)throw new VrmError(sites.length?'installation_selection_required':'no_installations');
 return sites[0].id;
}
// Use unambiguous system-level DBus paths, never a random device's similarly
// named attribute. Unrecognised/missing paths remain null until commissioning.
export function normalizeDiagnostics(payload,now=Date.now()) {
 const rows=Array.isArray(payload.records)?payload.records:Object.values(payload.records || {}).filter(r=>r&&typeof r==='object');
 const system=rows.filter(r=>['system','com.victronenergy.system'].includes(r.dbusServiceType));
 function at(path) {
  const matches=system.filter(r=>r.dbusPath===path && numeric(r.rawValue)!==null && timestamp(r.timestamp));
  matches.sort((a,b)=>Number(b.timestamp)-Number(a.timestamp));const row=matches[0];
  return row?{value:numeric(row.rawValue),reportedAt:timestamp(row.timestamp),source:path}:null;
 }
 function sum(paths) {
  const readings=paths.map(at).filter(Boolean);if(!readings.length)return null;
  // Only combine contemporaneous readings; do not display a misleading flow.
  const times=readings.map(r=>Date.parse(r.reportedAt));if(Math.max(...times)-Math.min(...times)>120000)return null;
  return {value:readings.reduce((s,r)=>s+r.value,0),reportedAt:new Date(Math.min(...times)).toISOString(),source:readings.map(r=>r.source).join(' + ')};
 }
 const metrics={
  solar:sum(['/Dc/Pv/Power',...['PvOnGrid','PvOnOutput','PvOnGenset'].flatMap(type=>[1,2,3].map(p=>`/Ac/${type}/L${p}/Power`))]),
  consumption:sum([1,2,3].map(p=>`/Ac/Consumption/L${p}/Power`)),
  batterySoc:at('/Dc/Battery/Soc'),batteryPower:at('/Dc/Battery/Power'),batteryVoltage:at('/Dc/Battery/Voltage'),batteryCurrent:at('/Dc/Battery/Current'),
  grid:sum([1,2,3].map(p=>`/Ac/Grid/L${p}/Power`)),generator:sum([1,2,3].map(p=>`/Ac/Genset/L${p}/Power`))
 };
 if(metrics.batterySoc && (metrics.batterySoc.value<0||metrics.batterySoc.value>100))metrics.batterySoc=null;
 for(const metric of Object.values(metrics))if(metric)metric.freshness=freshness(metric.reportedAt,now);
 const times=Object.values(metrics).filter(Boolean).map(m=>Date.parse(m.reportedAt));
 return {metrics,reportedAt:times.length?new Date(Math.min(...times)).toISOString():null};
}
export function normalizeStats(payload) {
 const records=payload.records || {};const totals=payload.totals || {};
 function series(key){return Array.isArray(records[key])?records[key].filter(p=>Array.isArray(p)&&timestamp(p[0])).map(p=>({time:timestamp(p[0]),value:numeric(p[1])})):[];}
 return {solar:series('total_solar_yield'),consumption:series('total_consumption'),gridImport:series('grid_history_from'),gridExport:series('grid_history_to'),totals:{solar:numeric(totals.total_solar_yield),consumption:numeric(totals.total_consumption),gridImport:numeric(totals.grid_history_from),gridExport:numeric(totals.grid_history_to)}};
}
const cache=new Map();
export async function readInstallation(c,connection,range='today') {
 const token=c.NODE_ACCESS_TOKEN || (connection.node_id===c.VICTRON_PILOT_NODE_ID?c.VICTRON_VRM_ACCESS_TOKEN:null);
 if(!token)return {status:'not_configured',snapshot:null,history:null,devices:[]};
 if(connection.active===false)return {status:'paused',snapshot:null,history:null,devices:[]};
 const explicit=connection.provider_installation_id || (connection.node_id===c.VICTRON_PILOT_NODE_ID?c.VICTRON_VRM_INSTALLATION_ID:null);
 const id=explicit || await discoverInstallation(token);
 if(!/^\d+$/.test(String(id)))throw new VrmError('invalid_installation');
 const key=connection.node_id+':'+id+':'+(connection.revision||0)+':'+(connection.verified_at||'unverified')+':'+range;
 const existing=cache.get(key);if(existing && existing.until>Date.now())return existing.data;
 const bounds=rangeBounds(range);
 const responses=await Promise.allSettled([
  vrmGet(token,`/installations/${id}/diagnostics`,{count:1000}),
  vrmGet(token,`/installations/${id}/stats`,{...bounds,type:'live_feed'}),
  vrmGet(token,`/installations/${id}/system-overview`)
 ]);
 const snapshot=responses[0].status==='fulfilled'?normalizeDiagnostics(responses[0].value):null;
 const history=responses[1].status==='fulfilled'?normalizeStats(responses[1].value):null;
 const devices=responses[2].status==='fulfilled'?(responses[2].value.records?.devices || []).map(d=>({name:d.customName || d.productName || d.name || 'Victron device',firmware:d.firmwareVersion || null})):[];
 const allFailed=responses.every(r=>r.status==='rejected');
 const failures=responses.filter(r=>r.status==='rejected').map(r=>r.reason.kind || 'provider_error');
 const data={status:allFailed?'unavailable':failures.length?'partial':'connected',snapshot,history,devices,failures,verified:Boolean(connection.verified_at),fetchedAt:new Date().toISOString()};
 if(cache.size>100)cache.clear();cache.set(key,{until:Date.now()+60000,data});return data;
}
