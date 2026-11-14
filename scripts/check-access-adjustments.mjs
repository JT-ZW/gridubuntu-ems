import pg from 'pg';import assert from 'node:assert/strict';import fs from 'node:fs';
const db=new pg.Client({connectionString:process.env.SUPABASE_DB_URL,connectionTimeoutMillis:15000});
try {
 await db.connect();await db.query('begin');
 await db.query("set local lock_timeout='5s'");
 const before=Number((await db.query('select count(*) as n from public.system_settings')).rows[0].n);
 const sql=fs.readFileSync(new URL('../docs/sql/reviewed-access-adjustments.sql',import.meta.url),'utf8')
  .replace(/^begin;\s*$/m,'').replace(/^commit;\s*$/m,'');
 await db.query(sql);
 await db.query('set local role authenticated');
 const claims=async role=>db.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:'00000000-0000-0000-0000-000000000001',role:'authenticated',app_metadata:{role}})]);
 await claims('client');assert.equal(Number((await db.query('select count(*) as n from public.system_settings')).rows[0].n),0);
 await claims('operator');assert.equal(Number((await db.query('select count(*) as n from public.system_settings')).rows[0].n),before);
 const privileges=await db.query("select has_table_privilege('anon','public.nodes','TRUNCATE') as anon_truncate,has_table_privilege('authenticated','public.system_settings','TRUNCATE') as client_truncate,has_function_privilege('anon','public.portal_can_read_node(uuid)','EXECUTE') as anonymous_helper");
 assert.deepEqual(privileges.rows[0],{anon_truncate:false,client_truncate:false,anonymous_helper:false});
 await db.query('rollback');console.log('Proposed correction passed: clients cannot read settings; legacy operators retain access; excess privileges removed. All schema changes rolled back.');
}catch(error){console.error('Access correction check failed:',error.code||error.message);process.exitCode=1;}
finally{await db.query('rollback').catch(()=>{});await db.end();}
