import fs from 'node:fs';
import {createClient} from '@supabase/supabase-js';
const email=process.argv[2];
const origin=new URL(process.env.APP_ORIGIN||'http://localhost:5173');
if(!email||!['localhost','127.0.0.1','[::1]'].includes(origin.hostname))throw new Error('Pass an existing invited account email and use a localhost APP_ORIGIN.');
const sb=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const {data:profile,error}=await sb.from('portal_client_directory').select('id,role,active,email_confirmed_at').ilike('email',email).single();
if(error||!profile?.active)throw new Error('An active invited portal account is required.');
const file='.private/'+(profile.role==='admin'?'admin':'client')+'-invitation.txt';
fs.mkdirSync('.private',{recursive:true});
if(profile.email_confirmed_at){fs.writeFileSync(file,'Account already activated. Sign in with your existing password at '+origin.origin+'/login\n');console.log('Account already activated. Existing password preserved; localhost sign-in details saved in '+file);}
else{
 const {data,error:linkError}=await sb.auth.admin.generateLink({type:'invite',email,options:{redirectTo:origin.origin+'/auth/confirm'}});
 if(linkError||!data.properties?.hashed_token||data.user?.id!==profile.id)throw new Error('Local activation link could not be prepared.');
 const link=origin.origin+'/auth/confirm?token_hash='+encodeURIComponent(data.properties.hashed_token)+'&type=invite';
 fs.writeFileSync(file,'Private, expiring GridUbuntu localhost activation link. Open while the local development server is running. No email sent.\n\n'+link+'\n');
 console.log('Local activation link saved in '+file+'. No email sent.');
}
