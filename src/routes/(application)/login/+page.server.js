import { fail,redirect } from '@sveltejs/kit';
import { authConfigured,config } from '$lib/server/config';
export async function load(event){if(await event.locals.getUser())redirect(303,'/portal');return {configured:authConfigured(event),preview:!authConfigured(event)||config(event).PORTAL_PREVIEW_ENABLED==='true'};}
export const actions={default:async(event)=>{
 if(!event.locals.supabase)return fail(503,{message:'Client sign-in is being configured. Please contact GridUbuntu for access.'});
 const form=await event.request.formData();const email=String(form.get('email')||'').trim();const password=String(form.get('password')||'');
 if(!email || password.length<1 || email.length>254 || password.length>1024)return fail(400,{message:'Enter your email address and password.',email});
 const {data,error}=await event.locals.supabase.auth.signInWithPassword({email,password});
 if(error || !data.user?.invited_at){await event.locals.supabase.auth.signOut();return fail(400,{message:'We could not sign you in. Check your credentials or contact GridUbuntu about your invitation.',email});}
 redirect(303,'/portal');
}};
