import {createClient} from '@supabase/supabase-js';
import {error,redirect} from '@sveltejs/kit';
import {config} from './config';
import {openSecret} from './secrets.js';
export function serviceClient(event){const c=config(event);const key=c.SUPABASE_SECRET_KEY||c.SUPABASE_SERVICE_ROLE_KEY;if(!c.SUPABASE_URL||!key)error(503,'Server configuration is incomplete.');return createClient(c.SUPABASE_URL,key,{auth:{persistSession:false,autoRefreshToken:false}});}
export function requireAdmin(event){return event.locals.adminContext||(event.locals.adminContext=(async()=>{const user=await event.locals.getUser();if(!user)redirect(303,'/login');const {data:profile,error:failure}=await event.locals.supabase.from('portal_profiles').select('id,role,active,full_name,email').eq('id',user.id).single();if(failure||profile?.role!=='admin'||!profile.active)error(403,'Administrator access is required.');return {user,profile,sb:serviceClient(event)};})());}
export async function result(query){const {data,error:failure}=await query;if(failure)throw new Error('database_error');return data;}
export async function nodeToken(event,sb,nodeId){const secret=await result(sb.from('portal_connection_secrets').select('ciphertext').eq('node_id',nodeId).maybeSingle());return secret?openSecret(secret.ciphertext,nodeId,config(event).NODE_CREDENTIAL_ENCRYPTION_KEY):null;}
export async function auditWrite(sb,actor,action,payload){const {data,error:failure}=await sb.rpc('portal_admin_write',{p_actor:actor,p_action:action,p_payload:payload});if(failure){const known=['connection_changed','history_mapping_locked','verification_required','confirmation_required','invalid_client','admin_required','not_found'];throw new Error(known.find(code=>failure.message?.includes(code))||'database_error');}return data;}
