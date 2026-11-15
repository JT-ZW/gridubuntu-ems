import {test} from 'node:test';import assert from 'node:assert/strict';
import {load,actions} from '../src/routes/(application)/auth/confirm/+page.server.js';
test('GET only prepares recovery confirmation without exchanging credentials',()=>{
 const data=load({url:new URL('http://localhost/auth/confirm?code=temporary-code')});assert.equal(data.code,'temporary-code');assert.equal(data.tokenHash,'');
});
const event=(fields,auth)=>({locals:{supabase:{auth}},request:new Request('http://localhost/auth/confirm',{method:'POST',body:new URLSearchParams(fields)})});
test('PKCE recovery exchanges its code on POST and proceeds to password setup',async()=>{
 let called=false;await assert.rejects(()=>actions.default(event({code:'temporary-code'},{exchangeCodeForSession:async code=>{assert.equal(code,'temporary-code');called=true;return {error:null};}})),error=>error.status===303&&error.location==='/auth/set-password');assert.equal(called,true);
});
test('failed PKCE recovery gives a safe retry message',async()=>{
 const result=await actions.default(event({code:'expired'},{exchangeCodeForSession:async()=>({error:{message:'private provider details'}})}));assert.equal(result.status,400);assert.ok(!result.data.message.includes('private provider'));
});
test('private hashed-token invitations retain their separate verification flow',async()=>{
 await assert.rejects(()=>actions.default(event({token_hash:'private-test-hash',type:'invite'},{verifyOtp:async input=>{assert.deepEqual(input,{token_hash:'private-test-hash',type:'invite'});return {error:null};}})),error=>error.status===303&&error.location==='/auth/set-password');
});
