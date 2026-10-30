// Export the exact generated item sound at the gallery's effects/master mix level.
import {makeItemChimeSamples} from '../src/sound.js';
import {writeFile} from 'node:fs/promises';
const rate=32000,samples=makeItemChimeSamples(rate),gain=.75*.65*.85;
const wav=Buffer.alloc(44+samples.length*2);
wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(rate,24);wav.writeUInt32LE(rate*2,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(samples.length*2,40);
for(let i=0;i<samples.length;i++)wav.writeInt16LE(Math.round(samples[i]*gain*32767),44+i*2);
await writeFile(new URL('../design/sound/item-chime-preview.wav',import.meta.url),wav);
