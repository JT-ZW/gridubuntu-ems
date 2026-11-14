<script>
 import Icon from './Icon.svelte';
 import {formatValue,formatTime} from '$lib/energy';
 let {metrics={}}=$props();
 let soc=$derived(metrics.batterySoc?.value??null);
 let level=$derived(soc===null?0:Math.max(0,Math.min(100,soc)));
 let battery=$derived(metrics.batteryPower?.value??null);
 let direction=$derived(battery===null?'Power not reported':battery>0?'Charging':battery<0?'Supplying energy':'Battery idle');
</script>
<section class="panel storage-panel" aria-label="Battery storage">
 <div class="panel-heading"><div><span class="overline">STORED ENERGY</span><h2>Your battery</h2></div><span class="storage-icon"><Icon name="battery" size={21}/></span></div>
 <div class="storage-gauge">
  <svg viewBox="0 0 240 139" aria-hidden="true"><path d="M20 120 A100 100 0 0 1 220 120" pathLength="100" class="gauge-track"/><path d="M20 120 A100 100 0 0 1 220 120" pathLength="100" class="gauge-fill" stroke-dasharray={`${level} 100`}/></svg>
  <div class="gauge-reading"><span>Battery charge</span><strong>{formatValue(soc,'',0)}<small>%</small></strong><span class="battery-state">{direction}</span></div>
 </div>
 <div class="storage-scale"><span>Empty</span><span>Full</span></div>
 <div class="storage-segments" aria-hidden="true">{#each Array(20) as _,i}<i class:filled={soc!==null&&i*5<level}></i>{/each}</div>
 <div class="storage-power"><span><Icon name="battery" size={15}/>{direction}</span><strong>{formatValue(battery===null?null:Math.abs(battery)/1000,'kW',2)}</strong></div>
 <p class="storage-note">{soc===null?'Your battery level will appear after connection.':`Charge reported ${formatTime(metrics.batterySoc.reportedAt)}`}</p>
</section>
