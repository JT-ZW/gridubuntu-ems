import {coordinates} from './coordinates.js';
import {uuidPattern} from './admin-domain.js';

export function clientNodes(raw){
 let rows;
 try{rows=JSON.parse(raw);}catch{throw new Error('Check the client nodes and try again.');}
 if(!Array.isArray(rows)||rows.length>100)throw new Error('Select up to 100 nodes per save.');
 const seen=new Set();
 return rows.map(row=>{
  if(!row||typeof row!=='object')throw new Error('Check the node details.');
  const node_id=row.node_id||null;
  if(node_id&&(!uuidPattern.test(node_id)||seen.has(node_id)))throw new Error('Select each valid node only once.');
  if(node_id)seen.add(node_id);
  const display_name=String(row.display_name||'').trim(),location_label=String(row.location_label||'').trim();
  if(display_name.length<2||display_name.length>120||!location_label||location_label.length>120)throw new Error('Enter a node name and location of up to 120 characters.');
  return {node_id,display_name,location_label,...coordinates(row.latitude,row.longitude)};
 });
}
