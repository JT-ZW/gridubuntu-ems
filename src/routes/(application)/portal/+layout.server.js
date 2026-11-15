import { redirect } from '@sveltejs/kit';
import {serviceClient} from '$lib/server/service';
export async function load(event){const user=await event.locals.getUser();if(!user)redirect(303,'/login');let supportEmail='hello@gridubuntu.com';try{const {data}=await serviceClient(event).from('portal_platform_settings').select('support_email').single();if(data?.support_email)supportEmail=data.support_email;}catch{}return {user:{email:user.email,full_name:user.user_metadata?.full_name||''},supportEmail};}
