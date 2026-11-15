export async function notifyEnquiry(row,settings,send=fetch){
 if(row.notified_at)return {notification_status:'sent'};
 if(!settings.RESEND_API_KEY||!settings.CONTACT_EMAIL_FROM||!settings.CONTACT_EMAIL_TO)return {notification_status:'not_configured'};
 try{
  const response=await send('https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(10000),headers:{Authorization:'Bearer '+settings.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':'contact/'+row.id},body:JSON.stringify({from:settings.CONTACT_EMAIL_FROM,to:[settings.CONTACT_EMAIL_TO],reply_to:row.email,subject:'GridUbuntu enquiry: '+row.enquiry,text:['New GridUbuntu website enquiry','',`Name: ${row.name}`,`Email: ${row.email}`,`Phone: ${row.phone||'Not supplied'}`,`Organisation: ${row.organisation||'Not supplied'}`,`Topic: ${row.enquiry}`,'',row.message,'',`Reference: ${row.id}`].join('\n')})});
  if(!response.ok)return {notification_status:'failed'};
  return {notification_status:'sent',notified_at:new Date().toISOString()};
 }catch{return {notification_status:'failed'};}
}
