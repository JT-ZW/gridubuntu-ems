import test from 'node:test';
import assert from 'node:assert/strict';
import {validateContact} from '../src/lib/contact.js';
import {notifyEnquiry} from '../src/lib/server/contact-email.js';
const valid=()=>new URLSearchParams({name:'Test person',email:'test@example.test',enquiry:'General enquiry',message:'A question about renewable energy.',consent:'yes'});
test('contact validation accepts a complete enquiry and rejects malformed fields, missing consent and spam',()=>{
 assert.deepEqual(validateContact(valid()).errors,{});
 for(const [key,value] of [['name',''],['email','invalid'],['enquiry','Other unknown topic'],['message','short'],['consent',''],['website','spam'],['phone','x'.repeat(41)]]){const form=valid();form.set(key,value);assert.ok(Object.keys(validateContact(form).errors).length);}
});
const row={id:'test-id',name:'Test person',email:'visitor@example.test',enquiry:'General enquiry',message:'A test enquiry.'};
const settings={RESEND_API_KEY:'test-key',CONTACT_EMAIL_FROM:'team@example.test',CONTACT_EMAIL_TO:'private@example.test'};
test('email uses the private configured recipient, visitor reply-to and stable idempotency key',async()=>{
 let request;const outcome=await notifyEnquiry(row,settings,async(url,options)=>{request={url,...options};return new Response('{}',{status:200});});
 const payload=JSON.parse(request.body);assert.equal(request.url,'https://api.resend.com/emails');assert.deepEqual(payload.to,['private@example.test']);assert.equal(payload.reply_to,row.email);assert.equal(request.headers['Idempotency-Key'],'contact/test-id');assert.equal(outcome.notification_status,'sent');
});
test('missing credentials, provider errors and previously notified enquiries do not lose the saved message',async()=>{
 let calls=0;const send=async()=>{calls++;return new Response('{}',{status:500});};
 assert.equal((await notifyEnquiry(row,{},send)).notification_status,'not_configured');assert.equal(calls,0);
 assert.equal((await notifyEnquiry({...row,notified_at:'2026-11-15T00:00:00Z'},settings,send)).notification_status,'sent');assert.equal(calls,0);
 assert.equal((await notifyEnquiry(row,settings,send)).notification_status,'failed');assert.equal(calls,1);
});
