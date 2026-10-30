import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeWorld,Journey,shortestRoute,shortcuts,distance} from '../src/world.js';
import {BridgeState} from '../src/bridge-state.js';
const data=JSON.parse(readFileSync(new URL('../public/data/portfolio.json',import.meta.url)));
const world=makeWorld(data.projects);
const station=id=>world.stations.find(s=>s.id===id);
const step=(j,b,dt=1/60)=>{b.update(dt,j);const event=j.update(dt,(e,a,z)=>b.canTraverse(e,a,z));assert.ok(b.snapshot(j).every(l=>l.supported),'traveler lost a docked supporting tile');return event;};
function start(a,z){const j=new Journey(world),b=new BridgeState(world);j.visit(station(a).index,true);j.cancel();j.visit(station(z).index);return {j,b};}
function finish(j,b,dt=1/60){for(let n=0;n<5000;n++){const event=step(j,b,dt);if(event)return event;}assert.fail('journey did not finish');}

test('all three shortcuts are bidirectional, shorter than the original hub route, and selected by distance',()=>{
 const original={...world,adj:world.adj.map(ids=>ids.filter(id=>!world.edges[id].shortcut))};
 for(const [a,z] of shortcuts)for(const [from,to] of [[a,z],[z,a]]){
  const route=shortestRoute(world,{node:station(from).stop},station(to).stop);
  const baseline=shortestRoute(original,{node:station(from).stop},station(to).stop);
  assert.ok(route.cost<baseline.cost);assert.ok(route.segments.some(s=>world.edges[s.edge].shortcut===`${a}--${z}`));
 }
});
test('every gated station journey completes; only shortcut edges on the selected path rise',()=>{
 for(const a of world.stations)for(const z of world.stations){
  const {j,b}=start(a.id,z.id),planned=new Set(j.segments.map(s=>s.edge));let event;
  for(let n=0;n<1800&&!event;n++){
   const before=j.position;event=step(j,b,.05);
   assert.ok(distance(before,j.position)<=j.speed*.05+1e-8);
   for(const lane of b.lanes)if(!planned.has(lane.edge.id))assert.ok(lane.tiles.every(t=>t.lift===0));
  }
  assert.equal(event?.index,z.index,`${a.id} -> ${z.id}`);
 }
});
test('tiles rise in a wave, never carry the traveler while moving, and sink sequentially behind',()=>{
 for(const [a,z] of shortcuts)for(const [from,to] of [[a,z],[z,a]]){
  const {j,b}=start(from,to);let rising=false,retiring=false,occupied=false;
  for(let n=0;n<1800&&j.phase!=='detail';n++){
   step(j,b);
   const lane=b.lanes.find(l=>l.edge.shortcut===`${a}--${z}`);
   rising ||= lane.tiles.some(t=>t.lift>0&&t.lift<1&&t.wanted);
   retiring ||= lane.tiles.some(t=>t.lift>0&&t.lift<1&&!t.wanted);
   occupied ||= j.location.edge===lane.edge.id;
  }
  assert.ok(rising&&retiring&&occupied);assert.equal(j.phase,'detail');
  for(let n=0;n<180;n++)b.update(1/60,j);
  assert.ok(b.lanes.every(l=>l.tiles.every(t=>t.lift===0)));
 }
});
test('mid-bridge cancellation holds a safe landing, then reversal replans from the actual position',()=>{
 for(const [a,z] of shortcuts){
  const {j,b}=start(a,z),edge=world.edges.find(e=>e.shortcut===`${a}--${z}`);
  for(let n=0;n<1800;n++){step(j,b);if(j.location.edge===edge.id&&j.location.t>.35&&j.location.t<.65)break;}
  assert.equal(j.location.edge,edge.id);const pos=j.position;j.cancel();
  for(let n=0;n<240;n++)step(j,b);
  assert.deepEqual(j.position,pos);assert.ok(b.snapshot(j).find(l=>l.id===edge.shortcut).visible>0);
  j.visit(station(a).index);assert.deepEqual(j.position,pos);
  assert.equal(finish(j,b,.05).index,station(a).index);
  for(let n=0;n<180;n++)b.update(1/60,j);
  assert.equal(b.snapshot(j).find(l=>l.id===edge.shortcut).visible,0);
 }
});
test('rapid reversals never teleport or open the superseded target; repeat clicks preserve the wave',()=>{
 const {j,b}=start('bot','desktop');
 for(let n=0;n<600;n++){step(j,b);if(j.location.edge!==undefined&&world.edges[j.location.edge].shortcut)break;}
 const token=j.token,lifts=b.lanes.map(l=>l.tiles.map(t=>t.lift));
 assert.equal(j.visit(station('desktop').index),false);assert.equal(j.token,token);
 assert.deepEqual(b.lanes.map(l=>l.tiles.map(t=>t.lift)),lifts);
 for(const id of ['bot','desktop','nex','bot','desktop']){const pos=j.position;j.visit(station(id).index);assert.deepEqual(j.position,pos);step(j,b);}
 assert.equal(finish(j,b).index,station('desktop').index);
});
test('instant deep-link positioning and reduced motion leave no suspended shortcut bridges',()=>{
 const {j,b}=start('brushline','cloudgame');
 for(let n=0;n<100;n++)step(j,b);
 j.visit(station('cloudgame').index,true);b.update(0,j,true);
 assert.equal(j.phase,'detail');assert.equal(j.location.node,station('cloudgame').stop);
 assert.ok(b.lanes.every(l=>l.tiles.every(t=>t.lift===0)));
});
