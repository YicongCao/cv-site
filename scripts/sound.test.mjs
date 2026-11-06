import {test} from 'node:test';
import assert from 'node:assert/strict';
import {GallerySound,FootstepCadence,makeFootstepSamples,makeItemChimeSamples} from '../src/sound.js';
import {hoverCue,hoverSoundProjects,makeHoverSamples} from '../src/hover-sound.js';
function rig(preference=null){
 const stored=new Map([['pixelcao:sound',preference]]),storage={getItem:k=>stored.get(k),setItem:(k,v)=>stored.set(k,v)};
 const param=()=>({value:0,cancelScheduledValues(){},setTargetAtTime(v){this.value=v;},setValueAtTime(v){this.value=v;},linearRampToValueAtTime(v){this.value=v;},exponentialRampToValueAtTime(v){this.value=v;}});
 const node=()=>({gain:param(),frequency:param(),pan:param(),connect(){},disconnect(){},start(){},stop(){}});
 let contexts=0,sources=0;
 const context={state:'suspended',currentTime:0,sampleRate:8000,destination:{},createGain:node,createBufferSource(){sources++;return node();},createOscillator:node,createStereoPanner:node,createBiquadFilter:node,createBuffer:(ch,n)=>({getChannelData:()=>new Float32Array(n)}),decodeAudioData:async()=>({}),async resume(){this.state='running';},async suspend(){this.state='suspended';}};
 const sound=new GallerySound({storage,contextFactory:()=>{contexts++;return context;},loadMusic:async()=>new ArrayBuffer(8)});
 return {sound,context,stored,counts:()=>({contexts,sources})};
}
test('audio is lazy, unlocks once and does not layer duplicate music loops',async()=>{
 const r=rig();assert.equal(r.counts().contexts,0);assert.equal(r.sound.state,'waiting');
 await Promise.all([r.sound.activate(),r.sound.activate(),r.sound.activate()]);await r.sound.loading;
 assert.deepEqual(r.counts(),{contexts:1,sources:1});assert.equal(r.sound.source.loop,true);assert.equal(r.sound.state,'playing');
});
test('mute preference survives gestures; toggling does not reconstruct music',async()=>{
 const r=rig('off');await r.sound.tap();assert.equal(r.counts().contexts,0);
 await r.sound.toggle();await r.sound.loading;await r.sound.toggle();await r.sound.activate();
 assert.equal(r.sound.master.gain.value,0);assert.equal(r.stored.get('pixelcao:sound'),'off');assert.equal(r.sound.state,'muted');
 await r.sound.toggle();assert.deepEqual(r.counts(),{contexts:1,sources:1});
});
test('first visit enables sound; waiting for browser permission is not a muted preference',async()=>{
 const r=rig();assert.equal(r.sound.enabled,true);assert.equal(r.sound.state,'waiting');
 await r.sound.toggle();assert.equal(r.sound.enabled,false);assert.equal(r.stored.get('pixelcao:sound'),'off');assert.equal(r.counts().contexts,0);
 await r.sound.toggle();assert.equal(r.sound.enabled,true);assert.equal(r.sound.state,'playing');
});
test('muting during a pending autoplay request stays muted when the browser later resumes',async()=>{
 const {sound:s,context:c}=rig();let release;c.resume=()=>new Promise(resolve=>{release=()=>{c.state='running';resolve();};});
 const pending=s.activate();await s.toggle();assert.equal(s.enabled,false);release();await pending;await s.loading;
 assert.equal(s.master.gain.value,0);assert.equal(s.state,'muted');
});
test('footsteps follow distance, not idle frames, cancellation or teleport',()=>{
 const c=new FootstepCadence();assert.equal(c.update(0,false),false);assert.equal(c.update(0,true),false);assert.equal(c.update(2,true),false);assert.equal(c.update(2.6,true),true);
 for(let i=0;i<100;i++)assert.equal(c.update(2.6,false),false);
 assert.equal(c.update(30,false),false);assert.equal(c.update(30,true),false);assert.equal(c.update(30.3,true),true);
});
test('background suspension, detail ducking and audible video exclusion restore correctly',async()=>{
 const {sound:s,context:c}=rig();await s.activate();await s.loading;
 s.setDetail(true);assert.equal(s.music.gain.value,.13);s.setAudibleVideo(true);assert.equal(s.music.gain.value,0);
 s.setAudibleVideo(false);assert.equal(s.music.gain.value,.13);s.setDetail(false);assert.equal(s.music.gain.value,.42);
 await s.setHidden(true);assert.equal(c.state,'suspended');assert.equal(s.master.gain.value,0);await s.tap();assert.equal(s.tapCount,0);
 await s.setHidden(false);assert.equal(c.state,'running');assert.equal(s.master.gain.value,.85);
});
test('rapid click events are coalesced; muted walking has no delayed sound burst',async()=>{
 const {sound:s,context:c}=rig();await s.activate();await s.loading;
 await Promise.all([s.tap(),s.tap()]);assert.equal(s.tapCount,1);c.currentTime=.1;await s.tap();assert.equal(s.tapCount,2);
 s.walk(0,true);s.walk(2.6,true);assert.equal(s.stepCount,1);await s.toggle();s.walk(6,true);assert.equal(s.stepCount,1);
 await s.toggle();s.walk(6,true);assert.equal(s.stepCount,1);c.currentTime=.5;s.walk(8,true);assert.equal(s.stepCount,2);
});
test('missing music keeps optional effects usable and unsupported audio stays silent',async()=>{
 const r=rig();r.sound.loadMusic=async()=>{throw new Error('404');};await r.sound.activate();await r.sound.loading;assert.equal(r.sound.musicFailed,true);await r.sound.tap();assert.equal(r.sound.tapCount,1);
 const failed=new GallerySound({storage:{getItem:()=>null},contextFactory:()=>{throw new Error('unsupported');}});assert.equal(await failed.activate(),false);assert.equal(failed.enabled,false);
});

