import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {makeTraveler} from '../src/models.js';
import {IdleClock,idleDurations,idlePose,applyIdlePose,TravelerIdle} from '../src/traveler-idle.js';

test('stationary actions start every ten seconds and never immediately repeat',()=>{
 const clock=new IdleClock(()=>0);for(let i=0;i<599;i++)assert.equal(clock.update(1/60,true),null);
 assert.equal(clock.update(1/60,true),'twirl');
 for(let i=0;i<599;i++)clock.update(1/60,true);
 assert.equal(clock.update(1/60,true),'think');
 for(let n=0;n<10;n++){const last=clock.action;for(let i=0;i<600;i++)clock.update(1/60,true);assert.notEqual(clock.action,last);}
});
test('movement, dialogs, hidden pages and reduced motion can cancel and restart a full idle interval',()=>{
 const clock=new IdleClock(()=>.99);clock.update(10,true);assert.equal(clock.action,'hat');clock.update(1.5,true);
 clock.update(.02,false);assert.equal(clock.action,null);assert.equal(clock.elapsed,0);assert.equal(clock.next,10);
 clock.update(9.99,true);assert.equal(clock.action,null);clock.update(.01,true);assert.ok(clock.action);
 clock.update(100,false);assert.equal(clock.next,10);assert.equal(clock.action,null);
});
test('all poses stay finite, in place, and return to the same standing silhouette',()=>{
 const traveler=makeTraveler(),position=new T.Vector3(4,.36,9);traveler.root.position.copy(position);
 for(const [action,duration] of Object.entries(idleDurations)){
  for(let t=0;t<=duration;t+=.01){const p=idlePose(action,t);assert.ok(Object.values(p).every(Number.isFinite));traveler.body.position.y=0;applyIdlePose(traveler,p,.7);assert.deepEqual(traveler.root.position,position);assert.equal(traveler.hat.parent,traveler.head);}
  applyIdlePose(traveler,idlePose(action,duration),.7);
  assert.equal(traveler.root.rotation.y,.7);assert.deepEqual([...traveler.hat.position],[0,.17,0]);
  assert.equal(traveler.arms[0].rotation.z,0);assert.equal(traveler.arms[1].rotation.x,0);assert.equal(traveler.head.rotation.z,0);
 }
});
test('twirl turns once, thinking scratches with a balloon, and the hat leaves then returns to the head',()=>{
 assert.ok(Math.abs(idlePose('twirl',2.9).spin-Math.PI*2)<1e-8);
 const twirl=idlePose('twirl',1.5);assert.ok(twirl.leftZ<-1&&twirl.rightZ>1);
 const thinking=idlePose('think',1.4);assert.ok(thinking.bubble>.99&&thinking.rightZ<-2.5);
 const hat=idlePose('hat',1.9);assert.ok(hat.hatZ>.4&&hat.hatRX>1&&hat.hatY<0);
 assert.deepEqual(idlePose('hat',4),idlePose(null,0));
});
test('moving the hat pivot preserves the original resting world geometry',()=>{
 const t=makeTraveler();t.root.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(t.hat);
 assert.ok(Math.abs(bounds.min.y-.9625)<1e-6);assert.ok(Math.abs(bounds.max.y-1.6325)<1e-6);
});
test('thought balloon draws animated pixel lines without text and clears when interrupted',()=>{
 const strokes=[],ctx={clearRect(){},fillRect(){},beginPath(){},moveTo(x,y){strokes.push([x,y]);},lineTo(x,y){strokes.push([x,y]);},stroke(){}};
 let removed=false;const canvas={style:{},hidden:true,setAttribute(){},getContext:()=>ctx,remove(){removed=true;}};
 globalThis.document={createElement:()=>canvas};
 try{
  const element={dataset:{},append(){}},idle=new TravelerIdle(element),traveler=makeTraveler(),camera=new T.OrthographicCamera(-5,5,5,-5,.1,100);
  camera.position.set(10,10,10);camera.lookAt(0,0,0);camera.updateMatrixWorld();idle.clock.action='think';idle.clock.elapsed=1.4;
  idle.update(0,true,traveler,0,camera,1280,720,86);assert.equal(canvas.hidden,false);assert.equal(element.dataset.idleAction,'think');assert.equal(strokes.length,37);
  const first=strokes.slice();idle.update(.14,true,traveler,0,camera,1280,720,86);assert.equal(strokes.length,74);assert.notDeepEqual(strokes.slice(37),first);
  assert.equal(canvas.textContent,undefined);assert.ok(strokes.every(([x,y])=>x>=0&&x<=80&&y>=0&&y<=44));
  idle.update(.02,false,traveler,0,camera,1280,720,86);assert.equal(canvas.hidden,true);assert.equal(element.dataset.idleAction,'');idle.dispose();assert.ok(removed);
 }finally{delete globalThis.document;}
});
