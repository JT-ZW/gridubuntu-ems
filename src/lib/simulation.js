import {rangeBounds} from './energy.js';

export function simulationEnabled(origin,settings,nodeId,node=null){
 let url;try{url=new URL(origin);}catch{return false;}
 const local=['localhost','127.0.0.1','[::1]'].includes(url.hostname);
 if(node?.id===nodeId&&node.telemetry_mode)return node.telemetry_mode==='prototype'&&(url.protocol==='https:'||(url.protocol==='http:'&&local));
 return local&&settings.LOCAL_TEST_NODE_ENABLED==='true'&&Boolean(settings.VICTRON_PILOT_NODE_ID)&&nodeId===settings.VICTRON_PILOT_NODE_ID;
}
function powerAt(ms){
 const hour=((ms/3600000+2)%24+24)%24;
 const day=Math.floor((ms+7200000)/86400000);
 const solar=Math.round(3200*(0.75+0.25*Math.sin(day*1.7)**2)*Math.max(0,Math.sin((hour-6)/12*Math.PI)));
 const consumption=Math.round((0.9+0.2*Math.sin(day*0.9)**2)*(380+650*Math.exp(-(((hour-19)/2)**2))+400*Math.exp(-(((hour-7)/1.5)**2))));
 const batteryPower=solar>consumption?Math.min(1500,solar-consumption):-Math.min(500,consumption);
 const grid=consumption+batteryPower-solar;
 return {solar,consumption,batteryPower,grid,gridImport:Math.max(0,grid),gridExport:Math.max(0,-grid)};
}
export function simulatedTelemetry(range='today',now=new Date()){
 const at=now.getTime(),reportedAt=now.toISOString(),bounds=rangeBounds(range,now);
 const history={solar:[],consumption:[],gridImport:[],gridExport:[],totals:{}};
 const step=bounds.interval==='hours'?3600000:86400000;
 for(let start=bounds.start*1000;start<at;start+=step){
  const totals={solar:0,consumption:0,gridImport:0,gridExport:0};
  // Integrate hourly samples, prorating the unfinished hour/day. No future energy.
  for(let t=start;t<Math.min(start+step,at);t+=3600000){const duration=Math.min(3600000,start+step-t,at-t);const p=powerAt(t+duration/2);for(const key of Object.keys(totals))totals[key]+=p[key]*duration/3600000000;}
  for(const key of Object.keys(totals))history[key].push({time:new Date(start).toISOString(),value:totals[key]});
 }
 for(const key of ['solar','consumption','gridImport','gridExport'])history.totals[key]=history[key].reduce((sum,p)=>sum+p.value,0);
 const values=prototypePower(at);
 const metrics=Object.fromEntries(Object.entries(values).map(([key,value])=>[key,{value,reportedAt,freshness:'recent',source:'local_simulator',unit:key==='batterySoc'?'%':key==='batteryVoltage'?'V':key==='batteryCurrent'?'A':'W'}]));
 return {status:'simulated',simulated:true,verified:false,snapshot:{reportedAt,metrics},history,devices:[{name:'Solar inverter'},{name:'Battery storage'}],fetchedAt:reportedAt};
}
export function simulatedIntervals(nodeId,range,now=new Date()){
 const data=simulatedTelemetry(range,now),resolution=rangeBounds(range,now).interval,step=resolution==='hours'?3600000:86400000;
 return ['solar','consumption','gridImport','gridExport'].flatMap(metric=>data.history[metric].map(p=>({node_id:nodeId,metric,resolution,interval_start:p.time,interval_end:new Date(Math.min(Date.parse(p.time)+step,now.getTime())).toISOString(),energy_kwh:p.value,source:'local_simulator',simulated:true})));
}

export function prototypePower(at){
 const base=powerAt(at),phase=at/1000/90*2*Math.PI;
 const solar=Math.round(base.solar*(0.62+0.38*Math.sin(phase)));
 const consumption=Math.round(base.consumption+1600*(0.5+0.5*Math.sin(phase+1.7)));
 const batteryPower=solar>consumption?Math.min(1500,solar-consumption):-Math.min(650,consumption-solar);
 const grid=consumption+batteryPower-solar;
 return {solar,consumption,batteryPower,batterySoc:Math.round((62+16*Math.sin((at/3600000+2-10)/24*2*Math.PI)+0.8*Math.sin(phase/2))*10)/10,batteryVoltage:52.4,batteryCurrent:batteryPower/52.4,grid,generator:0};
}
