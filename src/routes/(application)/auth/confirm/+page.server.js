import {fail,redirect} from '@sveltejs/kit';
// A deliberate POST avoids consuming invitation links during email prefetching.
export function load({url}){return {tokenHash:url.searchParams.get('token_hash') || '',type:url.searchParams.get('type') || ''};}
export const actions={default:async({locals,request})=>{
 if(!locals.supabase)return fail(503,{message:'Authentication is not configured yet.'});
 const form=await request.formData();const type=String(form.get('type'));const token_hash=String(form.get('token_hash')||'');
 if(!['invite','recovery'].includes(type)||!token_hash)return fail(400,{message:'This link is invalid. Please request a new invitation or password reset.'});
 const {error}=await locals.supabase.auth.verifyOtp({token_hash,type});
 if(error)return fail(400,{message:'This link has expired or has already been used. Please request a new one.'});
 redirect(303,'/auth/set-password');
}};
