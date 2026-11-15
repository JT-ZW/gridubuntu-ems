import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';import assert from 'node:assert/strict';
if(process.platform==='win32'&&process.env.VERCEL!=='1'&&process.env.DEPLOY_TARGET!=='vercel'){
 await import('./smoke-worker.mjs');
}else{
 const root=path.resolve('.vercel/output');
 const deployment=JSON.parse(fs.readFileSync(path.join(root,'config.json'),'utf8'));assert.equal(deployment.version,3);assert.ok(deployment.routes.length>0);
 const directory=path.join(root,'functions','![-]','catchall.func');
 const settings=JSON.parse(fs.readFileSync(path.join(directory,'.vc-config.json'),'utf8'));assert.equal(settings.runtime,'nodejs24.x');
 const module=await import(pathToFileURL(path.resolve(directory,settings.handler)).href);const app=module.default;assert.equal(typeof app.fetch,'function');
 for(const route of ['/','product','impact','about','team','contact']){const file=route==='/'?'index.html':route+'.html';assert.ok(fs.existsSync(path.join(root,'static',file)),file+' prerendered');}
 for(const route of ['/login','/portal-preview','/portal-preview?view=history','/portal-preview?view=system',...['overview','clients','nodes','communities','history','operations','forecasting','sharing','settings','activity'].map(view=>'/admin-preview?view='+view)]){
  const response=await app.fetch(new Request('https://release.example'+route));assert.equal(response.status,200,route);assert.ok((await response.text()).length>200);
 }
 for(const route of ['/portal','/portal/history','/admin','/admin/nodes','/admin/sharing']){const response=await app.fetch(new Request('https://release.example'+route));assert.equal(response.status,303,route);assert.equal(response.headers.get('location'),'/login');assert.match(response.headers.get('cache-control'),/no-store/);}
 assert.equal((await app.fetch(new Request('https://release.example/api/internal/ingest',{method:'POST'}))).status,401);
 const files=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?files(path.join(dir,entry.name)):[path.join(dir,entry.name)]);
 for(const file of files(path.join(root,'static')).filter(f=>/\.(js|html)$/.test(f)))assert.equal(/VICTRON_VRM_ACCESS_TOKEN|SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY|SUPABASE_DB_URL|INGESTION_SECRET|NODE_CREDENTIAL_ENCRYPTION_KEY|portal_connection_secrets/.test(fs.readFileSync(file,'utf8')),false,'Private configuration in public assets');
 console.log('Vercel artifact passed: prerendered marketing, SSR preview/login, protected client/admin routes, ingestion authorization and public-asset secret isolation.');
}
