import fs from 'node:fs';
import {makeWorld,shortestRoute} from '../src/world.js';
const root=new URL('../',import.meta.url),data=JSON.parse(fs.readFileSync(new URL('public/data/portfolio.json',root))),w=makeWorld(data.projects);
const proj=p=>({x:460+(p.x-p.z)/Math.SQRT2*16,y:400+(p.x+p.z)/Math.SQRT2*11});
let svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 860"><rect width="1000" height="860" fill="#222e32"/>';
for(const e of w.edges.filter(e=>e.bridge)){const a=proj(w.nodes[e.a]),b=proj(w.nodes[e.b]);svg+=`<path d="M${a.x},${a.y}L${b.x},${b.y}" stroke="#aaa88b" stroke-width="7"/>`;}
for(const s of w.stations){const p=proj(s);svg+=`<rect x="${p.x-(s.hub?55:35)}" y="${p.y-25}" width="${s.hub?110:70}" height="50" rx="4" fill="${s.hub?'#b39b64':'#667d70'}"/><text x="${p.x}" y="${p.y+5}" text-anchor="middle" fill="#fff4da" font-family="sans-serif" font-size="14">${s.id}</text>`;}
fs.writeFileSync(new URL('design/islands/layout.svg',root),svg+'</svg>');
let longest={distance:0};const routes=[];
for(const a of w.stations)for(const b of w.stations){const route=shortestRoute(w,{node:a.stop},b.stop);routes.push({from:a.id,to:b.id,distance:route.cost,seconds:route.cost/10});if(route.cost>longest.distance)longest=routes.at(-1);}
fs.writeFileSync(new URL('evidence/islands/routes.json',root),JSON.stringify({nodes:w.nodes.length,bridges:w.edges.filter(e=>e.bridge).length,longest,routes},null,2));
console.log({projects:w.stations.length,themes:w.themes.length,longest});
