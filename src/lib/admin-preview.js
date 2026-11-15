// This module is only used by the explicitly labelled preview route.
export function adminPreview(section='overview'){
 const node={id:'00000000-0000-4000-8000-000000000001',reference:'GU-ZW-0001',display_name:'Genius Mukichi Residence',location_label:'Zimbabwe',community_id:null,created_at:new Date().toISOString()};
 return {section,preview:true,profile:{id:'preview',full_name:'Preview administrator',email:'admin@example.com'},nodes:[node],node,clients:[{id:'preview-client',full_name:'Genius Mukichi',email:'client@example.com',role:'client',active:true,email_confirmed_at:null}],communities:[],connections:[{node_id:node.id,provider:'victron',provider_installation_id:null,active:true,revision:1}],memberships:[{node_id:node.id,user_id:'preview-client'}],secrets:[{node_id:node.id}],snapshots:[],syncs:[],settings:{support_email:'hello@gridubuntu.com',low_battery_percent:20},alerts:[],activity:[],runs:[],policies:[],forecasts:[],completeDays:0,intervals:[],range:'7d'};
}
