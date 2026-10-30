// Original generative composition. Node + optional FFmpeg only for asset authoring.
// Daily builds simply copy the already-rendered audio files.
import {mkdir,writeFile,unlink} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const folder=fileURLToPath(new URL('../public/audio/',import.meta.url));await mkdir(folder,{recursive:true});
const rate=32000,duration=64,n=rate*duration,L=new Float64Array(n),R=new Float64Array(n);
const hz=m=>440*2**((m-69)/12),tau=2*Math.PI;
function note(midi,start,length,amp,pan,pad=false){
 const f=hz(midi),count=Math.floor(length*rate),offset=Math.round(start*rate);
 const left=Math.sqrt((1-pan)/2),right=Math.sqrt((1+pan)/2);
 for(let i=0;i<count;i++){
  const t=i/rate,attack=pad?Math.sin(Math.min(1,t/4)*Math.PI/2)**2:1-Math.exp(-t*180);
  const release=pad?Math.sin(Math.min(1,(length-t)/6)*Math.PI/2)**2:Math.exp(-t/1.45)*Math.min(1,(length-t)/.2);
  const fundamental=Math.sin(tau*f*t),v=pad?(fundamental*.7+Math.sin(tau*f*1.0016*t)*.2+Math.sin(tau*f*2*t)*.1):(fundamental+Math.sin(tau*f*2*t)*.25*Math.exp(-t*3)+Math.sin(tau*f*3*t)*.07*Math.exp(-t*5));
  const sample=v*attack*release*amp,index=(offset+i)%n;L[index]+=sample*left;R[index]+=sample*right;
 }
}
const chords=[[50,57,64,66],[47,54,62,69],[43,55,62,69],[45,57,64,71]];
chords.forEach((chord,k)=>chord.forEach((m,i)=>note(m,k*16,24,.035,i/3*.9-.45,true)));
// A deliberately sparse original motif, with rests between responses.
const melody=[[0,74],[3,81],[7,78],[12,76],[18,74],[23,69],[28,78],[33,71],[37,74],[43,81],[49,76],[54,78],[60,74]];
melody.forEach(([t,m],i)=>note(m,t+.7,7,.075,(i%3-1)*.4));
const dryL=L.slice(),dryR=R.slice();
// Circular, diffuse stereo reflections preserve the musical loop boundary.
for(let k=0;k<24;k++){
 const delay=Math.round((.19+k*.139+(k%3)*.027)*rate),gain=.11*Math.exp(-k/8);
 for(let i=0;i<n;i++){const j=(i+delay)%n;L[j]+=(k%2?dryR[i]:dryL[i])*gain;R[j]+=(k%2?dryL[i]:dryR[i])*gain;}
}
let peak=0,sum=0;for(let i=0;i<n;i++){peak=Math.max(peak,Math.abs(L[i]),Math.abs(R[i]));sum+=L[i]**2+R[i]**2;}
const scale=.35/peak,buffer=Buffer.alloc(44+n*4);
buffer.write('RIFF');buffer.writeUInt32LE(buffer.length-8,4);buffer.write('WAVEfmt ',8);buffer.writeUInt32LE(16,16);buffer.writeUInt16LE(1,20);buffer.writeUInt16LE(2,22);buffer.writeUInt32LE(rate,24);buffer.writeUInt32LE(rate*4,28);buffer.writeUInt16LE(4,32);buffer.writeUInt16LE(16,34);buffer.write('data',36);buffer.writeUInt32LE(n*4,40);
for(let i=0;i<n;i++){buffer.writeInt16LE(Math.round(L[i]*scale*32767),44+i*4);buffer.writeInt16LE(Math.round(R[i]*scale*32767),46+i*4);}
const wav=folder+'quiet-islands.wav';await writeFile(wav,buffer);
execFileSync('ffmpeg',['-v','error','-y','-i',wav,'-c:a','libmp3lame','-b:a','128k',folder+'quiet-islands.mp3']);await unlink(wav);
const report={title:'Quiet Islands',authorship:'Original procedural composition for pixelcao; no sampled or copied soundtrack.',duration,sampleRate:rate,channels:2,peakDb:20*Math.log10(peak*scale),rmsDb:20*Math.log10(Math.sqrt(sum/(2*n))*scale),loopBoundaryDelta:Math.max(Math.abs(L[n-1]-L[0]),Math.abs(R[n-1]-R[0]))*scale};
await writeFile(fileURLToPath(new URL('../design/sound/render.json',import.meta.url)),JSON.stringify(report,null,2)+'\n');console.log(report);
