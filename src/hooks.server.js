import { createServerClient } from '@supabase/ssr';
import { config, authConfigured } from '$lib/server/config';

export async function handle({event,resolve}) {
 if(authConfigured(event)) {
  const c=config(event);
  event.locals.supabase=createServerClient(c.SUPABASE_URL,c.SUPABASE_PUBLISHABLE_KEY,{
   cookies:{getAll:()=>event.cookies.getAll(),setAll:(cookies)=>{for(const {name,value,options} of cookies)event.cookies.set(name,value,{...options,path:'/',httpOnly:true,sameSite:'lax',secure:event.url.protocol==='https:'});}}
  });
 }
 event.locals.getUser=async()=>{
  if(!event.locals.supabase)return null;
  try {const {data,error}=await event.locals.supabase.auth.getUser();return error||!data.user?.invited_at?null:data.user;}catch{return null;}
 };
 const response=await resolve(event);
 const privateRoute=/^\/(portal(?:\/|$)|login|logout|auth(?:\/|$)|api(?:\/|$))/.test(event.url.pathname);
 if(privateRoute){response.headers.set('Cache-Control','private, no-store');response.headers.set('X-Robots-Tag','noindex, nofollow');}
 response.headers.set('X-Content-Type-Options','nosniff');
 response.headers.set('Referrer-Policy','same-origin');
 response.headers.set('X-Frame-Options','DENY');
 return response;
}
