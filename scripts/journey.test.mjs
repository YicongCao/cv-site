import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeWorld,Journey,shortestRoute,positionAt,distance,themes} from '../src/world.js';
const data=JSON.parse(readFileSync(new URL('../public/data/portfolio.json',import.meta.url)));
const world=makeWorld(data.projects);
const walkable=world.stations.filter(s=>s.walkable);
function finish(j){let event;for(let i=0;i<2000&&!event;i++)event=j.update(1/60);return event;}
test('four themes cover fifteen projects and three article islands once, preserving dates and assets',()=>{
 const members=themes.flatMap(t=>t.members);assert.equal(members.length,18);assert.equal(new Set(members).size,18);
 assert.deepEqual([...members].sort(),data.projects.map(p=>p.id).sort());assert.equal(world.stations.filter(s=>s.hub).length,4);
 assert.equal(world.edges.filter(e=>e.bridge&&!e.shortcut).length,17); // fifteen main-world bridges, plus two within the isolated KM group
 assert.equal(world.edges.filter(e=>e.shortcut).length,3);
 assert.match(data.projects.find(p=>p.id==='cloudgame').period,/2019/);assert.match(data.projects.find(p=>p.id==='xidian').period,/毕业/);
 assert.ok(!members.includes('kinect'));assert.ok(!data.projects.some(p=>p.id==='kinect'));assert.equal(data.assets.length,243);assert.ok(!data.projects.find(p=>p.id==='pgos').assets.includes('a184'));
});
test('all 225 walkable station pairs follow shortest paths and stay continuous',()=>{
 const n=world.nodes.length,costs=Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>i===j?0:Infinity));
 for(const e of world.edges)costs[e.a][e.b]=costs[e.b][e.a]=e.length;
 for(let k=0;k<n;k++)for(let i=0;i<n;i++)for(let j=0;j<n;j++)costs[i][j]=Math.min(costs[i][j],costs[i][k]+costs[k][j]);
 let max=0;
 for(const a of walkable)for(const b of walkable){
  const route=shortestRoute(world,{node:a.stop},b.stop);assert.ok(Math.abs(route.cost-costs[a.stop][b.stop])<1e-8);max=Math.max(max,route.cost);
  const journey=new Journey(world);journey.visit(a.index,true);journey.cancel();journey.visit(b.index);let prev=journey.position;
  while(journey.phase==='walking'){journey.update(.025);const now=journey.position;assert.ok(distance(prev,now)<=journey.speed*.025+1e-8);prev=now;}
  assert.ok(distance(journey.position,world.nodes[b.stop])<1e-8);assert.equal(finish(journey).index,b.index);
 }
 assert.ok(max/10<7,'all routes remain below seven seconds at the standard walking speed');
});
test('bridges do not cross unrelated island footprints',()=>{
 for(const e of world.edges.filter(e=>e.bridge)){const a=world.nodes[e.a],b=world.nodes[e.b];
  for(const s of world.stations){if(s.index===a.station||s.index===b.station)continue;
   for(let t=0;t<=1;t+=.01){const p=positionAt(world,{edge:e.id,t});assert.ok(Math.abs(p.x-s.x)>=s.size/2+.3||Math.abs(p.z-s.z)>=s.size/2+.3,`${s.id} obstructs bridge ${e.id}`);}
  }
 }
});
test('retargeting from bridge interiors keeps actual position and chooses either endpoint',()=>{
 for(const e of world.edges.filter(e=>e.bridge&&world.stations[world.nodes[e.a].station].walkable))for(const t of [.1,.5,.9]){
  const j=new Journey(world);j.location={edge:e.id,t};const original=j.position;
  for(const index of [0,walkable.at(-1).index,3,10]){j.visit(index);assert.ok(distance(j.position,original)<1e-9);assert.ok(j.remaining<=Math.min(shortestRoute(world,{node:e.a},world.stations[index].stop).cost+t*e.length,shortestRoute(world,{node:e.b},world.stations[index].stop).cost+(1-t)*e.length)+1e-8);}
  assert.equal(finish(j).index,10);
 }
});
test('repeat target does not restart; latest target is the only completion',()=>{
 const j=new Journey(world);j.visit(walkable.at(-1).index);j.update(.7);const token=j.token,p=j.position;assert.equal(j.visit(walkable.at(-1).index),false);assert.equal(j.token,token);assert.deepEqual(j.position,p);
 j.visit(0);j.visit(7);assert.equal(finish(j).index,7);assert.equal(j.update(10),null);
});
test('cancel during walk, cast or portal prevents any stale open',()=>{
 for(const phase of ['walking','casting','opening']){const j=new Journey(world);j.visit(walkable.at(-1).index);j.update(.6);j.phase=phase;const p=j.position;j.cancel();for(let i=0;i<100;i++)assert.equal(j.update(.1),null);assert.deepEqual(j.position,p);assert.equal(j.phase,'idle');}
});
test('deep links and closing retain the exact project stop',()=>{
 const j=new Journey(world);j.visit(8,true);assert.equal(j.phase,'detail');assert.equal(j.location.node,world.stations[8].stop);j.phase='closing';j.elapsed=0;j.update(.33);assert.equal(j.phase,'idle');assert.equal(j.location.node,world.stations[8].stop);
});
