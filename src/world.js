// The same graph supplies bridge geometry, island lanes, and traveler navigation.
export const themes = [
  {id:'ai',title:'1. AI 与开发者工具',hub:'nex',members:['nex','museum','brushline','bot']},
  {id:'games',title:'2. 游戏后台相关项目',hub:'pgos',members:['pgos','cloudgame','accelerator']},
  {id:'clients',title:'3. 客户端与数字体验',hub:'win10',members:['win10','desktop','cleaner','uwp','reader','ishowfx','xidian']},
];
const layout = {
  nex: [-10,-7,.72,'code'], museum: [-18,-14,1.08,'photos'],
  brushline: [-19,1,.36,'race'], bot: [-7,-20,1.44,'bot'],
  pgos: [0,10,.36,'servers'], cloudgame: [-8,20,0,'pong'],
  accelerator: [8,20,.72,'network'],
  win10: [12,-6,.72,'windows'], desktop: [6,-18,1.08,'desktop'],
  cleaner: [16,-19,1.44,'cleaner'], uwp: [23,-11,1.08,'feed'],
  reader: [23,1,.36,'books'], ishowfx: [16,9,0,'printer'],
  xidian: [7,4,.36,'campus'],
};
export const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
export function makeWorld(projects) {
  const stations=projects.map((p,index)=>{
    const [u,v,y,type]=layout[p.id],theme=themes.find(t=>t.members.includes(p.id));
    return {id:p.id,index,theme:theme.id,hub:theme.hub===p.id,size:theme.hub===p.id?7:5.2,
      x:(u+v)/Math.SQRT2,y,z:(v-u)/Math.SQRT2,type};
  });
  const nodes=[],edges=[],adj=[];
  const connect=(a,b,bridge=false)=>{
    const edge={id:edges.length,a,b,bridge,length:distance(nodes[a],nodes[b])};
    edges.push(edge);adj[a].push(edge.id);adj[b].push(edge.id);return edge;
  };
  stations.forEach(s=>{
    const r=s.size/2-.5;s.nodes=[];
    for(const [x,z] of [[-r,r],[-r,-r],[r,-r],[r,r]]){
      const id=nodes.length;nodes.push({id,x:s.x+x,y:s.y,z:s.z+z,station:s.index});adj.push([]);s.nodes.push(id);
    }
    s.stop=s.nodes[0];for(let i=0;i<4;i++)connect(s.nodes[i],s.nodes[(i+1)%4]);
  });
  const link=(aId,bId)=>{
    const a=stations.find(s=>s.id===aId),b=stations.find(s=>s.id===bId);
    let pair,cost=Infinity;
    for(const na of a.nodes)for(const nb of b.nodes){const d=distance(nodes[na],nodes[nb]);if(d<cost){cost=d;pair=[na,nb];}}
    connect(...pair,true);
  };
  for(const t of themes)for(const id of t.members)if(id!==t.hub)link(t.hub,id);
  link('nex','pgos');link('pgos','win10');link('win10','nex');
  return {stations,nodes,edges,adj,themes};
}
export function positionAt(world,location) {
  if(location.node!==undefined)return {...world.nodes[location.node]};
  const e=world.edges[location.edge],a=world.nodes[e.a],b=world.nodes[e.b],t=location.t;
  return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t};
}
function fromNode(world,start,goal) {
  const costs=Array(world.nodes.length).fill(Infinity),previous=[],open=new Set(world.nodes.map(n=>n.id));costs[start]=0;
  while(open.size){let u=-1;for(const id of open)if(u<0||costs[id]<costs[u])u=id;
    if(u===goal||!Number.isFinite(costs[u]))break;open.delete(u);
    for(const id of world.adj[u]){const e=world.edges[id],v=e.a===u?e.b:e.a,c=costs[u]+e.length;if(c<costs[v]){costs[v]=c;previous[v]={u,edge:id};}}
  }
  const segments=[];let cursor=goal;
  while(cursor!==start){const step=previous[cursor];if(!step)throw new Error('Disconnected exhibition path');const e=world.edges[step.edge];segments.unshift({edge:e.id,from:e.a===step.u?0:1,to:e.a===cursor?0:1});cursor=step.u;}
  return {segments,cost:costs[goal]};
}
export function shortestRoute(world,location,goal) {
  if(location.node!==undefined)return fromNode(world,location.node,goal);
  const e=world.edges[location.edge];
  const choices=[[e.a,0],[e.b,1]].map(([node,t])=>{
    const tail=fromNode(world,node,goal),prefix=Math.abs(location.t-t)>.000001?[{edge:e.id,from:location.t,to:t}]:[];
    return {segments:[...prefix,...tail.segments],cost:Math.abs(location.t-t)*e.length+tail.cost};
  });
  return choices[0].cost<=choices[1].cost?choices[0]:choices[1];
}
export class Journey {
  constructor(world){this.world=world;this.target=world.stations.findIndex(s=>s.id==='pgos');this.location={node:world.stations[this.target].stop};this.phase='idle';this.elapsed=0;this.token=0;this.speed=10;this.walked=0;this.segments=[];}
  get position(){return positionAt(this.world,this.location);}
  get remaining(){return this.segments.reduce((sum,s)=>sum+Math.abs(s.to-s.from)*this.world.edges[s.edge].length,0);}
  get direction(){const s=this.segments[0];if(!s)return null;const e=this.world.edges[s.edge],a=this.world.nodes[s.to===1?e.a:e.b],b=this.world.nodes[s.to===1?e.b:e.a];return Math.atan2(b.x-a.x,b.z-a.z);}
  visit(index,immediate=false){
    if(this.target===index&&['walking','casting','opening'].includes(this.phase))return false;
    this.target=index;this.token++;this.elapsed=0;const goal=this.world.stations[index].stop;
    if(immediate){this.location={node:goal};this.segments=[];this.phase='detail';return true;}
    const route=shortestRoute(this.world,this.location,goal);this.segments=route.segments;this.phase=route.cost<.00001?'casting':'walking';return true;
  }
  cancel(){this.token++;this.phase='idle';this.elapsed=0;this.segments=[];}
  update(dt){
    this.elapsed+=dt;
    if(this.phase==='walking'){
      let budget=this.speed*dt;
      while(budget>0&&this.segments.length){
        const s=this.segments[0],e=this.world.edges[s.edge],left=Math.abs(s.to-s.from)*e.length,step=Math.min(left,budget);
        s.from+=Math.sign(s.to-s.from)*step/e.length;budget-=step;this.walked+=step;this.location={edge:s.edge,t:s.from};
        if(left-step<.000001){this.location={node:s.to===1?e.b:e.a};this.segments.shift();}
      }
      if(!this.segments.length){this.phase='casting';this.elapsed=0;}
    }else if(this.phase==='casting'&&this.elapsed>=1.05){this.phase='opening';this.elapsed=0;}
    else if(this.phase==='opening'&&this.elapsed>=.42){this.phase='detail';this.elapsed=0;return {index:this.target,token:this.token};}
    else if(this.phase==='closing'&&this.elapsed>=.32){this.phase='idle';this.elapsed=0;}
    return null;
  }
}
