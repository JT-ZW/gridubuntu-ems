import {fail,redirect} from '@sveltejs/kit';
export async function load(event){if(!await event.locals.getUser())redirect(303,'/login');}
export const actions={default:async(event)=>{
 if(!await event.locals.getUser())redirect(303,'/login');
 const form=await event.request.formData();const password=String(form.get('password')||'');
 if(password.length<12||password.length>128)return fail(400,{message:'Choose a password between 12 and 128 characters.'});
 if(password!==form.get('confirmation'))return fail(400,{message:'The passwords do not match.'});
 const {error}=await event.locals.supabase.auth.updateUser({password});
 if(error)return fail(400,{message:'Your password could not be updated. Try again or request a new recovery link.'});
 redirect(303,event.locals.portalRole==='admin'?'/admin':'/portal');
}};
