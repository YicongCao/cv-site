// Sound cues use the same elapsed time as the miniature animations. No timers,
// background loops or queued catch-up sounds when a frame/gesture arrives late.
const cue=(at,kind,frequency=660,pan=0,volume=.35)=>({at,kind,frequency,pan,volume});
const scores={
 museum:{loop:10,cues:[cue(0,'shutter'),cue(1.1,'glass',523,-.2),cue(2.85,'glass',659,.2),cue(4.6,'glass',784,-.2),cue(6.35,'glass',659,.2),cue(8.1,'paper')]},
 cloudgame:{loop:2/1.1,cues:[cue(0,'pong',440,-.45),cue(1/1.1,'pong',587,.45)]},
 accelerator:{loop:Math.PI*2/2.1,cues:[cue(0,'packet',880,.35),cue(Math.PI/2.1,'packet',660,-.35)]},
 xidian:{loop:5,cues:[cue(0,'unfold'),cue(3.5,'paper')]},
 ishowfx:{loop:2.4,cues:[cue(0,'shutter',660,-.2),cue(1.2,'shutter',784,.2)]},
 uwp:{loop:2.4,cues:[cue(0,'key',660,-.15),cue(.8,'key',784,0),cue(1.6,'key',880,.15)]},
 reader:{loop:Math.PI,cues:[cue(Math.PI/4,'paper'),cue(Math.PI*3/4,'paper')]},
 cleaner:{loop:1/.6,cues:[cue(0,'tidy',784,-.2),cue(.55,'tidy',988,0),cue(1.1,'tidy',1175,.2)]},
 pgos:{loop:1/.65,cues:[cue(0,'link',392,-.2),cue(.33/.65,'link',494,0),cue(.66/.65,'link',587,.2)]},
 win10:{loop:4,cues:[...Array.from({length:4},(_,i)=>cue(i*.12,'tile',[523,659,784,1047][i],(i-1.5)*.1,.28)),cue(2.6,'close',523)]},
 desktop:{loop:2,cues:[cue(0,'transfer',659,-.25),cue(1,'link',880,.25)]},
 nex:{loop:1/.6,cues:[cue(0,'key',587,-.15),cue(.25,'key',659,.1),cue(.5,'key',784,-.1),cue(.8,'key',659,.15),cue(1.1,'key',880,0)]},
};
export const hoverSoundProjects=Object.keys(scores);
export function hoverCue(id,time){
 const score=scores[id];if(!score||!Number.isFinite(time)||time<0)return null;
 const cycle=Math.floor(time/score.loop),t=time-cycle*score.loop;
 let index=score.cues.findLastIndex(c=>c.at<=t+1e-8),loop=cycle;
 if(index<0){if(!cycle)return null;index=score.cues.length-1;loop--;}
 const event=score.cues[index];return {...event,key:`${id}:${loop}:${index}`,age:time-(loop*score.loop+event.at)};
}
const recipes={
 key:[.065,.03,0,'triangle'],pong:[.095,.02,0,'sine'],
 glass:[.42,0,0,'glass'],packet:[.18,0,1,'sine'],
 link:[.22,0,.35,'glass'],transfer:[.28,.015,1,'sine'],
 tile:[.18,0,.15,'glass'],close:[.22,.02,-.6,'sine'],
 tidy:[.23,.15,1,'sine'],shutter:[.12,.8,0,'none'],
 paper:[.28,.65,0,'none'],unfold:[.42,.65,0,'none'],
};
// Original tiny foley/chiptone palette; friction is band-limited, never a
// continuous noise bed. Quiet attack/release prevents clicks at buffer edges.
export function makeHoverSamples(rate,kind,frequency=660){
 const [length,noise,sweep,wave]=recipes[kind],samples=new Float32Array(Math.ceil(rate*length));
 let seed=1979,low=0,slow=0,phase=0;
 const a=1-Math.exp(-2*Math.PI*2400/rate),b=1-Math.exp(-2*Math.PI*550/rate);
 for(let i=0;i<samples.length;i++){
  const t=i/rate,u=t/length;seed=(seed*1664525+1013904223)>>>0;
  low+=a*(seed/4294967296*2-1-low);slow+=b*(low-slow);
  phase+=Math.PI*2*frequency*(1+sweep*u*.5)/rate;
  const tonal=wave==='none'?0:wave==='triangle'?2/Math.PI*Math.asin(Math.sin(phase)):wave==='glass'?.7*Math.sin(phase)+.2*Math.sin(phase*2)+.1*Math.sin(phase*3):Math.sin(phase);
  const friction=kind==='shutter'?Math.exp(-(((u-.15)/.09)**2))+.55*Math.exp(-(((u-.55)/.12)**2)):Math.sin(Math.PI*u)**2;
  const envelope=Math.min(1,t/.008)*Math.min(1,(length-t)/.025);
  samples[i]=envelope*(tonal*.32*Math.exp(-u*5)+noise*(low-slow)*friction*.9);
 }
 return samples;
}
