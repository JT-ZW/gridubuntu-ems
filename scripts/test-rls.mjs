import pg from 'pg';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
const client=new pg.Client({connectionString:process.env.SUPABASE_DB_URL,connectionTimeoutMillis:12000});
try{
 await client.connect();await client.query('begin');
 const users=[randomUUID(),randomUUID()];const nodes=[randomUUID(),randomUUID()];
 for(let i=0;i<2;i++){
  await client.query("insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,invited_at) values($1,'authenticated','authenticated',$2,'{}','{}',now(),now(),now())",[users[i],`rls-${users[i]}@example.invalid`]);
  await client.query("insert into public.portal_profiles(id,full_name) values($1,'RLS test')",[users[i]]);
  await client.query("insert into public.portal_nodes(id,reference,display_name) values($1,$2,'RLS test residence')",[nodes[i],'TEST-'+nodes[i]]);
  await client.query('insert into public.portal_node_memberships(node_id,user_id) values($1,$2)',[nodes[i],users[i]]);
 }
 await client.query('set local role authenticated');
 await client.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:users[0],role:'authenticated'})]);
 const own=await client.query('select id from public.portal_nodes');assert.deepEqual(own.rows.map(r=>r.id),[nodes[0]]);
 const other=await client.query('select id from public.portal_nodes where id=$1',[nodes[1]]);assert.equal(other.rowCount,0);
 await client.query('savepoint forbidden_write');let denied=false;
 try{await client.query("update public.portal_profiles set role='admin' where id=$1",[users[0]]);}catch(error){denied=error.code==='42501';await client.query('rollback to savepoint forbidden_write');}
 assert.equal(denied,true,'A client must never be able to promote its own role');
 await client.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:users[1],role:'authenticated'})]);
 const second=await client.query('select id from public.portal_nodes');assert.deepEqual(second.rows.map(r=>r.id),[nodes[1]]);
 await client.query('rollback');console.log('RLS passed: both clients see only their assigned node; role escalation is denied. Test records rolled back.');
}catch(error){await client.query('rollback').catch(()=>{});console.error('RLS verification failed:',error.code || error.message);process.exitCode=1;}finally{await client.end();}
