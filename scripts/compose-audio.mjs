// Original generative composition. Node + optional FFmpeg only for asset authoring.
// Daily builds simply copy the already-rendered audio files.
import {mkdir,writeFile,unlink} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const folder=fileURLToPath(new URL('../public/audio/',import.meta.url));await mkdir(folder,{recursive:true});
const rate=32000,duration=64,n=rate*duration,L=new Float64Array(n),R=new Float64Array(n);
const hz=m=>440*2**((m-69)/12),tau=2*Math.PI;
// Additive struck-string piano: fast hammer attack, slightly inharmonic strings,
// and faster decay for upper partials. No noise layer or sustained pad.
function piano(midi,start,amp=0.08){
 const f=hz(midi),length=midi<55?5.5:4.2,count=Math.floor(length*rate),offset=Math.round(start*rate);
 const pan=Math.max(-.5,Math.min(.5,(midi-65)/40)),left=Math.sqrt((1-pan)/2),right=Math.sqrt((1+pan)/2);
 const wave=new Float64Array(count),decay=midi<55?1.8:1.35;
 for(let partial=1;partial<=10;partial++){
  const frequency=f*partial*Math.sqrt(1+.00012*partial*partial),weight=1/partial**1.8;
  for(let i=0;i<count;i++){const t=i/rate;wave[i]+=Math.sin(tau*frequency*t)*weight*Math.exp(-t*(1+(partial-1)*.7)/decay);}
 }
 for(let i=0;i<count;i++){
  const t=i/rate,attack=1-Math.exp(-t*650),release=Math.min(1,(length-t)/.15),v=wave[i]*attack*release*amp,index=(offset+i)%n;
  L[index]+=v*left;R[index]+=v*right;
 }
}
const chords=[[50,57,62,66],[47,54,62,69],[43,55,62,67],[45,57,64,71]];
chords.forEach((chord,k)=>{
 for(const bar of [0,8]){piano(chord[0],k*16+bar,.095);piano(chord[1],k*16+bar+2,.055);piano(chord[2],k*16+bar+4,.06);piano(chord[3],k*16+bar+6,.05);}
});
const melody=[[1,74],[3,81],[5,78],[7,76],[10,74],[13,76],[17,74],[20,69],[23,78],[27,76],[30,74],[33,71],[36,74],[39,79],[43,81],[46,78],[49,76],[52,78],[55,81],[58,76],[61,74]];
melody.forEach(([t,m],i)=>piano(m,t,i%3===0?.11:.085));
// Only a quiet, short room reflection, with silence between piano gestures.
const dryL=L.slice(),dryR=R.slice();
for(const [seconds,gain] of [[.043,.045],[.079,.025],[.131,.012]]){
 const delay=Math.round(seconds*rate);
 for(let i=0;i<n;i++){const j=(i+delay)%n;L[j]+=dryR[i]*gain;R[j]+=dryL[i]*gain;}
}
let peak=0,sum=0;for(let i=0;i<n;i++){peak=Math.max(peak,Math.abs(L[i]),Math.abs(R[i]));sum+=L[i]**2+R[i]**2;}
const scale=.35/peak,buffer=Buffer.alloc(44+n*4);
buffer.write('RIFF');buffer.writeUInt32LE(buffer.length-8,4);buffer.write('WAVEfmt ',8);buffer.writeUInt32LE(16,16);buffer.writeUInt16LE(1,20);buffer.writeUInt16LE(2,22);buffer.writeUInt32LE(rate,24);buffer.writeUInt32LE(rate*4,28);buffer.writeUInt16LE(4,32);buffer.writeUInt16LE(16,34);buffer.write('data',36);buffer.writeUInt32LE(n*4,40);
for(let i=0;i<n;i++){buffer.writeInt16LE(Math.round(L[i]*scale*32767),44+i*4);buffer.writeInt16LE(Math.round(R[i]*scale*32767),46+i*4);}
const wav=folder+'quiet-islands.wav';await writeFile(wav,buffer);
execFileSync('ffmpeg',['-v','error','-y','-i',wav,'-c:a','libmp3lame','-b:a','128k',folder+'quiet-islands.mp3']);await unlink(wav);
const report={title:'Quiet Islands — Piano',instrument:'Original synthesized struck-string piano; no noise bed or ambient pad',authorship:'Original procedural composition for pixelcao; no sampled or copied soundtrack.',duration,sampleRate:rate,channels:2,peakDb:20*Math.log10(peak*scale),rmsDb:20*Math.log10(Math.sqrt(sum/(2*n))*scale),loopBoundaryDelta:Math.max(Math.abs(L[n-1]-L[0]),Math.abs(R[n-1]-R[0]))*scale};
await writeFile(fileURLToPath(new URL('../design/sound/render.json',import.meta.url)),JSON.stringify(report,null,2)+'\n');console.log(report);
