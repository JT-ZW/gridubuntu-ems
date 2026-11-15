import pg from 'pg';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
const db=new pg.Client({connectionString:process.env.SUPABASE_DB_URL,connectionTimeoutMillis:15000});
try{
 await db.connect();await db.query('begin');const admin=randomUUID(),client=randomUUID();
 for(const [id,role] of [[admin,'admin'],[client,'client']]){await db.query("insert into auth.users(id,aud,role,email,invited_at,created_at,updated_at) values($1,'authenticated','authenticated',$2,now(),now(),now())",[id,'admin-test-'+id+'@example.invalid']);await db.query('insert into public.portal_profiles(id,full_name,role) values($1,$2,$3)',[id,'Temporary admin test',role]);}
 const write=async(actor,action,payload)=>(await db.query('select public.portal_admin_write($1,$2,$3::jsonb) as result',[actor,action,JSON.stringify(payload)])).rows[0].result;
 async function denied(fn,pattern){await db.query('savepoint forbidden');let failure;try{await fn();}catch(e){failure=e;await db.query('rollback to savepoint forbidden');}assert.ok(failure,'Expected operation to fail');if(pattern)assert.match(failure.message,pattern);}
 await db.query('set local role authenticated');await db.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:admin,role:'authenticated'})]);
 await denied(()=>write(admin,'community.save',{name:'Forbidden direct browser RPC'}),/permission denied/);
 await denied(()=>db.query('select ciphertext from public.portal_connection_secrets'),/permission denied/);
 await db.query('reset role');await db.query('set local role service_role');
 await denied(()=>write(client,'community.save',{name:'Client cannot masquerade as admin'}),/admin_required/);
 const community=(await write(admin,'community.save',{name:'Temporary verification community'})).community_id;
 const node=(await write(admin,'node.save',{display_name:'Temporary verification residence',location_label:'Test',community_id:community})).node_id;
 await write(admin,'client.save',{user_id:client,full_name:'Temporary client',node_id:node});
 await write(admin,'connection.token',{node_id:node,revision:1,ciphertext:'encrypted-test-placeholder'});
 await denied(()=>write(admin,'connection.select',{node_id:node,revision:1,installation_id:'123'}),/connection_changed/);
 await write(admin,'connection.select',{node_id:node,revision:2,installation_id:'123'});
 await denied(()=>db.query('select public.portal_commission_connection($1,$2,3,$3)',[admin,node,'Compared with VRM in test']),/verification_required/);
 await write(admin,'connection.check',{node_id:node,revision:3,result:{ready:true}});
 await db.query('select public.portal_commission_connection($1,$2,3,$3)',[admin,node,'Compared measurement units with VRM during controlled database test']);
 const checks=await db.query("select result->'verification'->>'notes' as notes from public.portal_connection_checks where node_id=$1",[node]);assert.match(checks.rows[0].notes,/controlled database test/);
 const snapshot={reportedAt:new Date().toISOString(),metrics:{solar:{value:0,reportedAt:new Date().toISOString()}}};
 const interval={metric:'solar',interval_start:'2026-11-14T00:00:00+02:00',interval_end:'2026-11-14T01:00:00+02:00',resolution:'hours',energy_kwh:1};
 const collect=(revision,s=snapshot,intervals=[interval])=>db.query('select public.portal_store_collection($1,$2,$3::jsonb,$4::jsonb,$5)',[node,revision,JSON.stringify(s),JSON.stringify(intervals),'connected']);
 await denied(()=>collect(2),/connection_changed/);await collect(3);await collect(3);
 assert.equal((await db.query('select * from public.portal_energy_intervals where node_id=$1',[node])).rowCount,1);
 await denied(()=>collect(3,{...snapshot,reportedAt:new Date(Date.now()+1000).toISOString()},[{...interval,energy_kwh:-1}]),/check constraint/);
 assert.equal((await db.query('select * from public.portal_telemetry_snapshots where node_id=$1',[node])).rowCount,1);
 await denied(()=>write(admin,'connection.select',{node_id:node,revision:3,installation_id:'456'}),/history_mapping_locked/);
 await write(admin,'policy.save',{community_id:community,model:'equal_share',battery_reserve:20,household_limit_kw:1,notes:'Planning only'});
 await write(admin,'policy.save',{community_id:community,model:'essential_first',battery_reserve:30,household_limit_kw:1,notes:'Second version'});
 const policies=await db.query('select version from public.portal_allocation_policies where community_id=$1 order by version',[community]);assert.deepEqual(policies.rows.map(p=>p.version),[1,2]);
 await db.query('reset role');await db.query('set local role authenticated');await db.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:client,role:'authenticated'})]);assert.equal((await db.query('select id from public.portal_nodes where id=$1',[node])).rowCount,1);assert.equal((await db.query('select key from public.system_settings')).rowCount,0);
 await db.query('reset role');await db.query('set local role service_role');await write(admin,'client.access',{user_id:client,active:false});
 await db.query('reset role');await db.query('set local role authenticated');await db.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:client,role:'authenticated'})]);assert.equal((await db.query('select id from public.portal_nodes where id=$1',[node])).rowCount,0);
 await db.query('rollback');console.log('Admin database checks passed: RPC authorization, secret isolation, revision locks, atomic/idempotent collection, historical site mapping protection, verification notes, policy versioning and immediate client revocation. Test changes rolled back.');
}catch(error){console.error('Admin database verification failed:',error.code||error.message);process.exitCode=1;}finally{await db.query('rollback').catch(()=>{});await db.end();}
