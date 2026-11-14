import { createClient } from '@supabase/supabase-js';
const userId=process.argv[2];
if(!/^[0-9a-f-]{36}$/i.test(userId || ''))throw new Error('Pass the UUID of an already invited Supabase user. This script does not send email.');
const {SUPABASE_URL,VICTRON_VRM_INSTALLATION_ID}=process.env;
const serverKey=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!SUPABASE_URL||!serverKey)throw new Error('Set SUPABASE_URL and a private Supabase server key in .env.');
const sb=createClient(SUPABASE_URL,serverKey,{auth:{persistSession:false,autoRefreshToken:false}});
const {data:account,error:accountError}=await sb.auth.admin.getUserById(userId);
if(accountError||!account.user?.invited_at)throw new Error('The supplied user must already have been invited.');
async function result(query){const {data,error}=await query;if(error)throw new Error(error.message);return data;}
await result(sb.from('portal_profiles').upsert({id:userId,full_name:'Genius Mukichi',role:'client'}));
const node=await result(sb.from('portal_nodes').upsert({reference:'GU-ZW-0001',display_name:'Genius Mukichi Residence',location_label:'Zimbabwe',timezone:'Africa/Harare'},{onConflict:'reference'}).select('id').single());
await result(sb.from('portal_node_memberships').upsert({node_id:node.id,user_id:userId}));
await result(sb.from('portal_provider_connections').upsert({node_id:node.id,provider:'victron',provider_installation_id:VICTRON_VRM_INSTALLATION_ID || null,active:true}));
console.log('Pilot residence assigned. Set VICTRON_PILOT_NODE_ID='+node.id+' in your private environment.');
