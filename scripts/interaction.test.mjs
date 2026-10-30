import test from 'node:test';
import assert from 'node:assert/strict';
import {insideImage} from '../src/dialog-dismiss.js';
import {HoverExhaust} from '../src/hover-exhaust.js';

test('image dismissal distinguishes fitted artwork from portrait and landscape letterboxing',()=>{
 const rect={left:20,top:30,width:500,height:500};
 assert.equal(insideImage({x:270,y:60},rect,2000,1000),false);
 assert.equal(insideImage({x:270,y:280},rect,2000,1000),true);
 assert.equal(insideImage({x:60,y:280},rect,1000,2000),false);
 assert.equal(insideImage({x:270,y:280},rect,1000,2000),true);
 assert.equal(insideImage({x:270,y:280},rect,0,0),true);
});
test('hover exhaust stays below the island, bounded and transient after departure',()=>{
 const exhaust=new HoverExhaust(),station={id:'bot',x:10,y:1.44,z:-5,size:5.2};let max=0;
 for(let i=0;i<600;i++){
  exhaust.update(1/60,station);max=Math.max(max,exhaust.activeCount);
  for(const p of exhaust.particles.filter(p=>p.mesh.visible)){
   assert.ok(p.mesh.position.y<station.y-1.35);
   assert.ok(Math.abs(p.mesh.position.x-station.x)<station.size/2);
   assert.ok(p.mesh.material.opacity>0&&p.mesh.material.opacity<=.5);
  }
 }
 assert.ok(max>=6&&max<=12);assert.equal(exhaust.group.children.length,12);
 const p=exhaust.particles.find(p=>p.mesh.visible),y=p.mesh.position.y,alpha=p.mesh.material.opacity;
 exhaust.update(.01,null);assert.ok(p.mesh.position.y<y&&p.mesh.material.opacity<alpha);
 for(let i=0;i<120;i++)exhaust.update(1/60,null);assert.equal(exhaust.activeCount,0);
 exhaust.update(.01,station);assert.ok(exhaust.activeCount>0);exhaust.update(.01,station,false);assert.equal(exhaust.activeCount,0);
});
