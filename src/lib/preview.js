// Explicit UI fixtures. Never imported by authenticated server data loaders.
export function previewData(){
 const day=new Date();day.setUTCHours(0,0,0,0);const reportedAt=new Date(day.getTime()+12*3600000).toISOString();
 const metric=(value)=>({value,reportedAt,freshness:'recent',source:'Illustrative sample'});
 const solar=[0,0,0,0,0,.05,.22,.48,.86,1.21,1.43,1.58,1.46,1.14,.89,.52,.24,.04,0,0,0,0,0,0];
 const use=[.16,.12,.11,.1,.14,.27,.46,.58,.37,.29,.32,.45,.57,.39,.33,.41,.61,.78,.86,.72,.48,.29,.21,.17];
 const series=(values)=>values.map((value,i)=>({time:new Date(day.getTime()+(i-2)*3600000).toISOString(),value}));
 return {node:{display_name:'Genius Mukichi Residence',reference:'GU-ZW-0001',location_label:'Zimbabwe',timezone:'Africa/Harare'},status:'connected',verified:false,snapshot:{reportedAt,metrics:{solar:metric(2460),consumption:metric(840),batterySoc:metric(78),batteryPower:metric(1510),batteryVoltage:metric(52.4),batteryCurrent:metric(28.8),grid:metric(0)}},history:{solar:series(solar),consumption:series(use),totals:{solar:10.12,consumption:9.11,gridImport:0,gridExport:0}},devices:[{name:'Victron inverter / charger',firmware:'Sample device'},{name:'Solar charge controller',firmware:'Sample device'},{name:'Battery monitor',firmware:'Sample device'}]};
}
