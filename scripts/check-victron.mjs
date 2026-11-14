import {discoverInstallation,vrmGet,normalizeDiagnostics,normalizeStats} from '../src/lib/server/vrm.js';
import {rangeBounds} from '../src/lib/energy.js';
import {mkdir,writeFile} from 'node:fs/promises';
if(!process.env.VICTRON_VRM_ACCESS_TOKEN){console.log('Victron token is not configured.');process.exit(0);}
try {
 const token=process.env.VICTRON_VRM_ACCESS_TOKEN;
 const installationId=process.env.VICTRON_VRM_INSTALLATION_ID||await discoverInstallation(token);
 const results=await Promise.allSettled([
  vrmGet(token,`/installations/${installationId}/diagnostics`,{count:1000}),
  vrmGet(token,`/installations/${installationId}/stats`,{...rangeBounds('today'),type:'live_feed'}),
  vrmGet(token,`/installations/${installationId}/system-overview`)
 ]);
 const report={checkedAt:new Date().toISOString(),installationDiscovered:!process.env.VICTRON_VRM_INSTALLATION_ID,installationId,
  endpoints:results.map((r,i)=>({name:['diagnostics','stats','system-overview'][i],status:r.status,error:r.status==='rejected'?r.reason.kind:undefined})),
  snapshot:results[0].status==='fulfilled'?normalizeDiagnostics(results[0].value):null,
  stats:results[1].status==='fulfilled'?normalizeStats(results[1].value):null,
  // Only record provider metadata needed to verify the mapping, never the token.
  diagnosticFields:results[0].status==='fulfilled'?(Array.isArray(results[0].value.records)?results[0].value.records:[]).map(r=>({service:r.dbusServiceType,path:r.dbusPath,unit:r.unit,description:r.description})):[],
  statsKeys:results[1].status==='fulfilled'?Object.keys(results[1].value.records||{}):[]};
 await mkdir('.private',{recursive:true});await writeFile('.private/victron-check.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify({installationDiscovered:report.installationDiscovered,installationId,endpoints:report.endpoints,availableMetrics:Object.entries(report.snapshot?.metrics||{}).filter(([,m])=>m!==null).map(([key,m])=>({key,source:m.source,freshness:m.freshness})),historyPoints:report.stats?.solar?.length||0}));
}catch(error){console.log(JSON.stringify({status:'not_connected',reason:error.kind||'connection_error'}));process.exitCode=1;}
