import { redirect } from '@sveltejs/kit';
export async function load(event){const user=await event.locals.getUser();if(!user)redirect(303,'/login');return {user:{email:user.email}};}