test('shoe friction has audible energy, quiet boundaries, headroom and different feet',()=>{
 const a=makeFootstepSamples(48000),b=makeFootstepSamples(48000,1);
 const rms=Math.sqrt(a.reduce((sum,x)=>sum+x*x,0)/a.length);
 assert.ok(rms>.10&&rms<.25,`friction RMS ${rms}`);assert.ok(Math.max(...a.map(Math.abs))<.66);
 assert.equal(a[0],0);assert.ok(Math.abs(a.at(-1))<.001);assert.notDeepEqual(a,b);
});
test('hover engine has one voice, horns once per stop and stops on mute or exit',async()=>{
 const {sound:s}=rig();await s.activate();await s.loading;
 let notes=0;s.tone=()=>notes++;
 s.island({id:'brushline',phase:'drive',speed:1});const engine=s.engine;
 for(let i=0;i<30;i++)s.island({id:'brushline',phase:'drive',speed:.6});assert.equal(s.engine,engine);
 s.island({id:'brushline',phase:'horn'});s.island({id:'brushline',phase:'horn'});assert.equal(notes,2);
 s.island({id:null});assert.equal(s.engine,null);
 s.island({id:'brushline',phase:'drive',speed:1});await s.toggle();assert.equal(s.engine,null);
 s.island({id:'bot',phase:'syllable',pitch:2});assert.equal(notes,2);
});
test('robot prefers local Chinese speech and cancels its utterance on mute',async()=>{
 const {sound:s}=rig();await s.activate();await s.loading;let queued,cancelled=0,bleeps=0;
 s.speech={getVoices:()=>[{lang:'zh-CN',localService:false},{lang:'zh-CN',localService:true}],speak:u=>queued=u,cancel:()=>cancelled++};s.Utterance=class{constructor(text){this.text=text;}};s.tone=()=>bleeps++;
 s.island({id:'bot',phase:'line',text:'你好'});assert.equal(queued.text,'你好');assert.equal(queued.voice.localService,true);assert.ok(queued.pitch>1);
 s.island({id:'bot',phase:'syllable'});assert.equal(bleeps,0);await s.toggle();assert.equal(cancelled,1);assert.equal(s.robotSpeaking,false);
});
test('item chime triggers once at portal opening, with no walk, cast or deep-link sound',async()=>{
 const {sound:s,counts}=rig();await s.activate();await s.loading;
 for(const phase of ['walking','casting','detail'])s.portal(phase,1);
 assert.equal(s.itemCount,0);
 for(let i=0;i<30;i++)s.portal('opening',2);
 assert.equal(s.itemCount,1);assert.equal(counts().sources,2);assert.ok(s.itemVoice);
 s.portal('detail',2);assert.ok(s.itemVoice); // allow the short decay to complete
 s.portal('idle',3);assert.equal(s.itemVoice,null);
 s.portal('opening',4);assert.equal(s.itemCount,2);
});
test('muted, hidden and interrupted item animations never queue a late sound',async()=>{
 const {sound:s}=rig('off');s.portal('opening',1);assert.equal(s.context,undefined);
 await s.toggle();await s.loading;s.portal('opening',1);assert.equal(s.itemCount,0);
 s.portal('opening',2);assert.equal(s.itemCount,1);s.portal('walking',3);assert.equal(s.itemVoice,null);
 s.portal('opening',3);await s.toggle();assert.equal(s.itemVoice,null);
 await s.toggle();s.portal('opening',3);assert.equal(s.itemCount,2);
 await s.setHidden(true);s.portal('opening',4);await s.setHidden(false);s.portal('opening',4);assert.equal(s.itemCount,2);
 s.setAudibleVideo(true);s.portal('opening',5);s.setAudibleVideo(false);s.portal('opening',5);assert.equal(s.itemCount,2);
});
test('item chime is short, deterministic, audible and free of clipped edges',()=>{
 const a=makeItemChimeSamples(48000),b=makeItemChimeSamples(48000);
 const rms=Math.sqrt(a.reduce((sum,x)=>sum+x*x,0)/a.length),peak=a.reduce((max,x)=>Math.max(max,Math.abs(x)),0);
 assert.equal(a.length,42240);assert.deepEqual(a,b);assert.ok(rms>.03&&rms<.2);assert.ok(peak>.1&&peak<.8);
 assert.equal(a[0],0);assert.ok(Math.abs(a.at(-1))<.0001);
});
test('every other island has audible, bounded cues without a per-frame audio flood',async()=>{
 const {sound:s,context:c}=rig();await s.activate();await s.loading;
 assert.equal(hoverSoundProjects.length,13);
 for(const id of hoverSoundProjects){
  s.island({id:null});const before=s.hoverCount;
  for(let frame=0;frame<1200;frame++){const time=frame/60;c.currentTime=time;s.island({id,time});}
  const count=s.hoverCount-before;assert.ok(count>=7&&count<75,`${id}: ${count}`);
 }
 // Buffers are cached across visits; only one voice per action, not per frame.
 const size=s.hoverBuffers.size;s.island({id:null});s.island({id:'win10',time:0});const count=s.hoverCount;
 for(let i=0;i<100;i++)s.island({id:'win10',time:0});
 assert.equal(s.hoverCount,count);assert.equal(s.hoverBuffers.size,size);
 for(const id of hoverSoundProjects)for(let t=0;t<12;t+=.1){
  const cue=hoverCue(id,t);if(!cue)continue;const a=makeHoverSamples(8000,cue.kind,cue.frequency);
  const peak=a.reduce((p,x)=>Math.max(p,Math.abs(x)),0),rms=Math.sqrt(a.reduce((sum,x)=>sum+x*x,0)/a.length);
  assert.ok(peak>.015&&peak<.8,`${id} ${cue.kind} peak ${peak}`);assert.ok(rms>.008);
  assert.ok(a[0]===0);assert.ok(Math.abs(a.at(-1))<.003);
 }
});
test('hover cues match pong collisions and map/window phases, skipping missed frames',async()=>{
 assert.equal(hoverCue('cloudgame',1/1.1).key,'cloudgame:0:1');
 assert.equal(hoverCue('xidian',3.5).kind,'paper');assert.equal(hoverCue('win10',2.6).kind,'close');
 const {sound:s}=rig();await s.activate();await s.loading;
 s.island({id:'nex',time:0});const count=s.hoverCount;
 s.island({id:'nex',time:5});assert.ok(s.hoverCount<=count+1);const afterJump=s.hoverCount;
 s.island({id:'museum',time:7.9});assert.equal(s.hoverCount,afterJump);
});
test('hover sounds release on exit, mute, detail, audible video and background without replay',async()=>{
 const {sound:s}=rig();await s.activate();await s.loading;
 const start=()=>s.island({id:'museum',time:0});
 start();assert.equal(s.hoverVoices.size,1);s.island({id:null});assert.equal(s.hoverVoices.size,0);
 start();s.setDetail(true);assert.equal(s.hoverVoices.size,0);s.island({id:'museum',time:1.1});const count=s.hoverCount;s.setDetail(false);s.island({id:'museum',time:1.1});assert.equal(s.hoverCount,count);
 s.island({id:null});start();s.setAudibleVideo(true);assert.equal(s.hoverVoices.size,0);s.island({id:'museum',time:2.85});const videoCount=s.hoverCount;s.setAudibleVideo(false);s.island({id:'museum',time:2.85});assert.equal(s.hoverCount,videoCount);
 s.island({id:null});start();await s.toggle();assert.equal(s.hoverVoices.size,0);s.island({id:'museum',time:4.6});const mutedCount=s.hoverCount;await s.toggle();s.island({id:'museum',time:4.6});assert.equal(s.hoverCount,mutedCount);
 s.island({id:null});start();await s.setHidden(true);assert.equal(s.hoverVoices.size,0);s.island({id:'museum',time:6.35});const hiddenCount=s.hoverCount;await s.setHidden(false);s.island({id:'museum',time:6.35});assert.equal(s.hoverCount,hiddenCount);
});
