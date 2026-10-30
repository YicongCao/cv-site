import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolveArticles,articleCards} from '../src/articles.js';
import {makeWorld,themes,Journey,shortestRoute} from '../src/world.js';
import {hasIcon} from '../src/icons.js';

const data=JSON.parse(readFileSync(new URL('../public/data/portfolio.json',import.meta.url))),assets=new Map(data.assets.map(a=>[a.id,a]));
test('five supplied screenshots map to their exact article URLs and both destinations',()=>{
 const expected=[['487077','a257','pgos','km-compiler'],['408159','a258','bot','km-bot'],['404906','a259','bot','km-bot'],['392451','a260','bot','km-bot'],['379323','a261','accelerator','km-network']];
 assert.equal(data.articles.length,5);
 for(const [number,image,project,island] of expected){
  const article=data.articles.find(a=>a.id==='km-'+number);assert.equal(article.url,'https://km.woa.com/articles/show/'+number);assert.equal(article.image,image);assert.equal(article.project,project);
  for(const id of [project,island]){const p=data.projects.find(p=>p.id===id),resolved=resolveArticles(p,data.articles,assets);assert(resolved.some(a=>a.id===article.id&&a.image===assets.get(image)));const markup=articleCards(p,data.articles,assets);assert(markup.includes(`href="${article.url}" target="_blank" rel="noopener"`));assert(markup.includes(`src="${assets.get(image).src}"`));}
 }
});
test('KM theme contains three distinct sculptures and concise article-only details',()=>{
 const theme=themes.find(t=>t.id==='km'),world=makeWorld(data.projects);assert.equal(theme.title,'4. 古法手作 KM 头条好文');assert.equal(theme.members.length,3);
 assert.deepEqual(theme.members.map(id=>world.stations.find(s=>s.id===id).type),['compiler','spellbook','nat']);
 assert.deepEqual(theme.members.map(id=>data.projects.find(p=>p.id===id).articles.length),[1,3,1]);
 for(const id of theme.members){const p=data.projects.find(p=>p.id===id);assert(p.articleOnly);assert(!p.workflow?.length);assert(hasIcon(id));}
});
test('article cards reject unexpected URLs and escape visible content',()=>{
 const p={id:'km-compiler',articleOnly:true,articles:['test']},a={id:'test',title:'<script> & "',image:'a257',url:'javascript:alert(1)'};
 assert.equal(articleCards(p,[a],assets),'');a.url='https://km.woa.com/articles/show/1';const html=articleCards(p,[a],assets);assert(!html.includes('<script>'));assert(html.includes('&lt;script&gt; &amp; &quot;'));
});

test('KM is a separate lower-right island group; the traveler cannot walk or teleport there',()=>{
 const world=makeWorld(data.projects),j=new Journey(world),position=j.position,phase=j.phase;
 const km=world.stations.filter(s=>s.theme==='km');assert.equal(km.length,3);
 for(const station of km){assert.equal(station.walkable,false);assert(station.x-station.z>26*Math.SQRT2);assert(station.x+station.z>=20*Math.SQRT2-1e-8);assert.equal(j.visit(station.index),false);assert.equal(j.visit(station.index,true),false);assert.deepEqual(j.position,position);assert.equal(j.phase,phase);assert.throws(()=>shortestRoute(world,j.location,station.stop),/Disconnected/);}
 for(const e of world.edges){const a=world.stations[world.nodes[e.a].station],b=world.stations[world.nodes[e.b].station];assert.equal(a.theme==='km',b.theme==='km','no physical bridge may connect the KM group to the main world');}
});
