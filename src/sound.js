import {hoverCue,makeHoverSamples} from './hover-sound.js';
// Short shoe scuffs: two friction swells, with low rumble and sharp hiss removed.
// Render once at context creation, then reuse buffers for every footfall.
export function makeFootstepSamples(rate,variant=0){
 const samples=new Float32Array(Math.floor(rate*.19));let seed=8723+variant*173,low=0,slow=0,peak=0;
 const fastAlpha=1-Math.exp(-2*Math.PI*3400/rate),slowAlpha=1-Math.exp(-2*Math.PI*380/rate);
 for(let i=0;i<samples.length;i++){
  seed=(seed*1664525+1013904223)>>>0;const white=seed/4294967296*2-1;
  low+=fastAlpha*(white-low);slow+=slowAlpha*(low-slow);
  const t=i/rate,edge=Math.min(1,t/.008,(.19-t)/.025);
  const envelope=(.8*Math.exp(-(((t-.045)/.028)**2))+.55*Math.exp(-(((t-.115)/.038)**2)))*Math.max(0,edge);
  samples[i]=(low-slow)*envelope;peak=Math.max(peak,Math.abs(samples[i]));
 }
 for(let i=0;i<samples.length;i++)samples[i]*=.65/peak;
 return samples;
}
// Original, noise-free RPG item chime: a short rising arpeggio and glassy decay.
export function makeItemChimeSamples(rate){
 const samples=new Float32Array(Math.ceil(rate*.88));
 for(const [at,frequency,length,volume] of [[0,523.25,.30,.24],[.085,659.25,.30,.23],[.17,783.99,.34,.22],[.28,1046.5,.60,.28]]){
  const offset=Math.round(at*rate),count=Math.ceil(length*rate);
  for(let i=0;i<count&&offset+i<samples.length;i++){
   const t=i/rate,phase=2*Math.PI*frequency*t;
   const envelope=Math.min(1,t/.006)*Math.exp(-t*7)*Math.min(1,(length-t)/.035);
   const triangle=2/Math.PI*Math.asin(Math.sin(phase));
   samples[offset+i]+=volume*envelope*(.65*Math.sin(phase)+.25*triangle+.10*Math.sin(phase*2));
  }
 }
 return samples;
}
// One audio graph for the entire gallery. No timers and no per-frame audio allocation.
export class FootstepCadence {
 constructor(){this.distance=null;this.bucket=null;}
 update(distance,walking){
  const bucket=Math.floor(distance*1.25/Math.PI),advanced=this.distance!==null&&distance>this.distance+.0001;
  const hit=walking&&advanced&&this.bucket!==null&&bucket>this.bucket;
  this.distance=distance;this.bucket=bucket;return hit;
 }
}
export class GallerySound {
 constructor({speech=globalThis.speechSynthesis,Utterance=globalThis.SpeechSynthesisUtterance,contextFactory=()=>new (window.AudioContext||window.webkitAudioContext)(),storage=globalThis.localStorage,onChange=()=>{},loadMusic=async()=>{
  const response=await fetch('/audio/quiet-islands.mp3');if(!response.ok)throw new Error('Music unavailable');return response.arrayBuffer();
 }}={}){
  Object.assign(this,{speech,Utterance,contextFactory,storage,onChange,loadMusic});
  try{this.enabled=storage.getItem('pixelcao:sound')!=='off';}catch{this.enabled=true;}
  this.hidden=false;this.detail=false;this.audibleVideo=false;this.cadence=new FootstepCadence();this.lastTap=-Infinity;this.lastStep=-Infinity;this.stepCount=0;this.tapCount=0;this.itemCount=0;this.lastPortalToken=null;
  this.hoverBuffers=new Map();this.hoverVoices=new Set();this.hoverCount=0;this.hoverCounts={};this.lastHoverKey=null;
 }
 get running(){return this.enabled&&!this.hidden&&this.context?.state==='running';}
 get state(){return !this.enabled?'muted':this.failed?'unavailable':this.running?'playing':'waiting';}
 emit(){this.onChange(this);}
 create(){
  if(this.context||this.failed)return;
  try{
   const c=this.context=this.contextFactory();this.master=c.createGain();this.master.gain.value=0;this.master.connect(c.destination);
   this.music=c.createGain();this.music.gain.value=.42;this.music.connect(this.master);
   this.effects=c.createGain();this.effects.gain.value=.65;this.effects.connect(this.master);
   this.footsteps=[0,1].map(variant=>{const samples=makeFootstepSamples(c.sampleRate,variant),buffer=c.createBuffer(1,samples.length,c.sampleRate);buffer.getChannelData(0).set(samples);return buffer;});
   const itemSamples=makeItemChimeSamples(c.sampleRate);this.itemBuffer=c.createBuffer(1,itemSamples.length,c.sampleRate);this.itemBuffer.getChannelData(0).set(itemSamples);
   c.onstatechange=()=>this.emit();
   this.loading=this.loadMusic().then(bytes=>c.decodeAudioData(bytes)).then(buffer=>{
    this.source=c.createBufferSource();this.source.buffer=buffer;this.source.loop=true;this.source.connect(this.music);
    const now=c.currentTime;this.music.gain.cancelScheduledValues(now);this.music.gain.setValueAtTime(0,now);this.music.gain.setTargetAtTime(this.audibleVideo?0:this.detail?.13:.42,now,1.4);this.source.start();this.emit();
   }).catch(()=>{this.musicFailed=true;this.emit();});
  }catch{this.failed=true;this.enabled=false;this.emit();}
 }
 async activate(){
  if(!this.enabled||this.hidden||this.failed)return false;this.create();if(!this.context)return false;
  // resume must be requested synchronously from the initiating user gesture.
  try{if(this.context.state!=='running')await this.context.resume();}catch{this.emit();return false;}
  this.mix();this.emit();return !!this.running;
 }
 async toggle(){
  const turnOn=!this.enabled;this.enabled=turnOn;
  try{this.storage.setItem('pixelcao:sound',turnOn?'on':'off');}catch{}
  if(turnOn)await this.activate();else this.mix();this.emit();
 }
 mix(){
  if(!this.context)return;if(!this.enabled||this.hidden||this.audibleVideo){this.stopItem();}if(!this.enabled||this.hidden||this.detail||this.audibleVideo){this.stopEngine();this.stopRobot();this.stopHover();}const t=this.context.currentTime;
  this.master.gain.cancelScheduledValues(t);this.master.gain.setTargetAtTime(this.running?.85:0,t,.04);
  this.music.gain.cancelScheduledValues(t);this.music.gain.setTargetAtTime(this.audibleVideo?0:this.detail?.13:.42,t,.3);
 }
 setDetail(value){this.detail=value;this.mix();}
 setAudibleVideo(value){this.audibleVideo=value;this.mix();}
 async setHidden(value){
  this.hidden=value;if(!this.context)return;
  this.mix();try{if(value)await this.context.suspend();else if(this.enabled)await this.context.resume();}catch{}
  // Recheck after await: rapid background/foreground changes must not restore stale volume.
  try{if(this.hidden&&this.context.state==='running')await this.context.suspend();}catch{}
  this.mix();this.emit();
 }
 tone(frequency,volume,length,type='sine',pan=0){
  const c=this.context,t=c.currentTime,osc=c.createOscillator(),gain=c.createGain(),panner=c.createStereoPanner();
  osc.type=type;osc.frequency.setValueAtTime(frequency,t);gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(volume,t+.006);gain.gain.exponentialRampToValueAtTime(.0001,t+length);
  panner.pan.value=pan;osc.connect(gain);gain.connect(panner);panner.connect(this.effects);osc.start(t);osc.stop(t+length+.02);osc.onended=()=>{osc.disconnect();gain.disconnect();panner.disconnect();};
 }
 async tap(){
  const requested=Date.now();if(!await this.activate()||Date.now()-requested>350)return;
  const t=this.context.currentTime;if(t-this.lastTap<.09)return;this.lastTap=t;this.tapCount++;
  this.tone(880,.09,.24,'sine',-.08);this.tone(1320,.027,.34,'sine',.08);this.emit();
 }
 stopItem(){if(!this.itemVoice)return;const {src}=this.itemVoice;this.itemVoice=null;src.stop();}
 portal(phase,token){
  const opening=phase==='opening'&&token!==this.lastPortalToken;
  if(phase==='opening')this.lastPortalToken=token;
  if(['idle','walking','casting','closing'].includes(phase))this.stopItem();
  if(!opening||!this.running||this.audibleVideo)return;
  this.stopItem();const src=this.context.createBufferSource(),gain=this.context.createGain();
  src.buffer=this.itemBuffer;gain.gain.value=.75;src.connect(gain);gain.connect(this.effects);
  const voice=this.itemVoice={src,gain};src.onended=()=>{src.disconnect();gain.disconnect();if(this.itemVoice===voice)this.itemVoice=null;};
  src.start();this.itemCount++;this.emit();
 }
 stopEngine(){
  if(!this.engine)return;const e=this.engine;this.engine=null;const t=this.context.currentTime;e.gain.gain.setTargetAtTime(0,t,.025);e.osc.stop(t+.12);e.osc.onended=()=>{e.osc.disconnect();e.filter.disconnect();e.gain.disconnect();};this.emit();
 }
 stopRobot(){if(this.robotUtterance){this.speech?.cancel();this.robotUtterance=null;}this.robotSpeaking=false;}
 speakRobot(text){
  this.stopRobot();const voice=this.speech?.getVoices().find(v=>v.localService&&/^zh(?:-|_)/i.test(v.lang));
  if(!voice||!this.Utterance)return;
  const utterance=new this.Utterance(text);utterance.voice=voice;utterance.lang=voice.lang;utterance.pitch=1.65;utterance.rate=1.65;utterance.volume=.38;
  this.robotUtterance=utterance;this.robotSpeaking=true;const finish=()=>{if(this.robotUtterance===utterance){this.robotSpeaking=false;this.robotUtterance=null;}};utterance.onend=finish;utterance.onerror=finish;
  this.speech.speak(utterance);
 }
 stopHover(){
  if(!this.context)return;const t=this.context.currentTime;
  for(const voice of this.hoverVoices){voice.gain.gain.cancelScheduledValues(t);voice.gain.gain.setTargetAtTime(0,t,.015);voice.src.stop(t+.07);}
  this.hoverVoices.clear();
 }
 playHover(id,event){
  const c=this.context,key=`${event.kind}:${event.frequency}`;
  if(!this.hoverBuffers.has(key)){const samples=makeHoverSamples(c.sampleRate,event.kind,event.frequency),buffer=c.createBuffer(1,samples.length,c.sampleRate);buffer.getChannelData(0).set(samples);this.hoverBuffers.set(key,buffer);}
  const src=c.createBufferSource(),gain=c.createGain(),panner=c.createStereoPanner();src.buffer=this.hoverBuffers.get(key);gain.gain.value=event.volume;panner.pan.value=event.pan;
  src.connect(gain);gain.connect(panner);panner.connect(this.effects);const voice={src,gain,panner};this.hoverVoices.add(voice);
  src.onended=()=>{src.disconnect();gain.disconnect();panner.disconnect();this.hoverVoices.delete(voice);};src.start();
  this.hoverCount++;this.hoverCounts[id]=(this.hoverCounts[id]||0)+1;this.hoverProject=id;this.hoverKind=event.kind;this.emit();
 }
 island({id,phase,speed=0,pitch=0,text='',time=0}){
  const allowed=this.running&&!this.detail&&!this.audibleVideo,event=hoverCue(id,time);
  if(id!==this.islandId){this.stopHover();this.lastHoverKey=null;}
  const fresh=event&&event.key!==this.lastHoverKey;
  // Consume even inaudible cues, so unmuting never replays a missed action.
  if(event)this.lastHoverKey=event.key;
  if(!allowed||id!=='bot')this.stopRobot();
  if(!allowed||id!=='brushline')this.stopEngine();
  if(!allowed||!id){this.stopHover();this.islandId=id;this.islandPhase=phase;return;}
  if(fresh&&event.age<.16)this.playHover(id,event);
  if(id==='brushline'){
   if(!this.engine){const c=this.context,osc=c.createOscillator(),filter=c.createBiquadFilter(),gain=c.createGain();osc.type='sawtooth';gain.gain.value=0;filter.type='lowpass';filter.frequency.value=500;osc.connect(filter);filter.connect(gain);gain.connect(this.effects);osc.start();this.engine={osc,filter,gain};this.emit();}
   const t=this.context.currentTime;this.engine.osc.frequency.setTargetAtTime(42+speed*65,t,.08);this.engine.gain.gain.setTargetAtTime(speed>0?.07:0,t,.05);
   if(phase==='horn'&&this.islandPhase!=='horn'){this.tone(440,.065,.35,'sine');this.tone(554,.035,.35,'sine');}
   if(phase==='drift'&&this.islandPhase!=='drift'){const src=this.context.createBufferSource(),gain=this.context.createGain();src.buffer=this.footsteps[0];gain.gain.value=.16;src.connect(gain);gain.connect(this.effects);src.start();src.onended=()=>{src.disconnect();gain.disconnect();};}
  }else if(id==='bot'&&phase==='line'){this.speakRobot(text);
  }else if(id==='bot'&&phase==='syllable'&&!this.robotSpeaking){
   this.tone(340+(pitch%4)*85,.055,.12,'triangle',-.08);this.tone(680+(pitch%3)*110,.022,.09,'sine',.08);
  }
  this.islandId=id;this.islandPhase=phase;
 }
 walk(distance,walking){
  if(!this.cadence.update(distance,walking)||!this.running)return;
  const c=this.context,t=c.currentTime;if(t-this.lastStep<.16)return;this.lastStep=t;this.stepCount++;
  const pan=this.stepCount%2?.12:-.12;
  const src=c.createBufferSource(),gain=c.createGain(),panner=c.createStereoPanner();src.buffer=this.footsteps[this.stepCount%2];gain.gain.value=.35;panner.pan.value=pan;
  src.connect(gain);gain.connect(panner);panner.connect(this.effects);src.start();src.onended=()=>{src.disconnect();gain.disconnect();panner.disconnect();};this.emit();
 }
}

