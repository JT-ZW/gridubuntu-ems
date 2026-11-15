import {createClient} from '@supabase/supabase-js';
import pg from 'pg';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
const origin=process.env.SIMULATION_TEST_ORIGIN||'http://localhost:5173',node=process.env.VICTRON_PILOT_NODE_ID;
if(!/^http:\/\/localhost:\d+$/.test(origin))throw new Error('Use a dedicated local test server.');
const sb=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const db=new pg.Client({connectionString:process.env.SUPABASE_DB_URL,connectionTimeoutMillis:15000});
const users=[],tag=randomUUID();let stage='start';
async function request(path,cookie='',form=null){const r=await fetch(origin+path,{method:form?'POST':'GET',headers:{Accept:'text/html',...(cookie?{Cookie:cookie}:{}),...(form?{Origin:origin}:{})},...(form?{body:new URLSearchParams(form)}:{}),redirect:'manual',signal:AbortSignal.timeout(60000)});return {status:r.status,body:await r.text(),headers:r.headers};}
async function account(role,assigned=false){
 const email=`simulation-${role}-${users.length}-${tag}@example.invalid`;const {data,error}=await sb.auth.admin.generateLink({type:'invite',email});if(error||!data.user?.id)throw new Error('test_invitation_failed');users.push(data.user.id);
 await db.query('insert into public.portal_profiles(id,full_name,email,role) values($1,$2,$3,$4)',[data.user.id,'Temporary simulation test',email,role]);
 if(assigned)await db.query('insert into public.portal_node_memberships(node_id,user_id) values($1,$2)',[node,data.user.id]);
 const r=await request('/auth/confirm','',{token_hash:data.properties.hashed_token,type:'invite'});assert.equal(r.status,303);
 return r.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
}
try{
 await db.connect();const before=await db.query('select (select count(*) from public.portal_telemetry_snapshots where node_id=$1) as snapshots,(select count(*) from public.portal_energy_intervals where node_id=$1) as intervals',[node]);
 stage='create admin';const admin=await account('admin');stage='create client';const client=await account('client',true);stage='create unassigned';const unassigned=await account('client');
 for(const path of ['/portal','/portal/history?range=today','/portal/history?range=7d','/portal/history?range=30d','/portal/system']){stage=path;const r=await request(path,client);assert.equal(r.status,200,path);assert.match(r.body,/Prototype/);assert.match(r.body,/Updates every 3 seconds/);}
 for(const path of ['/admin','/admin/clients','/admin/nodes','/admin/communities','/admin/health','/admin/operations','/admin/forecasting','/admin/sharing','/admin/settings','/admin/activity',...['overview','history','equipment','connection','access','activity'].map(tab=>'/admin/nodes/'+node+'?tab='+tab)]){stage=path;const r=await request(path,admin);assert.equal(r.status,200,path);assert.match(r.body,/Prototype/);if(process.env.VICTRON_VRM_ACCESS_TOKEN)assert.ok(!r.body.includes(process.env.VICTRON_VRM_ACCESS_TOKEN));}
 const connection=await request('/admin/nodes/'+node+'?tab=connection',admin);assert.match(connection.body,/prototype workspace is connected/);
 for(const operation of ['connection.sync','connection.commission','forecast.run']){const r=await request('/admin/nodes/'+node,admin,{operation,node_id:node,revision:'1'});assert.equal(r.status,400,operation);}
 assert.equal((await request('/admin',client)).status,403);
 const denied=await request('/portal?node='+node,unassigned);assert.ok(!denied.body.includes('Updates every 3 seconds'));assert.equal((await request('/portal')).status,303);
 const after=await db.query('select (select count(*) from public.portal_telemetry_snapshots where node_id=$1) as snapshots,(select count(*) from public.portal_energy_intervals where node_id=$1) as intervals',[node]);assert.deepEqual(after.rows,before.rows);
 console.log('Passed: client history/system, all admin sections and node tabs, protected access, blocked real-data actions, no exposed token and no simulated measurement writes. Real activation links remain unused.');
}catch(error){console.error('Simulation HTTP verification failed:',stage,error.code||error.message,(error.stack||'').split('\n').filter(line=>line.includes('test-simulation-http')).join(' '));process.exitCode=1;}
finally{for(const id of users){const {error}=await sb.auth.admin.deleteUser(id);if(error){console.error('Temporary test user cleanup needs inspection.');process.exitCode=1;}}await db.end();}
