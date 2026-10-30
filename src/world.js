// Single source for walkable surfaces, chronological stations and route sampling.
export const exhibits=['race','photos','code','servers','pong','bot','network','desktop','cleaner','windows','feed','books','bike','printer','campus'];
export function makeWorld(projects){
  const stations=projects.map((p,i)=>({id:p.id,index:i,type:exhibits[i],x:i%2?3.4:0,y:[0,.36,.72,.36,0][i%5],z:-i*5.8}));
  const points=[];const stops=[];
  // A lane along the LEFT/front edge avoids every exhibit. Doglegs and stairs are real geometry.
  stations.forEach((s,i)=>{
    const stand={x:s.x-1.5,y:s.y,z:s.z+1.25};
    if(i){const prev=stations[i-1],last=points.at(-1);const a={x:last.x,y:prev.y,z:prev.z-2.5};const b={x:stand.x,y:s.y,z:s.z+2.5};points.push(a);
      for(let k=1;k<=8;k++){const t=k/8;points.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t});}
    }
    points.push(stand);stops.push(points.length-1);
  });
  let distance=0;points.forEach((p,i)=>{if(i){const q=points[i-1];distance+=Math.hypot(p.x-q.x,p.y-q.y,p.z-q.z);}p.d=distance;});
  stations.forEach((s,i)=>{s.stop=points[stops[i]];s.distance=s.stop.d;});
  return {stations,points,length:distance};
}
export function sampleRoute(world,d){
  d=Math.max(0,Math.min(world.length,d));let i=1;while(i<world.points.length-1&&world.points[i].d<d)i++;
  const a=world.points[i-1],b=world.points[i],t=(d-a.d)/(b.d-a.d||1);
  return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t,angle:Math.atan2(b.x-a.x,b.z-a.z),segment:i};
}
export class Journey {
  constructor(world){this.world=world;this.distance=0;this.target=0;this.phase='idle';this.elapsed=0;this.token=0;this.speed=12.5;}
  visit(index,immediate=false){if(this.target===index&&['walking','casting','opening'].includes(this.phase))return false;this.target=index;this.token++;this.elapsed=0;this.phase=immediate?'detail':Math.abs(this.distance-this.world.stations[index].distance)<.01?'casting':'walking';if(immediate)this.distance=this.world.stations[index].distance;return true;}
  cancel(){this.token++;this.phase='idle';this.elapsed=0;}
  update(dt){
    this.elapsed+=dt;
    if(this.phase==='walking'){const goal=this.world.stations[this.target].distance,delta=goal-this.distance;const step=Math.sign(delta)*Math.min(Math.abs(delta),this.speed*dt);this.distance+=step;if(Math.abs(goal-this.distance)<.001){this.phase='casting';this.elapsed=0;}}
    else if(this.phase==='casting'&&this.elapsed>=1.05){this.phase='opening';this.elapsed=0;}
    else if(this.phase==='opening'&&this.elapsed>=.42){this.phase='detail';this.elapsed=0;return {index:this.target,token:this.token};}
    else if(this.phase==='closing'&&this.elapsed>=.32){this.phase='idle';this.elapsed=0;}
    return null;
  }
}
