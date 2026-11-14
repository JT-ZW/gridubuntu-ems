import worker from '../dist/server/index.js';import fs from 'node:fs';import assert from 'node:assert/strict';
const ASSETS={async fetch(request){const pathname=decodeURIComponent(new URL(request.url).pathname);const safe=pathname.includes('..')?'':pathname;for(const file of ['dist/client'+safe,'dist/client'+safe+'.html','dist/client'+safe+'/index.html']){if(fs.existsSync(file)&&fs.statSync(file).isFile())return new Response(fs.readFileSync(file));}return new Response('Not found',{status:404});}};
for(const path of ['/','/product','/impact','/about','/team','/contact','/login','/portal-preview','/portal-preview?view=history','/portal-preview?view=system','/portal-preview?view=account']){
 const response=await worker.fetch(new Request('https://portal.example'+path),{ASSETS},{waitUntil(){}});assert.equal(response.status,200,path);const text=await response.text();assert.ok(text.length>200,path+' must render content');console.log('Worker HTTP 200:',path);
}
for(const path of ['/portal','/portal/history','/portal/system','/portal/account']){
 const response=await worker.fetch(new Request('https://portal.example'+path),{ASSETS},{waitUntil(){}});assert.equal(response.status,303,path);assert.equal(response.headers.get('location'),'/login');assert.match(response.headers.get('cache-control'),/no-store/);console.log('Protected:',path);
}
const response=await worker.fetch(new Request('https://portal.example/api/internal/ingest',{method:'POST'}),{ASSETS},{waitUntil(){}});assert.equal(response.status,401);
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(dir+'/'+e.name):[dir+'/'+e.name]);}
for(const file of files('dist/client').filter(p=>p.endsWith('.js')||p.endsWith('.html'))){assert.equal(/VICTRON_VRM_ACCESS_TOKEN|SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY|SUPABASE_DB_URL|INGESTION_SECRET/.test(fs.readFileSync(file,'utf8')),false,'Private configuration referenced in '+file);}
console.log('Worker checks passed; no private environment references in client assets.');
