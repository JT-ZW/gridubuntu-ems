import {previewData} from './preview.js';

// Fixtures for the explicitly labelled design preview; never used for live health.
export function healthPreview(base,requested,range='7d'){
 const sample=previewData(),now=Date.now(),first=base.nodes[0];
 const second={...first,id:'00000000-0000-4000-8000-000000000002',reference:'GU-ZW-0002',display_name:'Sample Workshop',location_label:'Sample community'};
 const metrics=Object.fromEntries(Object.entries(sample.snapshot.metrics).map(([key,value])=>[key,{...value,reportedAt:new Date(now-30000).toISOString()}]));
 const node=requested===second.id?second:first;
 const currentRange=['today','7d','30d'].includes(range)?range:'7d';
 const source=currentRange==='today'?sample.history:null;
 const intervals=node.id===first.id?['solar','consumption'].flatMap(metric=>source?source[metric].map(point=>({node_id:first.id,metric,resolution:'hours',interval_start:point.time,interval_end:new Date(Date.parse(point.time)+3600000).toISOString(),energy_kwh:point.value})):[...Array(currentRange==='30d'?30:7)].map((_,index)=>({node_id:first.id,metric,resolution:'days',interval_start:new Date(now-(index+1)*86400000).toISOString(),interval_end:new Date(now-index*86400000).toISOString(),energy_kwh:metric==='solar'?10+index%3:8+index%2}))):[];
 return {...base,node,nodes:[first,second],range:currentRange,connections:[{...base.connections[0],verified_at:new Date(now-86400000).toISOString(),provider_installation_id:'12345',last_test_status:'passed',last_test_at:new Date(now-3600000).toISOString()},{node_id:second.id,active:false,revision:1}],snapshots:[{node_id:first.id,reported_at:new Date(now-30000).toISOString(),measurements:metrics}],syncs:[{node_id:first.id,status:'connected',started_at:new Date(now-30000).toISOString()}],check:node.id===first.id?{revision:1,tested_at:new Date(now-3600000).toISOString(),result:{devices:sample.devices}}:null,intervals,runs:node.id===first.id?[{node_id:first.id,status:'connected',started_at:new Date(now-30000).toISOString(),code:null}]:[],platformHealth:{database:true,authentication:true,credentialEncryption:true,ingestionConfigured:true},collector:{enabled:true,last_enqueued_at:new Date(now-30000).toISOString(),last_http_status:200}};
}
