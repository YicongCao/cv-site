// Render the same shoe-friction buffers used in the gallery, at its actual mix level.
import {makeFootstepSamples} from '../src/sound.js';
import {writeFile} from 'node:fs/promises';
const rate=32000,n=Math.floor(rate*2.5),samples=new Float32Array(n),gain=.50*.65*.85;
for(let step=0;step<8;step++){
 const foot=makeFootstepSamples(rate,step%2),offset=Math.floor((.15+step*Math.PI/12.5)*rate);
 for(let i=0;i<foot.length;i++)samples[offset+i]+=foot[i]*gain;
}
const wav=Buffer.alloc(44+n*2);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(rate,24);wav.writeUInt32LE(rate*2,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(n*2,40);
for(let i=0;i<n;i++)wav.writeInt16LE(Math.round(samples[i]*32767),44+i*2);
await writeFile(new URL('../design/sound/footsteps-preview.wav',import.meta.url),wav);
