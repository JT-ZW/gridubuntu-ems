import test from 'node:test';import assert from 'node:assert/strict';
import {monitoringState} from '../src/lib/system-health.js';
const now=Date.parse('2026-11-15T10:00:00Z');
const connection={active:true,provider_installation_id:'123',verified_at:'2026-11-14T10:00:00Z'};
const snapshot={reported_at:new Date(now-30000).toISOString(),measurements:{solar:{value:0},batterySoc:{value:65}}};
const state=(c=connection,s=snapshot,sync={status:'connected'},token=true)=>monitoringState(c,s,sync,token,20,now);
test('reporting means recent available measurements, including valid zero power, not certified equipment health',()=>{
 assert.equal(state().key,'reporting');assert.match(state().detail,/does not certify/);
 assert.equal(state(connection,{...snapshot,measurements:{solar:{value:null}}}).key,'unavailable');
});
test('configuration and paused nodes never report as healthy from old snapshots',()=>{
 assert.equal(state({...connection,active:false}).key,'paused');assert.equal(state({...connection,verified_at:null}).key,'setup');assert.equal(state(connection,snapshot,{},false).key,'setup');
});
test('collection failures, partial collection and battery warnings keep separate meanings',()=>{
 assert.equal(state(connection,snapshot,{status:'failed'}).key,'unavailable');assert.match(state(connection,snapshot,{status:'failed'}).detail,/condition is unknown/);
 assert.equal(state(connection,snapshot,{status:'partial'}).key,'partial');assert.equal(state(connection,{...snapshot,measurements:{batterySoc:{value:12}}}).key,'attention');
});
test('per-metric timestamps expose stale, invalid and future readings; prototypes remain separate',()=>{
 for(const timestamp of [new Date(now-16*60000).toISOString(),'invalid',new Date(now+120000).toISOString()])assert.equal(state(connection,{...snapshot,measurements:{solar:{value:100,reportedAt:timestamp}}}).key,'delayed');
 assert.equal(state({...connection,simulated:true}).key,'prototype');
});
