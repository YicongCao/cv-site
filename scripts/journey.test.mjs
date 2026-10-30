import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeWorld,sampleRoute,Journey,exhibits} from '../src/world.js';
const data=JSON.parse(readFileSync(new URL('../public/data/portfolio.json',import.meta.url)));
const world=makeWorld(data.projects);
function finish(j){let event;for(let i=0;i<2000&&!event;i++)event=j.update(1/60);return event;}
test('all fifteen exhibits share a connected, continuous surface route',()=>{
 assert.equal(world.stations.length,15);assert.equal(new Set(exhibits).size,15);
 for(const s of world.stations){const p=sampleRoute(world,s.distance);for(const axis of ['x','y','z'])assert.ok(Math.abs(p[axis]-s.stop[axis])<1e-8);}
 for(let d=.02;d<world.length;d+=.02){const a=sampleRoute(world,d-.02),b=sampleRoute(world,d);assert.ok(Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)<=.02001);}
 assert.match(data.projects.find(p=>p.id==='cloudgame').period,/2019/);assert.match(data.projects.find(p=>p.id==='xidian').period,/毕业/);
 assert.equal(data.assets.length,229);assert.ok(!data.projects.find(p=>p.id==='pgos').assets.includes('a184'));
});
test('full end-to-end walk uses uniform speed and takes 6–10 seconds',()=>{
 const j=new Journey(world);const duration=world.length/j.speed;assert.ok(duration>=6&&duration<=10);
 j.visit(14);let previous=0;while(j.phase==='walking'){j.update(.01);assert.ok(j.distance-previous<=j.speed*.01+1e-8);previous=j.distance;}
 assert.equal(j.distance,world.length);assert.equal(j.phase,'casting');assert.equal(finish(j).index,14);assert.equal(j.update(10),null);
});
test('every station is reachable in reverse, including repeats',()=>{
 const j=new Journey(world);j.visit(14,true);
 for(let i=14;i>=0;i--){j.cancel();j.visit(i);assert.equal(finish(j).index,i);assert.equal(j.distance,world.stations[i].distance);}
 j.cancel();j.visit(0);assert.equal(j.phase,'casting');
});
test('latest target replans from actual position; repeat does not restart',()=>{
 const j=new Journey(world);j.visit(14);j.update(2);const actual=j.distance,token=j.token;
 assert.equal(j.visit(14),false);assert.equal(j.token,token);j.visit(0);assert.equal(j.distance,actual);j.update(.1);assert.ok(j.distance<actual);
 j.visit(7);j.visit(3);assert.equal(finish(j).index,3);
});
test('Escape cancels walking, casting and opening without a stale arrival',()=>{
 for(const phase of ['walking','casting','opening']){const j=new Journey(world);j.visit(14);j.phase=phase;j.elapsed=.4;const d=j.distance;j.cancel();for(let i=0;i<100;i++)assert.equal(j.update(.1),null);assert.equal(j.distance,d);assert.equal(j.phase,'idle');}
});
test('deep links position instantly; closing leaves traveler at station',()=>{
 const j=new Journey(world);j.visit(8,true);assert.equal(j.phase,'detail');assert.equal(j.distance,world.stations[8].distance);j.phase='closing';j.elapsed=0;j.update(.33);assert.equal(j.phase,'idle');assert.equal(j.distance,world.stations[8].distance);
});