const speaker='<path d="M1 6h3l4-4v12l-4-4H1z"/><path class="sound-waves" d="M10 4h2v2h-2zm2 2h2v4h-2zm-2 4h2v2h-2z"/><path class="sound-cross" d="M10 5h2v2h-2zm2 2h2v2h-2zm-2 2h2v2h-2zm4-4h2v2h-2zm0 4h2v2h-2z"/>';
export function installSound(){
 const buttons=[...document.querySelectorAll('[data-sound-toggle]')];
 const sound=new GallerySound({onChange:s=>buttons.forEach(b=>{
  b.dataset.sound=s.state;b.dataset.music=s.musicFailed?'unavailable':s.source?'ready':'loading';b.dataset.steps=String(s.stepCount);b.dataset.taps=String(s.tapCount);b.dataset.items=String(s.itemCount);
  b.dataset.hoverSounds=String(s.hoverCount);b.dataset.hoverProject=s.hoverProject||'';b.dataset.hoverKind=s.hoverKind||'';b.dataset.hoverCounts=JSON.stringify(s.hoverCounts);
  b.setAttribute('aria-pressed',String(s.enabled));b.setAttribute('aria-label',s.enabled?'关闭声音':'开启声音');b.title=s.enabled?'关闭声音':'开启声音';b.disabled=!!s.failed;
 })});
 buttons.forEach(b=>{b.innerHTML=`<svg viewBox="0 0 16 16" aria-hidden="true" shape-rendering="crispEdges">${speaker}</svg>`;b.onclick=()=>sound.toggle();});sound.emit();
 const unlock=e=>{if(e.target.closest?.('[data-sound-toggle]'))return;if(e.type==='keydown'&&(!['Enter',' '].includes(e.key)||e.repeat))return;void sound.activate();};
 document.addEventListener('pointerdown',unlock,{capture:true});document.addEventListener('keydown',unlock,{capture:true});
 document.addEventListener('click',e=>{if(e.target.closest?.('[data-sound-toggle]'))return;const control=e.target.closest?.('button,a');if(control&&!control.disabled)void sound.tap();},{capture:true});
 document.addEventListener('visibilitychange',()=>void sound.setHidden(document.hidden));
 // A muted showcase may coexist with quiet ambience; audible video gets exclusive space.
 const updateVideo=()=>sound.setAudibleVideo([...document.querySelectorAll('video')].some(v=>!v.paused&&!v.ended&&!v.muted&&v.volume>0));
 for(const event of ['play','pause','ended','volumechange'])document.addEventListener(event,updateVideo,true);
 // Start immediately where autoplay is allowed; a blocked context is resumed by
 // the existing first-interaction listener, without asking users to unmute.
 void sound.activate();
 return sound;
}
