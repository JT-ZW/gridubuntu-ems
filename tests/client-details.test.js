import test from 'node:test';
import assert from 'node:assert/strict';
import {clientNodes} from '../src/lib/client-details.js';
const id='2ff9c90a-892a-49b3-a15c-a4ea703765bb';
const node={node_id:id,display_name:'Residence',location_label:'Harare',latitude:-17.8,longitude:31.1};
test('multiple existing and newly registered nodes retain separate locations',()=>{
 const values=clientNodes(JSON.stringify([node,{...node,node_id:null,latitude:'',longitude:''}]));
 assert.equal(values.length,2);assert.equal(values[0].latitude,-17.8);assert.equal(values[1].node_id,null);assert.equal(values[1].latitude,null);
});
test('invalid or repeated nodes and incomplete coordinates reject the entire request',()=>{
 for(const value of [[node,node],[{...node,node_id:'invalid'}],[{...node,longitude:''}],[{...node,latitude:91}],[{...node,location_label:''}],{},null])assert.throws(()=>clientNodes(JSON.stringify(value)));
 assert.throws(()=>clientNodes('not json'));
});
