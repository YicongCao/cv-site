import {test} from 'node:test';
import assert from 'node:assert/strict';
import {botFrame,botLines,rallyFrame,pongFrame,IslandMotion,Meteors} from '../src/island-motion.js';
import {makeExhibit,batchBoxes,box} from '../src/models.js';
import * as T from 'three';
test('bot types each sentence, holds exactly 300ms, blanks, and repeats',()=>{
 let offset=0;
 for(const text of botLines){const typed=(text.length-1)*.14;assert.equal(botFrame(offset+.01).text,text[0]);assert.equal(botFrame(offset+typed+.299).text,text);assert.equal(botFrame(offset+typed+.301).text,'');offset+=typed+.46;}
 assert.equal(botFrame(offset+.01).text,'你');
});
test('rally returns continuously after drive, drift, horn and rest',()=>{
 assert.equal(rallyFrame(1).phase,'drive');assert.equal(rallyFrame(4.5).phase,'drift');assert.equal(rallyFrame(5.3).speed,0);assert.equal(rallyFrame(5.7).phase,'horn');
 const a=rallyFrame(7.99999),b=rallyFrame(8);assert.ok(Math.hypot(a.x-b.x,a.z-b.z)<.001);
 for(let t=0;t<8;t+=.001){const p=rallyFrame(t),q=rallyFrame(t+.001);assert.ok(Math.hypot(p.x-q.x,p.z-q.z)<.01);}
});
test('pong meets the paddle at each collision and stays within the display',()=>{
 for(let leg=0;leg<10;leg++){const f=pongFrame(leg/1.1);assert.ok(Math.abs(f.y-(leg%2?f.right:f.left))<1e-8);}
 for(let t=0;t<30;t+=.01){const f=pongFrame(t);assert.ok(Math.abs(f.x)<=.92&&Math.abs(f.y)<.3);}
});
test('batching keeps animated descendants independent and merges static boxes',()=>{
 const group=new T.Group(),animated=new T.Group();animated.userData.dynamic=true;group.add(animated);const moving=box(animated,0,0,0,1,1,1),fixed=box(group,1,0,0,1,1,1);batchBoxes(group);assert.equal(moving.parent,animated);assert.equal(fixed.parent,null);assert.ok(group.children.some(o=>o.isInstancedMesh));
});
test('all fourteen model loops stay finite and reset without damaging static geometry',async()=>{
 const {makeIsland}=await import('../src/models.js'),{makeWorld}=await import('../src/world.js'),{readFileSync}=await import('node:fs');
 globalThis.document={createElement:tag=>({style:{},dataset:{},setAttribute(){},offsetWidth:240,getContext:()=>({fillRect(){},drawImage(){},save(){},restore(){},beginPath(){},rect(){},clip(){}}),remove(){}})};
 const data=JSON.parse(readFileSync(new URL('../public/data/portfolio.json',import.meta.url))),world=makeWorld(data.projects),islands=world.stations.map(s=>({group:makeIsland(s)})),element={dataset:{},append(){}};
 const sounds=[],controller=new IslandMotion({element,islands,world,onSound:e=>sounds.push(e)}),camera=new T.OrthographicCamera(-40,40,30,-30,.1,300);camera.position.set(50,70,50);camera.lookAt(0,0,0);camera.updateMatrixWorld();
 for(let i=0;i<world.stations.length;i++){
  for(let frame=0;frame<700;frame++)controller.update(.02,i,camera,1440,900);
  islands[i].group.traverse(o=>{for(const v of [...o.position,...o.scale])assert.ok(Number.isFinite(v),world.stations[i].id);if(o.geometry?.attributes.position){for(const v of o.geometry.attributes.position.array)assert.ok(Number.isFinite(v));}});
  controller.update(.02,-1,camera,1440,900);assert.equal(islands[i].group.userData.motion.exhibit.rotation.z,0);
 }
 for(const station of world.stations){assert.ok(sounds.some(e=>e.id===station.id),`${station.id} emits sound cues`);if(!['brushline','bot'].includes(station.id))assert.ok(sounds.some(e=>e.id===station.id&&e.time>10));}
 delete globalThis.document;
});
test('meteors appear in pairs at 10–15 second intervals and clear when disabled',()=>{
 globalThis.document={createElement:()=>({style:{},remove(){this.removed=true;}})};
 const nodes=[],element={dataset:{},append(el){nodes.push(el);}},meteors=new Meteors(element);
 assert.ok(meteors.wait>=10&&meteors.wait<=15);meteors.update(meteors.wait-.01,true,1440,900);meteors.update(.02,true,1440,900);assert.equal(nodes.length,2);assert.equal(element.dataset.meteorPasses,'1');assert.ok(meteors.wait>=10&&meteors.wait<=15);
 const first=meteors.items[0],before=first.el.style.transform.match(/translate\(([-.\d]+)px,([-.\d]+)px/).slice(1).map(Number),alpha=Number(first.el.style.opacity);meteors.update(.3,true,1440,900);const after=first.el.style.transform.match(/translate\(([-.\d]+)px,([-.\d]+)px/).slice(1).map(Number);assert.ok(after[0]<before[0]&&after[1]>before[1]);assert.ok(Number(first.el.style.opacity)<alpha);
 // Check both cores along the whole flight, switching to mobile halfway through.
 for(let frame=0;frame<180;frame++){
  const [w,h]=frame<60?[1440,900]:[390,844];meteors.update(.02,true,w,h);
  for(const item of meteors.items){const [x,y]=item.el.style.transform.match(/translate\(([-.\d]+)px,([-.\d]+)px/).slice(1).map(Number);assert.ok(x>=0&&x+16<=w+1e-8);assert.ok(y>=0&&y+16<=h*.25+1e-8);assert.ok(Math.abs(x/(w-16)+y/(h*.25-16)-1)<1e-8);}
 }
 meteors.update(.1,false,1440);assert.equal(meteors.items.length,0);assert.ok(nodes.every(n=>n.removed));delete globalThis.document;
});
