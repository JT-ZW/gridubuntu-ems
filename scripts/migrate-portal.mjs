import fs from 'node:fs';import pg from 'pg';
if(!process.env.SUPABASE_DB_URL)throw new Error('SUPABASE_DB_URL is required.');
const client=new pg.Client({connectionString:process.env.SUPABASE_DB_URL,connectionTimeoutMillis:12000});
try{
 await client.connect();await client.query('begin');
 await client.query('select pg_advisory_xact_lock(761114001)');
 await client.query('create table if not exists public.portal_schema_migrations (version text primary key, applied_at timestamptz not null default now())');
 await client.query('revoke all on public.portal_schema_migrations from anon, authenticated');
 const versions=fs.readdirSync(new URL('../supabase/migrations/',import.meta.url)).filter(name=>/^\d+.*\.sql$/.test(name)).sort();
 for(const file of versions){const version=file.replace(/\.sql$/,'');const existing=await client.query('select version from public.portal_schema_migrations where version=$1',[version]);
 if(!existing.rows.length){
  const occupied=await client.query("select to_regclass('public.portal_nodes') as name");
  if(version==='202611140001_client_portal'&&occupied.rows[0].name)throw new Error('untracked_portal_schema');
  const sql=fs.readFileSync(new URL('../supabase/migrations/'+version+'.sql',import.meta.url),'utf8').replace(/^begin;\s*/i,'').replace(/commit;\s*$/i,'');
  await client.query(sql);await client.query('insert into public.portal_schema_migrations(version) values($1)',[version]);
 }
 }
 const result=await client.query("insert into public.portal_nodes(reference,display_name,location_label) values ('GU-ZW-0001','Genius Mukichi Residence','Zimbabwe') on conflict(reference) do update set display_name=excluded.display_name returning id");
 const id=result.rows[0].id;
 await client.query("insert into public.portal_provider_connections(node_id,provider) values($1,'victron') on conflict(node_id) do nothing",[id]);
 await client.query('commit');
 console.log('Portal migrations are current. Legacy settings access is restricted to operators.');
 console.log('Pilot node registered:',id);
 // Persist only the new non-secret node UUID; preserve every existing setting.
 if(fs.existsSync('.env')){let content=fs.readFileSync('.env','utf8');const match=content.match(/^VICTRON_PILOT_NODE_ID=(.*)$/m);if(!match || !match[1].trim())content=match?content.replace(/^VICTRON_PILOT_NODE_ID=.*$/m,'VICTRON_PILOT_NODE_ID='+id):content+'\nVICTRON_PILOT_NODE_ID='+id+'\n';fs.writeFileSync('.env',content);}
}catch(error){await client.query('rollback').catch(()=>{});console.error('Portal migration failed:',error.code || error.message);process.exitCode=1;}finally{await client.end();}
