import {json} from '@sveltejs/kit';
import {config} from '$lib/server/config';import {serviceClient,result} from '$lib/server/service';import {collectNode} from '$lib/server/collector';
async function sameSecret(actual,expected){
 if(!actual||!expected)return false;
 const hash=async value=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)));
 const [a,b]=await Promise.all([hash(actual),hash(expected)]);let diff=0;for(let i=0;i<a.length;i++)diff|=a[i]^b[i];return diff===0;
}
export async function POST(event){
 const c=config(event);const credential=event.request.headers.get('authorization')?.replace(/^Bearer /,'');
 if(!await sameSecret(credential,c.INGESTION_SECRET))return json({error:'Unauthorized'},{status:401});
 const sb=serviceClient(event);
 const connections=await result(sb.from('portal_provider_connections').select('*').eq('active',true).not('verified_at','is',null).order('last_attempt_at',{ascending:true,nullsFirst:true}).limit(10));
 const outcomes=[];
 // Up to three concurrent nodes, with ten nodes per scheduled batch.
 let index=0;async function worker(){while(index<connections.length){const connection=connections[index++];try{outcomes.push(await collectNode(event,sb,connection));}catch{outcomes.push({nodeId:connection.node_id,status:'failed'});}}}
 await Promise.all(Array.from({length:Math.min(3,connections.length)},()=>worker()));
 const partial=outcomes.some(o=>o.status!=='connected');
 return json({status:partial?'partial':'complete',checked:outcomes.length,outcomes},{status:partial?207:200});
}
