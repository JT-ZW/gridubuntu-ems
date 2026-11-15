<script>
 import {onMount} from 'svelte';
 import {prototypePower} from '$lib/simulation.js';
 let {reportedAt}=$props();
 let container=$state(),width=$state(900),hovered=$state(null),selected=$state(20);
 let now=$derived(Date.parse(reportedAt||new Date().toISOString()));
 let samples=$derived(Array.from({length:21},(_,i)=>{const time=now-(20-i)*3000;return {time,...prototypePower(time)};}));
 // A fixed 4 kW minimum keeps the scale stable as this short window advances.
 let maximum=$derived(Math.ceil(Math.max(4000,...samples.flatMap(p=>[p.solar,p.consumption]))/1000));
 const left=54,right=20,top=32,bottom=232,height=282;
 let plotWidth=$derived(Math.max(180,width-left-right));
 let active=$derived(hovered??selected);
 let reading=$derived(samples[active]);
 const time=value=>new Intl.DateTimeFormat('en-GB',{timeZone:'Africa/Harare',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(value);
 const power=value=>(value/1000).toFixed(2);
 const x=index=>left+index/20*plotWidth;
 const y=value=>bottom-value/1000/maximum*(bottom-top);
 const line=key=>samples.map((p,i)=>`${x(i)},${y(p[key])}`).join(' ');
 function inspect(event){const rect=event.currentTarget.getBoundingClientRect();hovered=Math.max(0,Math.min(20,Math.round(((event.clientX-rect.left)/rect.width*width-left)/plotWidth*20)));}
 onMount(()=>{const observer=new ResizeObserver(([entry])=>width=Math.max(260,entry.contentRect.width));observer.observe(container);return()=>observer.disconnect();});
</script>
<section class="power-trend"><div class="trend-title"><div><span class="overline">POWER ACTIVITY</span><h2>Your energy in motion</h2></div><span class="trend-window">Last 60 seconds · 3-second intervals</span></div>
 <div class="trend-readout"><span class="reading-time">{time(reading.time)} CAT{active===20?' · Latest':''}</span><span><i class="solar-key"></i>Solar <strong>{power(reading.solar)} kW</strong></span><span><i class="usage-key"></i>Household <strong>{power(reading.consumption)} kW</strong></span></div>
 <div bind:this={container} class="trend-canvas"><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Power in kilowatts against time in Central Africa Time over the last sixty seconds. Latest solar production ${power(samples[20].solar)} kilowatts; household demand ${power(samples[20].consumption)} kilowatts.`} onpointermove={inspect} onpointerleave={()=>hovered=null}>
  <text x="0" y="15" class="axis-title">Power (kW)</text>
  {#each [0,1,2,3,4] as tick}{@const value=tick*maximum/4}{@const tickY=y(value*1000)}<line x1={left} x2={width-right} y1={tickY} y2={tickY} class="grid-line"/><text x={left-10} y={tickY+4} text-anchor="end" class="tick-label">{value.toFixed(1)}</text>{/each}
  {#each (width<520?[0,10,20]:[0,5,10,15,20]) as index}<line x1={x(index)} x2={x(index)} y1={top} y2={bottom} class="vertical-grid"/><text x={x(index)} y={bottom+20} text-anchor={index===0?'start':index===20?'end':'middle'} class="tick-label">{time(samples[index].time)}</text>{/each}
  <path d={`M${left} ${top}V${bottom}H${width-right}`} class="axis-line"/>
  <polyline points={line('solar')} class="trend-solar"/><polyline points={line('consumption')} class="trend-usage"/>
  <line x1={x(active)} x2={x(active)} y1={top} y2={bottom} class="crosshair"/>
  <circle cx={x(active)} cy={y(reading.solar)} r="4" class="solar-dot"/><circle cx={x(active)} cy={y(reading.consumption)} r="4" class="usage-dot"/>
  <text x={left+plotWidth/2} y={height-3} text-anchor="middle" class="axis-title">Time (CAT · UTC+2)</text>
 </svg></div>
 <div class="trend-legend"><span><i class="solar-key"></i>Solar production</span><span><i class="usage-key"></i>Household demand</span></div>
 <div class="trend-inspector"><label for="power-reading">Inspect reading</label><input id="power-reading" type="range" min="0" max="20" step="1" bind:value={selected} aria-valuetext={`${time(reading.time)} CAT: solar ${power(reading.solar)} kilowatts, household ${power(reading.consumption)} kilowatts`}/><span>Latest: {time(samples[20].time)} CAT</span></div>
 <p class="trend-note">Power is the rate of electricity production or use. Both series share the same zero-based kW scale.</p>
</section>
<style>
 .power-trend{background:#fbfdf8;border:1px solid #dce6d4;border-radius:18px;padding:24px;margin:20px 0;min-width:0}.trend-title{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}.trend-title h2{font-size:18px!important;margin:6px 0 16px}.overline{font-size:10px;letter-spacing:.1em;color:#6d8058}.trend-window{font-size:11px;color:#61725d}.trend-readout{display:flex;align-items:center;gap:20px;flex-wrap:wrap;background:#f0f5e9;border:1px solid #e0e9d7;border-radius:8px;padding:12px 14px;margin:2px 0 18px;font-size:12px;color:#4c6345;font-variant-numeric:tabular-nums}.trend-readout strong{font-weight:700;color:#243e30;margin-left:5px}.reading-time{font-weight:600}.trend-canvas{width:100%;min-width:0}.trend-canvas svg{display:block;width:100%;height:auto;touch-action:pan-y}.grid-line{stroke:#dce5d3;stroke-dasharray:3 4;stroke-width:1}.vertical-grid{stroke:#e9eee3;stroke-width:1}.axis-line{stroke:#a6b79c;stroke-width:1;fill:none}.tick-label{font-size:11px;fill:#53684b;font-variant-numeric:tabular-nums}.axis-title{font-size:11px;font-weight:600;fill:#40573a}.trend-canvas polyline{fill:none;stroke-width:2.5;stroke-linejoin:round;stroke-linecap:round;vector-effect:non-scaling-stroke}.trend-solar{stroke:#80ad37}.trend-usage{stroke:#355f43;stroke-dasharray:7 3}.crosshair{stroke:#9aab8b;stroke-width:1;stroke-dasharray:3 3}.solar-dot{fill:#80ad37;stroke:#fff;stroke-width:2}.usage-dot{fill:#355f43;stroke:#fff;stroke-width:2}.trend-legend{display:flex;gap:22px;align-items:center;margin-top:14px;flex-wrap:wrap;font-size:12px;color:#53684b}.power-trend i{display:inline-block;width:9px;height:9px;border-radius:2px;margin-right:7px}.solar-key{background:#80ad37}.usage-key{background:#355f43}.trend-inspector{display:flex;align-items:center;gap:14px;margin-top:20px;font-size:11px;color:#53684b;flex-wrap:wrap}.trend-inspector input{flex:1;min-width:100px;max-width:260px;accent-color:#496d51;cursor:pointer}.trend-inspector>span{margin-left:auto;font-variant-numeric:tabular-nums}.trend-note{font-size:11px;color:#61725d;line-height:1.7;margin:14px 0 0}@media(max-width:640px){.power-trend{padding:18px}.trend-readout{gap:10px 16px;font-size:11px}.reading-time{flex-basis:100%}.trend-inspector>span{flex-basis:100%;margin-left:0}.tick-label{font-size:10px}}
</style>
