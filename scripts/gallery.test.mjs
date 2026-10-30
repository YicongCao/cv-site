import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolveGallery} from '../src/gallery.js';
const data=JSON.parse(readFileSync(new URL('../public/data/portfolio.json',import.meta.url))),config=JSON.parse(readFileSync(new URL('../public/data/gallery.json',import.meta.url))),assets=new Map(data.assets.map(a=>[a.id,a]));
test('gallery includes exactly the seven featured projects, with photos and skills',()=>{
 const rows=resolveGallery(config,data.projects,assets);
 assert.deepEqual(rows.map(r=>r.project.id),['museum','brushline','nex','pgos','bot','accelerator','win10']);
 for(const row of rows){assert.ok(row.images.length>=1&&row.images.length<=10);assert.ok(row.skills.length>=2);assert.match(row.period,/\d{4}.*—/);for(const a of row.images)assert.match(a.src,/\.(?:jpe?g|png|gif)$/i);}
 assert.equal(rows.find(r=>r.project.id==='accelerator').images[0].original,'/media/originals/images/a249.png');
 assert.equal(rows.find(r=>r.project.id==='win10').images.length,3);
});
test('gallery caps each filmstrip and rejects missing projects or image references',()=>{
 const many={id:'nex',images:Array(12).fill('a162')};assert.equal(resolveGallery([many],data.projects,assets)[0].images.length,10);
 assert.throws(()=>resolveGallery([{id:'missing',images:[]}],data.projects,assets));
 assert.throws(()=>resolveGallery([{id:'nex',images:['missing']}],data.projects,assets));
});
