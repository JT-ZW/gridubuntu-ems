import {listInstallations,readInstallation} from './vrm.js';
import {sealSecret} from './secrets.js';
export async function prepareVictronNode(nodeId,payload,token,settings,provider={listInstallations,readInstallation}){
 const sites=await provider.listInstallations(token);
 if(!sites.some(site=>site.id===payload.installation_id))throw new Error('Select an installation accessible through this token.');
 const data=await provider.readInstallation({...settings,NODE_ACCESS_TOKEN:token},{node_id:nodeId,provider_installation_id:payload.installation_id,active:true,revision:1},'today');
 const ready=data.status==='connected'&&['solar','consumption','batterySoc'].every(key=>data.snapshot?.metrics?.[key]?.freshness==='recent')&&Number.isFinite(data.history?.totals?.solar)&&Number.isFinite(data.history?.totals?.consumption);
 const check={ready,status:data.status,snapshot:data.snapshot,totals:data.history?.totals||null,devices:data.devices||[],failures:data.failures||[]};
 return {check,ciphertext:await sealSecret(token,nodeId,settings.NODE_CREDENTIAL_ENCRYPTION_KEY)};
}
