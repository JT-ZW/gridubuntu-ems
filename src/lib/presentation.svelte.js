import {onMount} from 'svelte';
import {simulatedTelemetry,simulatedIntervals} from './simulation.js';
// Presentation-only updates. Never writes telemetry or invokes the provider.
export function usePresentation(source,range=()=>null){
 let clock=$state(null);
 onMount(()=>{clock=Date.now();const timer=setInterval(()=>{if(document.visibilityState==='visible')clock=Date.now();},3000);return()=>clearInterval(timer);});
 const data=$derived.by(()=>{
  const incoming=source();if(!incoming.simulated||clock===null)return incoming;
  const period=range()||incoming.range||'today';const now=new Date(clock);const telemetry=simulatedTelemetry(period,now);
  const view={...incoming,...telemetry};
  if(incoming.snapshots){view.snapshots=incoming.snapshots.map(s=>s.node_id===incoming.node?.id?{...s,reported_at:telemetry.snapshot.reportedAt,measurements:telemetry.snapshot.metrics}:s);view.intervals=simulatedIntervals(incoming.node.id,period,now);}
  return view;
 });
 return {get data(){return data;}};
}
