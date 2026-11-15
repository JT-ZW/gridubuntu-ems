<script>
 import Icon from './Icon.svelte';import {formatValue} from '$lib/energy';
 let {metrics={},simulated=false}=$props();
 let solar=$derived(metrics.solar?.value??null);let usage=$derived(metrics.consumption?.value??null);let battery=$derived(metrics.batteryPower?.value??null);let grid=$derived(metrics.grid?.value??null);
 const power=value=>value===null?'Not reported':formatValue(value/1000,'kW',2);
</script>
<div class="home-network" role="group" aria-label="Reported solar, household, battery and grid power">
 <svg class="network-lines" viewBox="0 0 400 250" preserveAspectRatio="none" aria-hidden="true"><path d="M200 52V112M200 112C200 155 64 113 64 188M200 112V188M200 112C200 155 336 113 336 188"/><circle cx="200" cy="112" r="4"/>
 {#if simulated&&solar>10}<path class="energy-stream solar-stream" d="M200 52V112" pathLength="100"/>{/if}
 {#if simulated&&usage>10}<path class="energy-stream" d="M200 112C200 155 64 113 64 188" pathLength="100"/>{/if}
 {#if simulated&&Math.abs(battery||0)>10}<path class="energy-stream" class:reverse={battery<0} d="M200 112V188" pathLength="100"/>{/if}
 {#if simulated&&Math.abs(grid||0)>10}<path class="energy-stream grid-stream" class:reverse={grid>0} d="M200 112C200 155 336 113 336 188" pathLength="100"/>{/if}
 </svg>
 <div class="network-node network-solar"><span class="network-icon sun"><Icon name="sun" size={27}/></span><span>Solar producing</span><strong>{power(solar)}</strong></div>
 <div class="network-leaves"><div class="network-node"><span class="network-icon"><Icon name="home" size={23}/></span><span>Home using</span><strong>{power(usage)}</strong><small>Household load</small></div><div class="network-node"><span class="network-icon"><Icon name="battery" size={23}/></span><span>Battery</span><strong>{power(battery===null?null:Math.abs(battery))}</strong><small>{battery===null?'Not reported':battery>0?'Charging':battery<0?'Supplying energy':'Idle'}</small></div><div class="network-node"><span class="network-icon"><Icon name="grid" size={23}/></span><span>Grid</span><strong>{power(grid===null?null:Math.abs(grid))}</strong><small>{grid===null?'Not reported':grid>0?'Importing':grid<0?'Exporting':'No transfer'}</small></div></div>
</div>
<p class="network-note">{simulated?'Solar, storage and grid support respond as household demand changes.':'Each figure is a provider reading. Connecting lines show system components, not measured transfers between them.'}</p>
<style>.network-lines .energy-stream{stroke:#79a844;stroke-width:4;stroke-dasharray:1 12;stroke-linecap:round;animation:energy-travel 2.8s linear infinite}.network-lines .solar-stream{stroke:#b1ce5e}.network-lines .grid-stream{stroke:#6b9477}.network-lines .reverse{animation-direction:reverse}@keyframes energy-travel{to{stroke-dashoffset:-104}}@media(prefers-reduced-motion:reduce){.network-lines .energy-stream{animation:none;stroke-dasharray:4 9}}</style>
