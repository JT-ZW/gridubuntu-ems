import {fail,redirect} from '@sveltejs/kit';
// A deliberate POST avoids consuming invitation links during email prefetching.
export function load({url}){return {tokenHash:url.searchParams.get('token_hash') || '',type:url.searchParams.get('type') || '',code:url.searchParams.get('code')||''};}
export const actions={default:async({locals,request})=>{
 if(!locals.supabase)return fail(503,{message:'Authentication is not configured yet.'});
 const form=await request.formData();const type=String(form.get('type'));const token_hash=String(form.get('token_hash')||'');
 const code=String(form.get('code')||'');
 if(code){if(code.length>4096)return fail(400,{message:'This link is invalid.'});const {error}=await locals.supabase.auth.exchangeCodeForSession(code);if(error)return fail(400,{message:'This recovery link has expired or must be opened in the browser that requested it. Please request a new link.'});redirect(303,'/auth/set-password');}
 if(!['invite','recovery'].includes(type)||!token_hash)return fail(400,{message:'This link is invalid. Please request a new invitation or password reset.'});
 const {error}=await locals.supabase.auth.verifyOtp({token_hash,type});
 if(error)return fail(400,{message:'This link has expired or has already been used. Please request a new one.'});
 redirect(303,'/auth/set-password');
}};
