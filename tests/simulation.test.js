import {test} from 'node:test';import assert from 'node:assert/strict';
import {simulationEnabled,simulatedTelemetry,simulatedIntervals,prototypePower} from '../src/lib/simulation.js';
const settings={LOCAL_TEST_NODE_ENABLED:'true',VICTRON_PILOT_NODE_ID:'pilot'};
test('explicit database prototype mode works on HTTPS without local environment flags and remains node scoped',()=>{
 const pilot={id:'pilot',telemetry_mode:'prototype'};
 assert.equal(simulationEnabled('https://gridubuntu.com',{},'pilot',pilot),true);
 assert.equal(simulationEnabled('https://www.gridubuntu.com',{},'pilot',pilot),true);
 assert.equal(simulationEnabled('https://preview.vercel.app',{},'pilot',pilot),true);
 assert.equal(simulationEnabled('https://gridubuntu.com',{},'other',pilot),false);
 assert.equal(simulationEnabled('https://gridubuntu.com',{},'pilot',{...pilot,telemetry_mode:'measured'}),false);
 assert.equal(simulationEnabled('http://localhost:5173',settings,'pilot',{...pilot,telemetry_mode:'measured'}),false);
 assert.equal(simulationEnabled('http://untrusted.test',{},'pilot',pilot),false);
 assert.equal(simulationEnabled('garbage',{},'pilot',pilot),false);
});
test('presentation power changes on three-second ticks and balances across a full cycle',()=>{
 const start=Date.parse('2026-11-15T10:00:00Z');const readings=Array.from({length:61},(_,i)=>prototypePower(start+i*3000));
 assert.ok(new Set(readings.map(p=>p.solar)).size>10);assert.ok(new Set(readings.map(p=>p.consumption)).size>10);
 assert.ok(readings.some(p=>p.batteryPower>0));assert.ok(readings.some(p=>p.batteryPower<0));assert.ok(readings.some(p=>p.grid>0));
 for(const p of readings)assert.equal(p.solar+p.grid,p.consumption+p.batteryPower);
});
test('simulation is limited to localhost and the configured pilot',()=>{
 assert.equal(simulationEnabled('http://localhost:5173',settings,'pilot'),true);
 for(const origin of ['https://gridubuntu.com','https://localhost.evil.test','garbage'])assert.equal(simulationEnabled(origin,settings,'pilot'),false);
 assert.equal(simulationEnabled('http://localhost:5173',settings,'other'),false);
 assert.equal(simulationEnabled('http://localhost:5173',{...settings,LOCAL_TEST_NODE_ENABLED:'false'},'pilot'),false);
});
test('simulated power balances and all periods stop at the current time',()=>{
 for(const now of ['2026-11-15T10:35:00Z','2026-11-15T23:30:00Z'])for(const range of ['today','7d','30d']){
  const a=simulatedTelemetry(range,new Date(now));assert.equal(a.verified,false);assert.equal(a.simulated,true);
  const m=a.snapshot.metrics;assert.equal(m.solar.value+m.grid.value,m.consumption.value+m.batteryPower.value);
  assert.ok(m.batterySoc.value>=0&&m.batterySoc.value<=100);
  for(const metric of ['solar','consumption','gridImport','gridExport']){
   assert.ok(a.history[metric].every(p=>p.value>=0&&Date.parse(p.time)<Date.parse(now)));
   assert.equal(a.history.totals[metric],a.history[metric].reduce((s,p)=>s+p.value,0));
  }
  for(const row of simulatedIntervals('pilot',range,new Date(now))){assert.ok(Date.parse(row.interval_end)<=Date.parse(now));assert.equal(row.source,'local_simulator');}
 }
});
test('client hourly totals match admin daily history for the same clock',()=>{
 const now=new Date('2026-11-15T12:35:00Z');const client=simulatedTelemetry('today',now);const admin=simulatedTelemetry('7d',now);
 for(const metric of ['solar','consumption','gridImport','gridExport'])assert.ok(Math.abs(client.history.totals[metric]-admin.history[metric].at(-1).value)<1e-9);
});
