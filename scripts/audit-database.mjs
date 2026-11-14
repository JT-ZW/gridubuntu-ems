import pg from 'pg';
import {mkdir,writeFile} from 'node:fs/promises';

// Metadata only: no customer records, tokens, connection strings or function bodies.
const db=new pg.Client({connectionString:process.env.SUPABASE_DB_URL,connectionTimeoutMillis:15000});
try {
 await db.connect();
 await db.query('begin read only');
 const queries={
  tables:"select c.relname as name,c.relrowsecurity as rls,c.relforcerowsecurity as force_rls from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' order by 1",
  columns:"select table_name,column_name,data_type,is_nullable from information_schema.columns where table_schema='public' order by table_name,ordinal_position",
  policies:"select tablename,policyname,roles,cmd,qual,with_check from pg_policies where schemaname='public' order by tablename,policyname",
  grants:"select table_name,grantee,privilege_type from information_schema.role_table_grants where table_schema='public' and grantee in ('anon','authenticated') order by 1,2,3",
  constraints:"select c.relname as table_name,k.conname,k.contype,pg_get_constraintdef(k.oid) as definition from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' order by 1,2",
  indexes:"select tablename,indexname,indexdef from pg_indexes where schemaname='public' order by 1,2",
  functions:"select p.proname,p.prosecdef as security_definer,p.proconfig,p.proacl::text from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' order by 1"
 };
 const result={checkedAt:new Date().toISOString()};
 for(const [key,sql] of Object.entries(queries))result[key]=(await db.query(sql)).rows;
 result.counts=[];
 for(const table of result.tables){
  const quoted='"'+table.name.replaceAll('"','""')+'"';
  const count=(await db.query(`select count(*)::int as count from public.${quoted}`)).rows[0].count;
  result.counts.push({table:table.name,count});
 }
 result.roleFunction=(await db.query("select pg_get_functiondef('public.auth_user_role()'::regprocedure) as definition")).rows[0]?.definition;
 await db.query('set local role authenticated');
 await db.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:'00000000-0000-0000-0000-000000000001',role:'authenticated'})]);
 result.unassignedClientVisibleSettings=(await db.query('select count(*)::int as count from public.system_settings')).rows[0].count;
 await db.query('rollback');
 await mkdir('.private',{recursive:true});
 await writeFile('.private/database-audit.json',JSON.stringify(result,null,2));
 console.log(JSON.stringify({tableCount:result.tables.length,roleFunction:result.roleFunction,unassignedClientVisibleSettings:result.unassignedClientVisibleSettings,tokenConfigured:Boolean(process.env.VICTRON_VRM_ACCESS_TOKEN)},null,2));
}catch(error){console.error('Database audit failed:',error.code||'connection_error');process.exitCode=1;}
finally{await db.end();}
