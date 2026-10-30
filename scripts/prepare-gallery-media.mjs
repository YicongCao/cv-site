// One-time still extraction; ordinary builds do not require FFmpeg or source repositories.
import {execFileSync} from 'node:child_process';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
process.chdir(fileURLToPath(new URL('..',import.meta.url)));
await mkdir('public/media/gallery',{recursive:true});const sources=[];
for(const [project,asset,seconds] of [['brushline','a144',[3,15,27,39,51,65]],['museum','a175',[2,10,18,27,36,45]]]){
 for(const [i,second] of seconds.entries()){
  const src=`public/media/originals/videos/${asset}.mp4`,file=`${project}-${i+1}.jpg`;
  execFileSync('ffmpeg',['-v','error','-y','-ss',String(second),'-i',src,'-frames:v','1','-vf','scale=1280:-2','-q:v','3',`public/media/gallery/${file}`]);
  sources.push({project,sourceAsset:asset,second,src:`/media/gallery/${file}`});
 }
}
const data=JSON.parse(await readFile('public/data/portfolio.json')),config=JSON.parse(await readFile('public/data/gallery.json'));
for(const row of config)for(const asset of row.images.filter(image=>typeof image==='string')){
 const a=data.assets.find(a=>a.id===asset),file=`${row.id}-${asset}.jpg`;
 execFileSync('ffmpeg',['-v','error','-y','-i','public'+a.original,'-frames:v','1','-vf',"scale=w='min(1280,iw)':h='min(960,ih)':force_original_aspect_ratio=decrease",'-q:v','2',`public/media/gallery/${file}`]);
 sources.push({project:row.id,sourceAsset:asset,src:`/media/gallery/${file}`});
}
await writeFile('design/gallery-stills.json',JSON.stringify(sources,null,2)+'\n');
console.log(`Prepared ${sources.length} gallery stills`);
