import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from 'three';
import {framedStations,archivePeekRect} from '../src/archive-preview.js';
import {Exhibition} from '../src/exhibition.js';
import {makeWorld,Journey} from '../src/world.js';

const data=JSON.parse(readFileSync(new URL('../public/data/portfolio.json',import.meta.url))),world=makeWorld(data.projects);
test('the main overview frames only the fifteen project islands regardless of archive positions',()=>{
 const stations=framedStations(world.stations,'overview',null);assert.equal(stations.length,15);assert(stations.every(s=>s.walkable));
 const moved=world.stations.map(s=>s.walkable?s:{...s,x:10000,y:10000,z:10000});assert.deepEqual(framedStations(moved,'overview',null),stations);
 assert.deepEqual(framedStations(world.stations,'theme','km').map(s=>s.id),['km-compiler','km-bot','km-network']);
});
test('the archive invitation remains visible and slightly cropped at every responsive size',()=>{
 for(const [w,h] of [[1920,1080],[1440,900],[1280,720],[768,1024],[390,844],[320,568]]){
  const r=archivePeekRect(w,h,1.55);assert(r.x>w/2&&r.y>h/2);assert(r.x+r.width>w&&r.y+r.height>h-(w<=850?78:0));assert(w-r.x>120&&h-r.y>60);assert(r.width<=420&&r.height<=h*.3);
 }
});
test('folding transforms only archive geometry and its veil, never the main islands or traveler',()=>{
 const islands=world.stations.map(s=>{const group=new T.Group();group.position.set(s.x,s.y,s.z);return {group};}),sections=[{a:'km',group:new T.Group()},{a:'ai',group:new T.Group()}],journey=new Journey(world);
 const scene={world,islands,sections,journey,width:1440,height:900,viewHeight:60,center:new T.Vector3(),element:{dataset:{}},mode:'overview',introActive:false,reduced:()=>true,archiveMask:{value:0}};
 const position=journey.position;
 for(const [width,height] of [[1440,900],[390,844],[768,1024]]){
  Object.assign(scene,{width,height});Exhibition.prototype.updateArchive.call(scene,0);
  assert.equal(scene.archiveMask.value,.48);assert.equal(scene.element.dataset.archive,'collapsed');
  for(const s of world.stations){const g=islands[s.index].group;assert([...g.position,...g.scale].every(Number.isFinite));if(s.walkable){assert.deepEqual([...g.position],[s.x,s.y,s.z]);assert.deepEqual([...g.scale],[1,1,1]);}}
 }
 scene.mode='theme';Exhibition.prototype.updateArchive.call(scene,0);assert.equal(scene.archiveMask.value,0);
 for(const s of world.stations){assert.deepEqual([...islands[s.index].group.position],[s.x,s.y,s.z]);assert.deepEqual([...islands[s.index].group.scale],[1,1,1]);}
 assert.deepEqual([...sections[0].group.position],[0,0,0]);assert.deepEqual(journey.position,position);assert.equal(journey.phase,'idle');
 scene.mode='overview';scene.introActive=true;Exhibition.prototype.updateArchive.call(scene,0);assert(world.stations.filter(s=>!s.walkable).every(s=>!islands[s.index].group.visible));
});
