import {createClient} from '@supabase/supabase-js';import fs from 'node:fs';
const [email,originArg]=process.argv.slice(2);const origin=originArg || process.env.APP_ORIGIN;
if(!email||!origin)throw new Error('Pass the pilot email and app origin.');
const sb=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
// generateLink creates an invitation without sending email. The private link
// is deliberately never printed to a terminal, committed, or put in a URL log.
const {data,error}=await sb.auth.admin.generateLink({type:'invite',email,options:{redirectTo:origin+'/auth/confirm',data:{full_name:'Genius Mukichi'}}});
if(error||!data.user?.id||!data.properties?.hashed_token)throw new Error('Could not prepare invitation: '+(error?.code || 'invalid_response'));
async function result(query){const {data,error}=await query;if(error)throw new Error('Pilot assignment failed: '+error.code);return data;}
await result(sb.from('portal_profiles').upsert({id:data.user.id,full_name:'Genius Mukichi',role:'client'}));
const node=await result(sb.from('portal_nodes').select('id').eq('reference','GU-ZW-0001').single());
await result(sb.from('portal_node_memberships').upsert({node_id:node.id,user_id:data.user.id}));
const link=origin+'/auth/confirm?token_hash='+encodeURIComponent(data.properties.hashed_token)+'&type=invite';
fs.mkdirSync('.private',{recursive:true});fs.writeFileSync('.private/pilot-invitation.txt','GridUbuntu pilot access for Genius Mukichi Residence\n\nThis is a private, expiring invitation link. Do not commit or share publicly.\nNo invitation email has been sent. Open the link in your browser, then choose a password.\n\n'+link+'\n');
console.log('Pilot account prepared and assigned to GU-ZW-0001. No email sent. Private activation link saved in .private/pilot-invitation.txt.');
