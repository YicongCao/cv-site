import test from 'node:test';
import assert from 'node:assert/strict';
import {placeLabels} from '../src/label-layout.js';

test('seven mobile project signs remain readable within the viewport',()=>{
  const input=[[6,400,113],[85,389,113],[6,490,134],[165,455,113],[165,550,113],[87,610,110],[6,570,113]].map(([x,y,width])=>({x,y,width,height:38}));
  const before=structuredClone(input),labels=placeLabels(input,{width:390,height:844,top:82,bottom:60});
  assert.deepEqual(input,before);
  for(const a of labels){
    assert.ok(a.x>=6&&a.x+a.width<=384&&a.y>=82&&a.y+a.height<=784);
    for(const b of labels)if(a!==b)assert.ok(a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y);
  }
  const isolated={x:120,y:200,width:110,height:38};
  assert.deepEqual(placeLabels([isolated],{width:1440,height:900})[0],isolated);
});
