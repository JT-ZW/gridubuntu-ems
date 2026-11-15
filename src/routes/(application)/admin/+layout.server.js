import {requireAdmin} from '$lib/server/service';
export async function load(event){const {user,profile}=await requireAdmin(event);return {administrator:{email:user.email,full_name:profile.full_name}};}
