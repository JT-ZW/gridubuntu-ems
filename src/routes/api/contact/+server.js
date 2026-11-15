import {json} from '@sveltejs/kit';
import {validateContact} from '$lib/contact.js';
import {serviceClient} from '$lib/server/service';
import {config} from '$lib/server/config';
import {notifyEnquiry} from '$lib/server/contact-email.js';
import {uuidPattern} from '$lib/admin-domain.js';

function reply(request,status,data){
 if(request.headers.get('accept')?.includes('application/json'))return json(data,{status});
 const text=data.success?'Your enquiry has been received. The GridUbuntu team will respond using the details you provided.':data.message||'Please check your details and try again.';
 return new Response(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Contact GridUbuntu</title><body style="font-family:system-ui;background:#f4f7ef;color:#203c2e;max-width:600px;margin:10vh auto;padding:24px"><h1>${data.success?'Thank you for getting in touch.':'Your enquiry was not sent.'}</h1><p>${text}</p><p><a href="/contact">Return to Contact</a></p><p>Call <a href="tel:+263777045891">+263 777 045 891</a></p></body></html>`,{status,headers:{'Content-Type':'text/html; charset=utf-8'}});
}
export async function POST(event){
 const {request}=event;
 if(request.headers.get('origin')!==event.url.origin)return reply(request,403,{message:'Please submit the form from the GridUbuntu website.'});
 try{
  let size=0;const chunks=[];const reader=request.body?.getReader();
  if(!reader)return reply(request,400,{message:'Please complete the contact form.'});
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>32768){await reader.cancel();return reply(request,413,{message:'Your message is too long. Please shorten it and try again.'});}chunks.push(value);}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  let form;
  try{form=await new Request('https://form.invalid',{method:'POST',headers:{'Content-Type':request.headers.get('content-type')||''},body:bytes}).formData();}catch{return reply(request,400,{message:'Please submit a valid contact form.'});}
  const {values,errors}=validateContact(form);
  if(Object.keys(errors).length)return reply(request,400,{message:'Please check the highlighted fields.',errors});
  const c=config(event);const secret=c.INGESTION_SECRET||c.SUPABASE_SECRET_KEY||c.SUPABASE_SERVICE_ROLE_KEY;
  if(!secret)return reply(request,503,{message:'The enquiry form is temporarily unavailable. Please call us instead.'});
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const signed=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode('contact:'+event.getClientAddress()));
  const rate_key=Array.from(new Uint8Array(signed),v=>v.toString(16).padStart(2,'0')).join('');
  const supplied=String(form.get('request_id')||'');
  if(supplied&&!uuidPattern.test(supplied))return reply(request,400,{message:'Please refresh the page and try again.'});
  const request_id=supplied||crypto.randomUUID();
  const sb=serviceClient(event);
  const {error}=await sb.rpc('portal_submit_enquiry',{p_payload:values,p_rate_key:rate_key,p_request:request_id});
  if(error){if(error.message?.includes('rate_limited'))return reply(request,429,{message:'You have sent several enquiries recently. Please wait 15 minutes or call us.'});throw error;}
  // Persistence is the receipt. Email failure must never lose an enquiry.
  try{const {data:row}=await sb.from('portal_contact_enquiries').select('*').eq('request_id',request_id).eq('rate_key',rate_key).single();if(row&&!row.notified_at){const notification=await notifyEnquiry(row,c);await sb.from('portal_contact_enquiries').update(notification).eq('id',row.id);}}catch{/* The private admin inbox retains the pending notification. */}
  return reply(request,200,{success:true,message:'Your enquiry has been received. Our team will respond using the details you provided.'});
 }catch{return reply(request,503,{message:'We could not save your enquiry. Please try again or call +263 777 045 891.'});}
}
