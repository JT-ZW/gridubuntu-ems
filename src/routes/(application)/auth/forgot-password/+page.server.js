import {fail} from '@sveltejs/kit';
import {config} from '$lib/server/config';
export const actions={default:async(event)=>{
 if(!event.locals.supabase)return fail(503,{message:'Password recovery is not configured yet. Please contact GridUbuntu.'});
 const form=await event.request.formData();const email=String(form.get('email')||'').trim();
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)return fail(400,{message:'Enter a valid email address.'});
 const origin=config(event).APP_ORIGIN || event.url.origin;
 try{await event.locals.supabase.auth.resetPasswordForEmail(email,{redirectTo:origin+'/auth/confirm'});}catch{/* Do not reveal account existence. */}
 return {success:true};
}};
