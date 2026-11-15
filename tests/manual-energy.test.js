import {test} from 'node:test';import assert from 'node:assert/strict';
import {harareDate,localDate,boundedNumber} from '../src/lib/manual-energy.js';
import {prepareVictronNode} from '../src/lib/server/onboarding.js';import {openSecret} from '../src/lib/server/secrets.js';
test('manual access dates use Harare time and reject invalid calendar dates',()=>{
 assert.equal(harareDate('2026-11-15T10:30'),'2026-11-15T08:30:00.000Z');assert.equal(localDate(harareDate('2026-11-15T10:30')),'2026-11-15T10:30');assert.equal(harareDate(''),null);
 for(const value of ['2026-02-30T10:00','2026-11-15','invalid','2026-11-15T25:00'])assert.throws(()=>harareDate(value));
});
test('manual numeric limits reject blanks and non-finite values',()=>{for(const value of ['','NaN','Infinity','-1','10001'])assert.throws(()=>boundedNumber(new Map([['limit',value]]),'limit',0,10000));assert.equal(boundedNumber(new Map([['limit','0']]),'limit',0,10000),0);});
test('onboarding refuses inaccessible IDs before requesting site readings',async()=>{
 let requested=false;await assert.rejects(()=>prepareVictronNode('node',{installation_id:'23'},'test-token',{}, {listInstallations:async()=>[{id:'24'}],readInstallation:async()=>{requested=true;}}),/accessible/);assert.equal(requested,false);
});
test('onboarding binds encrypted token to node and tests only the selected installation',async()=>{
 const key=btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
 const provider={listInstallations:async()=>[{id:'23'}],readInstallation:async(config,connection)=>{assert.equal(connection.provider_installation_id,'23');assert.equal(config.NODE_ACCESS_TOKEN,'test-token');return {status:'connected',snapshot:{metrics:Object.fromEntries(['solar','consumption','batterySoc'].map(k=>[k,{freshness:'recent'}]))},history:{totals:{solar:0,consumption:0}}};}};
 const prepared=await prepareVictronNode('node',{installation_id:'23'},'test-token',{NODE_CREDENTIAL_ENCRYPTION_KEY:key},provider);
 assert.equal(prepared.check.ready,true);assert.equal(await openSecret(prepared.ciphertext,'node',key),'test-token');await assert.rejects(()=>openSecret(prepared.ciphertext,'other-node',key));
 provider.readInstallation=async()=>({status:'partial',snapshot:null,history:null});assert.equal((await prepareVictronNode('node',{installation_id:'23'},'test-token',{NODE_CREDENTIAL_ENCRYPTION_KEY:key},provider)).check.ready,false);
});
