export function harareDate(value){
 if(!value)return null;
 if(!/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(value))throw new Error('Enter a valid access date and time.');
 const parsed=new Date(value+':00+02:00');if(!Number.isFinite(parsed.getTime())||new Date(parsed.getTime()+7200000).toISOString().slice(0,16)!==value)throw new Error('Enter a valid access date and time.');return parsed.toISOString();
}
export function localDate(value){return value?new Date(Date.parse(value)+7200000).toISOString().slice(0,16):'';}
export function boundedNumber(form,key,min,max,integer=false){const raw=String(form.get(key)??'').trim();const value=Number(raw);if(!raw||!Number.isFinite(value)||value<min||value>max||(integer&&!Number.isInteger(value)))throw new Error('Check the '+key.replaceAll('_',' ')+' field.');return value;}
