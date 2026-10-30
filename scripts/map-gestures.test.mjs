import {test} from 'node:test';
import assert from 'node:assert/strict';
import {MapGestures,zoomFrame} from '../src/map-gestures.js';
import {Exhibition} from '../src/exhibition.js';
import * as T from 'three';

test('taps retain their label target, while label and surface drags never become taps',()=>{
 const taps=[],moves=[],g=new MapGestures({onTap:e=>taps.push(e),onChange:e=>moves.push(e)}),label={id:'nex'};
 g.down(1,100,100,label);g.up(1,101,102);assert.equal(taps.length,1);assert.equal(taps[0].target,label);
 for(const target of [label,{id:'canvas'}]){g.down(2,100,100,target);g.move(2,150,130);g.up(2,150,130);}
 assert.equal(taps.length,1);assert.equal(moves.length,2);assert.deepEqual([moves[0].dx,moves[0].dy],[50,30]);assert(!g.active);
});
test('pinch zoom tracks distance and center; lifting a finger continues pan without a phantom tap',()=>{
 const taps=[],moves=[],g=new MapGestures({onTap:e=>taps.push(e),onChange:e=>moves.push(e)});
 g.down(11,100,200,{});g.down(12,200,200,{});g.move(12,300,220);
 assert(g.pinching);assert(moves[0].ratio>2);assert.equal(moves[0].x,200);assert.equal(moves[0].y,210);
 g.up(11,100,200);assert(!g.pinching&&g.active);g.move(12,320,230);assert.deepEqual([moves.at(-1).dx,moves.at(-1).dy,moves.at(-1).ratio],[20,10,1]);g.up(12,320,230);assert.equal(taps.length,0);
});
test('cancel, lost pointers, and rapid restarts cannot replay stale taps or camera deltas',()=>{
 const taps=[],moves=[],g=new MapGestures({onTap:e=>taps.push(e),onChange:e=>moves.push(e)});
 g.down(1,0,0,{});g.down(2,100,0,{});g.cancel();g.move(1,200,100);g.up(1,200,100);assert.equal(taps.length,0);assert.equal(moves.length,0);
 g.down(3,50,50,{});g.move(3,60,60);assert.deepEqual([moves[0].dx,moves[0].dy],[10,10]);g.up(3,60,60);assert.equal(taps.length,0);
});
test('pinch keeps the world point under the fingers fixed and respects finite zoom bounds',()=>{
 const frame={height:70,x:4,y:-2},anchor={x:280,y:420},w=390,h=844;
 const world=f=>({x:f.x+(anchor.x-w/2)*f.height/h,y:f.y+(h/2-anchor.y)*f.height/h});
 const next=zoomFrame(frame,1.8,anchor,w,h);assert(Math.abs(world(frame).x-world(next).x)<1e-10);assert(Math.abs(world(frame).y-world(next).y)<1e-10);
 const restored=zoomFrame(next,1/1.8,anchor,w,h);for(const key of ['height','x','y'])assert(Math.abs(restored[key]-frame[key])<1e-10);
 assert.equal(zoomFrame(frame,100,anchor,w,h).height,12);assert.equal(zoomFrame(frame,.001,anchor,w,h).height,240);
});

test('canvas taps do not mistake the stage diagnostic theme attribute for a theme button',()=>{
 const actions=[],target={closest:selector=>selector==='[data-theme]'?{dataset:{theme:'ai'}}:null};
 const scene={world:{stations:[{walkable:true}]},theme:'ai',pick:()=>0,onSelect:(i,options)=>actions.push({i,options}),onTheme:()=>assert.fail('stage is not a theme button'),lastHit:new T.Vector3()};
 Exhibition.prototype.tapMap.call(scene,{target,x:200,y:400});assert.deepEqual(actions,[{i:0,options:{visit:true}}]);
});
test('ray picking allows a visible island from another theme and excludes hidden islands',()=>{
 const scene=new T.Scene(),a=new T.Group(),b=new T.Group(),mesh=new T.Mesh();scene.add(a,b);b.add(mesh);
 const state={scene,world:{stations:[{theme:'ai'},{theme:'games'}]},theme:'ai',mode:'theme',element:{getBoundingClientRect:()=>({left:0,top:0,width:390,height:844})},pointer:new T.Vector2(),camera:{},islands:[{group:a},{group:b}],traveler:{root:new T.Group()},bridgeNeighbors:()=>new Set(),ray:{setFromCamera(){},intersectObjects:objects=>objects.includes(b)?[{object:mesh,point:new T.Vector3()}]:[]}};
 assert.equal(Exhibition.prototype.pick.call(state,{clientX:200,clientY:400}),1);b.visible=false;assert.equal(Exhibition.prototype.pick.call(state,{clientX:200,clientY:400}),-1);
});
