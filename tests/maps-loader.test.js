import {test} from 'node:test';import assert from 'node:assert/strict';
test('map loader shares concurrent requests and resolves only when Google is ready',async()=>{
 const oldWindow=globalThis.window,oldDocument=globalThis.document;let script;
 try{
  globalThis.window={dispatchEvent(){}};globalThis.document={createElement:()=>({remove(){}}),head:{append(value){script=value;}}};
  const {loadGoogleMaps}=await import('../src/lib/maps.js?concurrency');const first=loadGoogleMaps('browser-test');assert.equal(loadGoogleMaps('browser-test'),first);assert.ok(script.src.startsWith('https://maps.googleapis.com/maps/api/js?'));
  window.google={maps:{importLibrary(){}}};window.gridUbuntuMapsReady();assert.equal(await first,window.google.maps);
 }finally{globalThis.window=oldWindow;globalThis.document=oldDocument;}
});
test('Google authentication failures reject the loader instead of leaving a blank loading state',async()=>{
 const oldWindow=globalThis.window,oldDocument=globalThis.document;let removed=false,notified=false;
 try{
  globalThis.window={dispatchEvent(){notified=true;}};globalThis.document={createElement:()=>({remove(){removed=true;}}),head:{append(){}}};
  const {loadGoogleMaps}=await import('../src/lib/maps.js?failure');const pending=loadGoogleMaps('invalid-test');const rejection=assert.rejects(pending,/could not load/);window.gm_authFailure();await rejection;assert.equal(removed,true);assert.equal(notified,true);
 }finally{globalThis.window=oldWindow;globalThis.document=oldDocument;}
});
