import {readFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {hasIcon} from '../src/icons.js';
import {resolveGallery} from '../src/gallery.js';
process.chdir(fileURLToPath(new URL('..',import.meta.url)));
const data=JSON.parse(await readFile('public/data/portfolio.json'));
const ledger=JSON.parse(await readFile('design/source-ledger.json'));
assert(!data.projects.some(p=>p.id==='kinect'));assert.equal(data.projects.length,14);assert.equal(data.assets.length,226);
assert.equal(data.projects.find(p=>p.id==='cloudgame').period,'2019');
assert(!/\d{4}/.test(data.projects.find(p=>p.id==='xidian').period));
for(const id of ['a060','a061','a062','a063']){assert(!data.assets.some(a=>a.id===id));assert(data.projects.every(p=>!p.assets.includes(id)));}
let checked=0;
async function local(url){assert(url.startsWith('/')&&!url.includes('..'));assert((await stat('public'+url)).isFile());checked++;}
for(const a of data.assets){await local(a.src);await local(a.original);if(a.preview)await local(a.preview);const hash=createHash('sha256').update(await readFile('public'+a.original)).digest('hex');assert.equal(hash,ledger.find(l=>l.id===a.id).sha256);}
for(const p of data.projects){if(p.coverSrc)await local(p.coverSrc);for(const id of p.assets)assert(data.assets.some(a=>a.id===id));assert(p.workflow?.length,`Missing sections: ${p.id}`);for(const section of p.workflow){assert(section.title.trim()&&section.text.trim());if(section.icon)assert(hasIcon(section.icon),`Unknown icon: ${section.icon}`);}}
const galleryConfig=JSON.parse(await readFile('public/data/gallery.json'));
assert.deepEqual(galleryConfig.map(p=>p.id).sort(),['museum','brushline','nex','pgos','bot','accelerator','win10'].sort());
const gallery=resolveGallery(galleryConfig,data.projects,new Map(data.assets.map(a=>[a.id,a])));
for(const [i,row] of gallery.entries()){assert(row.images.length>0&&galleryConfig[i].images.length<=10);assert(row.skills.length&&row.period);for(const entry of galleryConfig[i].images)if(typeof entry==='string')assert(row.project.assets.includes(entry));for(const image of row.images){await local(image.src);await local(image.original);}}
const resume=await readFile('public/resume/index.html','utf8');
assert(resume.indexOf('id="vibe-title"')>0&&resume.indexOf('id="vibe-title"')<resume.indexOf('id="experience-title"'));
for(const id of ['project-photomuseum','project-brushline-rally'])assert(resume.includes(`id="${id}"`),`Missing featured resume project: ${id}`);
for(const m of resume.matchAll(/(?:src|href)=["']([^"']+)["']/g)){if(/^(https?:|mailto:|tel:|#|data:|javascript:)/.test(m[1]))continue;assert(m[1].startsWith('/'),m[1]);await local(m[1]);}
for(const f of ['src/app.js','src/exhibition.js','src/index.html']){const s=await readFile(f,'utf8');assert(!s.includes('../../'));assert(!s.includes('8772'));}
console.log(JSON.stringify({projects:14,assets:226,galleryProjects:gallery.length,galleryImages:gallery.reduce((n,p)=>n+p.images.length,0),sha256:'226 verified',localReferences:checked,resume:'all links resolve'}));
