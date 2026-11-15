import pg from 'pg';import fs from 'node:fs';
const source=await new Promise((resolve,reject)=>{let buffer='';const terminal=process.stdin.isTTY;function finish(){process.stdin.removeAllListeners('data');if(terminal)process.stdin.setRawMode(false);process.stdin.pause();}if(terminal)process.stdin.setRawMode(true);process.stdin.setEncoding('utf8');process.stdin.on('data',chunk=>{buffer+=chunk;if(buffer.includes('\n')||buffer.includes('\r')){finish();resolve(buffer.trim());}});process.stdin.on('end',()=>{finish();buffer?resolve(buffer.trim()):reject(new Error('No collector configuration received.'));});process.stdin.resume();console.log('Ready for collector JSON on stdin (input is hidden).');});
const payload=JSON.parse(source);
if(!payload||!process.env.INGESTION_SECRET)throw new Error('Collector configuration is incomplete.');
const url=new URL(payload.origin);if(url.protocol!=='https:'||url.pathname!=='/')throw new Error('HTTPS origin required.');
const db=new pg.Client({connectionString:process.env.SUPABASE_DB_URL,connectionTimeoutMillis:15000});
try{await db.connect();await db.query('begin');await db.query('select pg_advisory_xact_lock(761115006)');
 await db.query('create extension if not exists pg_cron with schema pg_catalog');await db.query('create extension if not exists pg_net with schema extensions');
 await db.query('revoke all on schema net from public,anon,authenticated');await db.query('revoke all on all tables in schema net from public,anon,authenticated');await db.query('revoke all on all sequences in schema net from public,anon,authenticated');
 for(const [name,value] of [['gridubuntu_collector_authorization',process.env.INGESTION_SECRET],['gridubuntu_site_service_access',payload.siteAuthorization]]){
  if(!value)continue;const existing=(await db.query('select id from vault.secrets where name=$1',[name])).rows[0];if(existing)await db.query('select vault.update_secret($1,$2,$3)',[existing.id,value,name]);else await db.query('select vault.create_secret($1,$2)',[value,name]);
 }
 await db.query(fs.readFileSync(new URL('../supabase/collector.sql',import.meta.url),'utf8'));
 const old=(await db.query("select active from cron.job where jobname='gridubuntu-portal-collector'")).rows[0];
 const job=(await db.query("select cron.schedule('gridubuntu-portal-collector','*/15 * * * *','select public.portal_enqueue_collection();') as id")).rows[0].id;
 if(old?.active===false)await db.query('update cron.job set active=false where jobid=$1',[job]);
 await db.query('update public.portal_collector_state set enabled=$1,job_id=$2,site_url=$3 where id=true',[old?.active!==false,job,url.origin]);await db.query('commit');console.log('Collector configured for every 15 minutes. Existing paused state was preserved. Secrets are in Vault.');
}catch(error){await db.query('rollback').catch(()=>{});console.error('Collector setup failed:',error.code||'configuration_error');process.exitCode=1;}finally{await db.end();}
