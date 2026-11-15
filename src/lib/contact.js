export const enquiryTypes=['Renewable energy access','Business or community partnership','Product demonstration','Existing client support','General enquiry'];
export function validateContact(form){
 const values={};const errors={};
 for(const [key,max] of [['name',120],['email',254],['organisation',120],['phone',40],['message',4000]]){
  values[key]=String(form.get(key)||'').trim();if(values[key].length>max)errors[key]=`Please use no more than ${max} characters.`;
 }
 if(!values.name)errors.name='Enter your name.';
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email))errors.email='Enter a valid email address.';
 values.enquiry=String(form.get('enquiry')||'');if(!enquiryTypes.includes(values.enquiry))errors.enquiry='Select an enquiry type.';
 if(values.message.length<10)errors.message='Please tell us a little more (at least 10 characters).';
 if(form.get('consent')!=='yes')errors.consent='Please agree that we can use these details to respond.';
 if(String(form.get('website')||'').trim())errors.form='Unable to submit this enquiry.';
 return {values,errors};
}
