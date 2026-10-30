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
 constructor({contextFactory=()=>new (window.AudioContext||window.webkitAudioContext)(),storage=globalThis.localStorage,onChange=()=>{},loadMusic=async()=>{
  const response=await fetch('/audio/quiet-islands.mp3');if(!response.ok)throw new Error('Music unavailable');return response.arrayBuffer();
 }}={}){
  Object.assign(this,{contextFactory,storage,onChange,loadMusic});
  try{this.enabled=storage.getItem('pixelcao:sound')!=='off';}catch{this.enabled=true;}
  this.hidden=false;this.detail=false;this.audibleVideo=false;this.cadence=new FootstepCadence();this.lastTap=-Infinity;this.lastStep=-Infinity;this.stepCount=0;this.tapCount=0;
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
  const turnOn=!this.enabled||!this.running;this.enabled=turnOn;
  try{this.storage.setItem('pixelcao:sound',turnOn?'on':'off');}catch{}
  if(turnOn)await this.activate();else this.mix();this.emit();
 }
 mix(){
  if(!this.context)return;const t=this.context.currentTime;
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
 walk(distance,walking){
  if(!this.cadence.update(distance,walking)||!this.running)return;
  const c=this.context,t=c.currentTime;if(t-this.lastStep<.16)return;this.lastStep=t;this.stepCount++;
  const pan=this.stepCount%2?.12:-.12;
  const src=c.createBufferSource(),gain=c.createGain(),panner=c.createStereoPanner();src.buffer=this.footsteps[this.stepCount%2];gain.gain.value=.50;panner.pan.value=pan;
  src.connect(gain);gain.connect(panner);panner.connect(this.effects);src.start();src.onended=()=>{src.disconnect();gain.disconnect();panner.disconnect();};this.emit();
 }
}

const speaker='<path d="M1 6h3l4-4v12l-4-4H1z"/><path class="sound-waves" d="M10 4h2v2h-2zm2 2h2v4h-2zm-2 4h2v2h-2z"/><path class="sound-cross" d="M10 5h2v2h-2zm2 2h2v2h-2zm-2 2h2v2h-2zm4-4h2v2h-2zm0 4h2v2h-2z"/>';
export function installSound(){
 const buttons=[...document.querySelectorAll('[data-sound-toggle]')];
 const sound=new GallerySound({onChange:s=>buttons.forEach(b=>{
  b.dataset.sound=s.state;b.dataset.music=s.musicFailed?'unavailable':s.source?'ready':'loading';b.dataset.steps=String(s.stepCount);b.dataset.taps=String(s.tapCount);
  b.setAttribute('aria-pressed',String(!!s.running));b.setAttribute('aria-label',s.running?'关闭声音':'开启声音');b.title=s.running?'关闭声音':'开启声音';b.disabled=!!s.failed;
 })});
 buttons.forEach(b=>{b.innerHTML=`<svg viewBox="0 0 16 16" aria-hidden="true" shape-rendering="crispEdges">${speaker}</svg>`;b.onclick=()=>sound.toggle();});sound.emit();
 const unlock=e=>{if(e.target.closest?.('[data-sound-toggle]'))return;if(e.type==='keydown'&&(!['Enter',' '].includes(e.key)||e.repeat))return;void sound.activate();};
 document.addEventListener('pointerdown',unlock,{capture:true});document.addEventListener('keydown',unlock,{capture:true});
 document.addEventListener('click',e=>{if(e.target.closest?.('[data-sound-toggle]'))return;const control=e.target.closest?.('button,a');if(control&&!control.disabled)void sound.tap();},{capture:true});
 document.addEventListener('visibilitychange',()=>void sound.setHidden(document.hidden));
 // A muted showcase may coexist with quiet ambience; audible video gets exclusive space.
 const updateVideo=()=>sound.setAudibleVideo([...document.querySelectorAll('video')].some(v=>!v.paused&&!v.ended&&!v.muted&&v.volume>0));
 for(const event of ['play','pause','ended','volumechange'])document.addEventListener(event,updateVideo,true);
 return sound;
}
