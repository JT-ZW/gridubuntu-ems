import { createServerClient } from '@supabase/ssr';
import { config, authConfigured } from '$lib/server/config';

export async function handle({event,resolve}) {
 if(authConfigured(event)) {
  const c=config(event);
  event.locals.supabase=createServerClient(c.SUPABASE_URL,c.SUPABASE_PUBLISHABLE_KEY,{
   cookies:{getAll:()=>event.cookies.getAll(),setAll:(cookies)=>{for(const {name,value,options} of cookies)event.cookies.set(name,value,{...options,path:'/',httpOnly:true,sameSite:'lax',secure:event.url.protocol==='https:'});}}
  });
 }
 let userPromise;
 const getUser=async()=>{
  if(!event.locals.supabase)return null;
  try {const {data,error}=await event.locals.supabase.auth.getUser();if(error||!data.user?.invited_at)return null;const {data:profile,error:profileError}=await event.locals.supabase.from('portal_profiles').select('role,active').eq('id',data.user.id).maybeSingle();if(profileError||!profile?.active)return null;event.locals.portalRole=profile.role;return data.user;}catch{return null;}
 };
 event.locals.getUser=()=>userPromise||(userPromise=getUser());
 const response=await resolve(event);
 const privateRoute=/^\/(admin(?:\/|$)|admin-preview|portal(?:\/|$)|login|logout|auth(?:\/|$)|api(?:\/|$))/.test(event.url.pathname);
 if(privateRoute){response.headers.set('Cache-Control','private, no-store');response.headers.set('X-Robots-Tag','noindex, nofollow');}
 response.headers.set('X-Content-Type-Options','nosniff');
 response.headers.set('Referrer-Policy','same-origin');
 response.headers.set('X-Frame-Options','DENY');
 return response;
}
