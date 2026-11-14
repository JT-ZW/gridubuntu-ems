export function numeric(value) {
 if(typeof value==='number')return Number.isFinite(value)?value:null;
 if(typeof value==='string' && /^-?\d+(\.\d+)?$/.test(value.trim()))return Number(value);
 return null;
}
export function timestamp(value) {
 const n=numeric(value);if(n===null || n<=0)return null;
 const ms=n<1e12?n*1000:n;
 return Number.isFinite(ms) && ms<8640000000000000?new Date(ms).toISOString():null;
}
export function freshness(iso,now=Date.now()) {
 if(!iso)return 'unavailable';const age=now-Date.parse(iso);
 return age < -60000?'invalid':age>900000?'stale':'recent';
}
export function formatValue(value,unit='',digits=1) {
 return numeric(value)===null?'—':`${Number(value).toLocaleString('en-ZW',{maximumFractionDigits:digits})}${unit?' '+unit:''}`;
}
export function formatTime(value) {
 return value?new Intl.DateTimeFormat('en-ZW',{timeZone:'Africa/Harare',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(value)):'Not yet reported';
}
export function rangeBounds(range,now=new Date()) {
 const end=new Date(now);
 // The Harare calendar day can differ from UTC's date after 22:00 UTC.
 const shifted=new Date(end.getTime()+2*3600000);
 const startToday=Date.UTC(shifted.getUTCFullYear(),shifted.getUTCMonth(),shifted.getUTCDate())-2*3600000;
 const days=range==='30d'?30:range==='7d'?7:1;
 return {start:Math.floor((startToday-(days-1)*86400000)/1000),end:Math.floor(end.getTime()/1000),interval:days===1?'hours':'days'};
}
