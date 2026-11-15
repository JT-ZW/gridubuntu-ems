import {error,fail} from '@sveltejs/kit';
import {requireAdmin,result,auditWrite,nodeToken} from './service';
import {config} from './config';
import {sealSecret} from './secrets.js';
import {listInstallations,readInstallation} from './vrm';
import {collectNode} from './collector';
import {adminSections,uuidPattern,buildAlerts,completeConsumptionDays,demandBaseline} from '../admin-domain.js';
import {rangeBounds} from '../energy.js';
import {simulationEnabled,simulatedTelemetry,simulatedIntervals} from '../simulation.js';
import {coordinates} from '../coordinates.js';
import {clientNodes} from '../client-details.js';
import {notifyEnquiry} from './contact-email.js';
import {harareDate,boundedNumber} from '../manual-energy.js';
import {prepareVictronNode} from './onboarding.js';

export async function loadAdmin(event,section='overview',nodeId=null){
 if(!adminSections.includes(section))error(404,'Page not found.');
 const {sb,profile}=await requireAdmin(event);
 const [nodes,clients,communities,connections,secrets,snapshots,syncs,acks,settings]=await Promise.all([
  result(sb.from('portal_nodes').select('*').order('reference').limit(500)),result(sb.from('portal_client_directory').select('*').order('created_at').limit(500)),result(sb.from('portal_communities').select('*').order('name').limit(500)),result(sb.from('portal_provider_connections').select('*').limit(500)),result(sb.from('portal_connection_secrets').select('node_id,updated_at').limit(500)),result(sb.from('portal_latest_snapshots').select('*').limit(500)),result(sb.from('portal_latest_syncs').select('*').limit(500)),result(sb.from('portal_alert_acknowledgements').select('*').order('created_at',{ascending:false}).limit(1000)),result(sb.from('portal_platform_settings').select('*').single())]);
 const memberships=await result(sb.from('portal_node_memberships').select('*').limit(2000));
 const alerts=buildAlerts(nodes,connections,snapshots,syncs,settings.low_battery_percent).map(a=>({...a,acknowledged:acks.some(k=>k.node_id===a.node_id&&k.kind===a.kind&&k.fingerprint===a.fingerprint)}));
 const selectedId=nodeId||event.url.searchParams.get('node')||nodes[0]?.id;
 const node=nodes.find(n=>n.id===selectedId)||null;if(nodeId&&!node)error(404,'Node not found.');
 const base={section,profile,nodes,clients,communities,connections,secrets,snapshots,syncs,memberships,settings,alerts,node,preview:false};
 if(section==='communities')base.maps={browserKey:config(event).GOOGLE_MAPS_BROWSER_KEY||'',mapId:config(event).GOOGLE_MAPS_MAP_ID||'DEMO_MAP_ID'};
 if(['settings','operations'].includes(section))base.collector=await result(sb.from('portal_collector_state').select('enabled,schedule,job_id,last_enqueued_at,last_http_status').single());
 if(nodeId){const check=await result(sb.from('portal_connection_checks').select('node_id,revision,result,tested_at').eq('node_id',node.id).maybeSingle());base.check=check;}
 if(['history','forecasting'].includes(section)||nodeId){
  const range=['today','7d','30d'].includes(event.url.searchParams.get('range'))?event.url.searchParams.get('range'):'7d';const bounds=rangeBounds(range);
  base.range=range;base.intervals=node?await result(sb.from('portal_energy_intervals').select('*').eq('node_id',node.id).eq('resolution',bounds.interval).gte('interval_start',new Date(bounds.start*1000).toISOString()).lte('interval_start',new Date(bounds.end*1000).toISOString()).order('interval_start').limit(1000)):[];
 }
 if(['activity','operations','overview'].includes(section)||nodeId)base.activity=await result((nodeId?sb.from('portal_audit_events').select('*').eq('node_id',nodeId):sb.from('portal_audit_events').select('*')).order('created_at',{ascending:false}).limit(section==='overview'?6:100));
 if(section==='operations')base.runs=await result(sb.from('portal_sync_runs').select('*').order('started_at',{ascending:false}).limit(100));
 if(section==='operations')base.enquiries=await result(sb.from('portal_contact_enquiries').select('id,created_at,name,email,phone,organisation,enquiry,message,status,notification_status,notified_at').order('created_at',{ascending:false}).limit(100));
 if(section==='sharing'){
  base.policies=await result(sb.from('portal_allocation_policies').select('*').order('created_at',{ascending:false}).limit(100));
  base.energyAccounts=await result(sb.from('portal_energy_accounts').select('*').limit(2000));
  base.tokenLedger=await result(sb.from('portal_energy_token_ledger').select('*').order('created_at',{ascending:false}).limit(100));
  base.tokenBalances=await result(sb.from('portal_energy_balances').select('*').limit(2000));
  base.adjustmentId=crypto.randomUUID();
 }
 if(section==='forecasting'&&node){const rows=await consumptionRows(sb,node.id);base.completeDays=completeConsumptionDays(rows).length;base.forecasts=await result(sb.from('portal_forecast_runs').select('*').eq('node_id',node.id).order('generated_at',{ascending:false}).limit(10));}
 const testNode=nodes.find(n=>simulationEnabled(event.url.origin,config(event),n.id));
 if(testNode){
  base.simulationEnabled=true;
  const test=simulatedTelemetry('today');
  base.connections=connections.map(c=>c.node_id===testNode.id?{...c,simulated:true}:c);
  base.snapshots=[...snapshots.filter(s=>s.node_id!==testNode.id),{node_id:testNode.id,reported_at:test.snapshot.reportedAt,measurements:test.snapshot.metrics,simulated:true}];
  if(node?.id===testNode.id){base.simulated=true;base.simulatedDevices=test.devices;base.intervals=simulatedIntervals(node.id,base.range||'7d');base.check=null;if(section==='forecasting'){base.completeDays=0;base.forecasts=[];}}
 }
 return base;
}
async function consumptionRows(sb,nodeId){return result(sb.from('portal_energy_intervals').select('metric,resolution,interval_start,interval_end,energy_kwh').eq('node_id',nodeId).eq('resolution','hours').eq('metric','consumption').gte('interval_start',new Date(Date.now()-35*86400000).toISOString()).order('interval_start').limit(1000));}
const messages={connection_changed:'This connection changed in another session. Reload before trying again.',history_mapping_locked:'This node already has history. Register a new node to connect a different physical installation.',verification_required:'Select and successfully test the installation before verifying it.',confirmation_required:'Confirm the VRM comparison and enter verification notes.',credential_unavailable:'The provider credential could not be read. Replace it or contact your system administrator.',credential_key_unavailable:'Credential encryption is not configured on the server.',access_denied:'SunSynk rejected access. Check the token and its permissions.',rate_limited:'SunSynk is limiting requests. Wait and try again.',collection_failed:'Collection could not complete. Review the connection and sync log.',invalid_client:'That invited client account is not available.',database_error:'The change could not be saved. Reload and try again.',unreachable:'SunSynk could not be reached. Try again shortly.'};
function text(form,key,max=120,required=true){const v=String(form.get(key)||'').trim();if((required&&!v)||v.length>max)throw new Error('Check the '+key.replaceAll('_',' ')+' field.');return v;}
function id(form,key,required=true){const value=text(form,key,40,required);if(value&&!uuidPattern.test(value))throw new Error('Select a valid '+key.replaceAll('_id','')+'.');return value||null;}
async function formData(request){const reader=request.body?.getReader();let size=0;const chunks=[];while(reader){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>65536){await reader.cancel();error(413,'Form is too large.');}chunks.push(value);}const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}return new Request('https://form.invalid',{method:'POST',headers:{'content-type':request.headers.get('content-type')||''},body:bytes}).formData();}
export async function adminAction(event){
 const {sb,user}=await requireAdmin(event);let operation;
 try{
  const form=await formData(event.request);operation=text(form,'operation',40);let payload={};let message='Change saved.';
  if(operation==='contact.status'){
   const status=text(form,'status',20);if(!['new','reviewed','resolved'].includes(status))throw new Error('Select a valid enquiry status.');
   const {error:statusError}=await sb.rpc('portal_enquiry_status',{p_actor:user.id,p_id:id(form,'enquiry_id'),p_status:status});if(statusError)throw new Error('database_error');
   return {success:true,operation,message:'Enquiry status updated.'};
  }
  else if(operation==='contact.notify'){
   const row=await result(sb.from('portal_contact_enquiries').select('*').eq('id',id(form,'enquiry_id')).single());
   const notification=await notifyEnquiry(row,config(event));
   const {error:noticeError}=await sb.from('portal_contact_enquiries').update(notification).eq('id',row.id);if(noticeError)throw new Error('database_error');
   return {success:notification.notification_status==='sent',operation,message:notification.notification_status==='sent'?'Email notification accepted by the delivery service.':notification.notification_status==='not_configured'?'Configure RESEND_API_KEY, CONTACT_EMAIL_FROM and CONTACT_EMAIL_TO on the server to enable email delivery.':'The email provider could not accept this notification. The enquiry remains saved; try again later.'};
  }
  else if(operation==='node.save'){payload={node_id:id(form,'node_id',false),display_name:text(form,'display_name'),location_label:text(form,'location_label'),community_id:id(form,'community_id',false)};}
  else if(operation==='node.onboard'){
   const node_id=crypto.randomUUID();const location=coordinates(form.get('latitude'),form.get('longitude'));
   payload={display_name:text(form,'display_name'),location_label:text(form,'location_label'),community_id:id(form,'community_id',false),user_id:id(form,'user_id'),installation_id:text(form,'installation_id',24),...location};
   if(location.latitude===null)throw new Error('Enter both latitude and longitude for the node map.');
   if(payload.display_name.length<2||!/^\d+$/.test(payload.installation_id))throw new Error('Enter a residence name and numeric SunSynk installation ID.');
   if(payload.user_id&&!await result(sb.from('portal_client_directory').select('id').eq('id',payload.user_id).eq('role','client').eq('active',true).maybeSingle()))throw new Error('invalid_client');
   const {check,ciphertext}=await prepareVictronNode(node_id,payload,text(form,'token',8192),config(event));
   const {error:onboardError}=await sb.rpc('portal_onboard_victron',{p_actor:user.id,p_node:node_id,p_payload:payload,p_ciphertext:ciphertext,p_check:check});
   if(onboardError){if(onboardError.message.includes('portal_unique_active_installation'))throw new Error('Select the existing node for this installation and assign its client there. Each physical installation can have only one active node.');throw new Error('database_error');}
   return {success:true,operation,message:check.ready?'Node, client assignment and map location saved. Readings passed the initial test; open the connection to compare with VRM and verify.':'Node and map location saved. The provider test needs review before live monitoring can begin.',nodeLink:'/admin/nodes/'+node_id+'?tab=connection'};
  }
  else if(operation==='entitlement.save'||operation==='token.adjust'){
   payload={node_id:id(form,'node_id'),user_id:id(form,'user_id')};
   if(operation==='entitlement.save'){
    payload={...payload,revision:boundedNumber(form,'revision',0,2147483647,true),enabled:form.get('enabled')==='true',daily_limit_kwh:boundedNumber(form,'daily_limit_kwh',0,10000),max_power_kw:boundedNumber(form,'max_power_kw',0.01,1000),priority:boundedNumber(form,'priority',1,10,true),valid_from:harareDate(text(form,'valid_from',32,false)),valid_until:harareDate(text(form,'valid_until',32,false))};
    if(payload.valid_until&&payload.valid_from&&payload.valid_until<=payload.valid_from)throw new Error('Enter an end date after the start date.');
   }else{payload={...payload,delta_kwh:boundedNumber(form,'delta_kwh',-100000,100000),reason:text(form,'reason',500),request_id:id(form,'request_id')};if(payload.delta_kwh===0||payload.reason.length<5)throw new Error('Enter a non-zero adjustment and a reason of at least 5 characters.');}
   const {error:manualError}=await sb.rpc('portal_manual_energy',{p_actor:user.id,p_action:operation,p_payload:payload});
   if(manualError){if(manualError.message.includes('insufficient_energy_credit'))throw new Error('Enter a debit no greater than the current energy credit balance.');if(manualError.message.includes('connection_changed'))throw new Error('connection_changed');if(manualError.message.includes('account_required'))throw new Error('Select a client with saved energy access settings first.');throw new Error('database_error');}
   return {success:true,operation,message:operation==='entitlement.save'?'Manual energy access settings saved. Hardware enforcement is not enabled.':'Energy credit adjustment recorded. This is an administrative allowance, not a payment or measured transfer.'};
  }
  else if(operation==='node.location'){
   const location=coordinates(form.get('latitude'),form.get('longitude'));
   const {error:locationError}=await sb.rpc('portal_set_node_location',{p_actor:user.id,p_node:id(form,'node_id'),p_latitude:location.latitude,p_longitude:location.longitude});
   if(locationError)throw new Error('database_error');return {success:true,operation,message:location.latitude===null?'Node coordinates cleared.':'Node coordinates saved. The community map uses this location.'};
  }
  else if(operation==='community.save'){payload={community_id:id(form,'community_id',false),name:text(form,'name')};}
  else if(operation==='client.invite'){
   const email=text(form,'email',254).toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('Enter a valid email address.');const full_name=text(form,'full_name');const node_id=id(form,'node_id',false);
   const existing=await result(sb.from('portal_client_directory').select('id,role,email_confirmed_at').ilike('email',email).maybeSingle());if(existing?.role==='admin')throw new Error('Use administrator access management for this account.');
   const type=existing?.email_confirmed_at?'recovery':'invite';
   const {data,error:inviteError}=await sb.auth.admin.generateLink({type,email,options:{data:{full_name},redirectTo:config(event).APP_ORIGIN+'/auth/confirm'}});if(inviteError||!data.user?.id||!data.properties?.hashed_token)throw new Error('Invitation could not be prepared. Check whether this email already belongs to another application in this Supabase project.');
   await auditWrite(sb,user.id,'client.save',{user_id:data.user.id,full_name,node_id});await auditWrite(sb,user.id,'client.link_created',{user_id:data.user.id,node_id});
   return {success:true,operation,message:type==='invite'?'Invitation created. No email has been sent. Share this private, expiring link with the client.':'Recovery link created. No email has been sent.',activationLink:config(event).APP_ORIGIN+'/auth/confirm?token_hash='+encodeURIComponent(data.properties.hashed_token)+'&type='+type};
  }
  else if(operation==='client.details'){
   payload={user_id:id(form,'user_id'),full_name:text(form,'full_name'),nodes:clientNodes(text(form,'nodes',60000))};
   const {error:saveError}=await sb.rpc('portal_save_client_details',{p_actor:user.id,p_payload:payload});
   if(saveError)throw new Error('database_error');
   return {success:true,operation,message:'Client, node assignments and map locations saved.'};
  }
  else if(operation==='client.save'){payload={user_id:id(form,'user_id'),full_name:text(form,'full_name'),node_id:id(form,'node_id',false)};}
  else if(operation==='client.access'){payload={user_id:id(form,'user_id'),active:form.get('active')==='true'};message=payload.active?'Client access restored.':'Client portal and direct data access revoked.';}
  else if(['membership.add','membership.remove'].includes(operation)){payload={user_id:id(form,'user_id'),node_id:id(form,'node_id')};}
  else if(operation==='collector.toggle'){
   const {error:toggleError}=await sb.rpc('portal_set_collector_enabled',{p_actor:user.id,p_enabled:form.get('enabled')==='true'});if(toggleError)throw new Error('database_error');return {success:true,operation,message:'Collector schedule updated.'};
  }
  else if(operation==='admin.access'){
   const target=id(form,'user_id');const role=text(form,'role',12);if(!['admin','client'].includes(role)||form.get('confirmed')!=='yes')throw new Error('Check the role and confirm this access change.');if(target===user.id)throw new Error('Use another administrator to change your own access.');
   const {error:roleError}=await sb.rpc('portal_admin_role_change',{p_actor:user.id,p_target:target,p_role:role,p_active:form.get('active')==='true'});if(roleError)throw new Error('database_error');return {success:true,operation,message:'Account role and access updated.'};
  }
  else if(operation.startsWith('connection.')){
   if(simulationEnabled(event.url.origin,config(event),id(form,'node_id')))return fail(400,{success:false,operation,message:'This local test node uses simulated readings. Disable local simulation before configuring or collecting real SunSynk data.'});
   const node_id=id(form,'node_id');const connection=await result(sb.from('portal_provider_connections').select('*').eq('node_id',node_id).single());const revision=Number(text(form,'revision',12));if(!Number.isInteger(revision)||revision!==connection.revision)throw new Error('connection_changed');payload={node_id,revision};
   if(operation==='connection.token'){const token=text(form,'token',8192);await listInstallations(token);payload.ciphertext=await sealSecret(token,node_id,config(event).NODE_CREDENTIAL_ENCRYPTION_KEY);message='Token validated and encrypted. Select an installation next.';}
   else if(operation==='connection.discover'){
    const token=await nodeToken(event,sb,node_id);if(!token)throw new Error('credential_unavailable');const sites=await listInstallations(token);return {success:true,operation,message:`${sites.length} accessible installations found. Select the site for this node.`,sites,nodeId:node_id};
   }
   else if(operation==='connection.select'){const token=await nodeToken(event,sb,node_id);if(!token)throw new Error('credential_unavailable');const installation_id=text(form,'installation_id',24);const sites=await listInstallations(token);if(!sites.some(s=>s.id===installation_id))throw new Error('Select a site accessible through this token.');payload.installation_id=installation_id;message='Installation selected. Test its readings before verification.';}
   else if(operation==='connection.check'){
    if(!connection.provider_installation_id)throw new Error('Select an installation first.');const token=await nodeToken(event,sb,node_id);if(!token)throw new Error('credential_unavailable');
    const data=await readInstallation({...config(event),NODE_ACCESS_TOKEN:token},connection,'today');const required=['solar','consumption','batterySoc'];const ready=data.status==='connected'&&required.every(key=>data.snapshot?.metrics?.[key]?.freshness==='recent')&&data.history?.totals?.solar!==null&&data.history?.totals?.consumption!==null;
    payload.result={ready,status:data.status,snapshot:data.snapshot,totals:data.history?.totals||null,devices:data.devices,failures:data.failures};message=ready?'Readings retrieved. Compare them with VRM, then verify this connection.':'The test needs review. Core readings or energy totals are missing, delayed or unavailable.';
   }
   else if(operation==='connection.commission'){if(form.get('confirmed')!=='yes')throw new Error('confirmation_required');const notes=text(form,'notes',1000);const {error:verifyError}=await sb.rpc('portal_commission_connection',{p_actor:user.id,p_node:node_id,p_revision:revision,p_notes:notes});if(verifyError)throw new Error(verifyError.message.includes('connection_changed')?'connection_changed':'verification_required');return {success:true,operation,message:'Connection verified. Live client monitoring and collection are now permitted.'};}
   else if(operation==='connection.pause'){message='Connection paused. Collection and client live readings are disabled.';}
   else if(operation==='connection.remove'){if(form.get('confirmed')!=='yes')throw new Error('Check the confirmation before removing this credential.');const {error:removeError}=await sb.rpc('portal_admin_remove_credential',{p_actor:user.id,p_node:node_id,p_revision:revision});if(removeError)throw new Error('database_error');return {success:true,operation,message:'Credential removed and monitoring paused. Historical records remain.'};}
   else if(operation==='connection.sync'){const outcome=await collectNode(event,sb,connection);await auditWrite(sb,user.id,'connection.synced',{node_id});return {success:true,operation,message:`Collection ${outcome.status}. Measured readings have been saved.`};}
   else throw new Error('Unsupported connection operation.');
  }
  else if(operation==='settings.save'){const support_email=text(form,'support_email',254);const low_battery_percent=Number(text(form,'low_battery_percent',3));if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(support_email)||!Number.isInteger(low_battery_percent)||low_battery_percent<1||low_battery_percent>99)throw new Error('Enter a valid support email and battery threshold from 1 to 99.');payload={support_email,low_battery_percent};}
  else if(operation==='policy.save'){payload={community_id:id(form,'community_id'),model:text(form,'model',30),battery_reserve:Number(text(form,'battery_reserve',3)),household_limit_kw:Number(text(form,'household_limit_kw',8)),notes:text(form,'notes',1000,false)};if(!['equal_share','essential_first'].includes(payload.model)||!Number.isInteger(payload.battery_reserve)||payload.battery_reserve<0||payload.battery_reserve>100||!Number.isFinite(payload.household_limit_kw)||payload.household_limit_kw<=0||payload.household_limit_kw>1000)throw new Error('Check the allocation policy values.');message='New policy version saved as a planning draft. No equipment command was sent.';}
  else if(operation==='alert.ack'){payload={node_id:id(form,'node_id'),kind:text(form,'kind',40),fingerprint:text(form,'fingerprint',100)};}
  else if(operation==='forecast.run'){const node_id=id(form,'node_id');if(simulationEnabled(event.url.origin,config(event),node_id))return fail(400,{success:false,operation,message:'Simulated history is excluded from saved forecasts. Connect real measurements before training demand forecasts.'});const baseline=demandBaseline(await consumptionRows(sb,node_id));await auditWrite(sb,user.id,'forecast.save',{node_id,...baseline});return {success:true,operation,message:'Hourly median baseline generated with a separate validation day. This is not a machine-learning forecast.'};}
  else throw new Error('Unsupported operation.');
  const saved=await auditWrite(sb,user.id,operation,payload);return {success:true,operation,message,saved};
 }catch(failure){const code=failure.kind||failure.message;const safe=messages[code]||(/^(Check |Enter |Select |Invitation |Use administrator|Unsupported |At least |Recent complete)/.test(code)?code:'The operation could not complete. Reload and try again.');return fail(400,{success:false,operation,message:safe});}
}
