import * as T from 'three';
export class HoverExhaust {
 constructor(){
  this.group=new T.Group();this.credit=0;this.target=null;this.seed=173;
  const geometry=new T.BoxGeometry(1,1,1);
  this.particles=Array.from({length:12},()=>{
   const mesh=new T.Mesh(geometry,new T.MeshBasicMaterial({color:0xf0f1e9,transparent:true,opacity:0,depthWrite:false}));
   mesh.visible=false;this.group.add(mesh);return {mesh,age:0,life:0,origin:new T.Vector3()};
  });
 }
 random(){this.seed=(this.seed*1664525+1013904223)>>>0;return this.seed/4294967296;}
 spawn(station){
  const p=this.particles.find(p=>!p.mesh.visible);if(!p)return;
  p.age=0;p.life=1.1+this.random()*.4;p.size=.11+this.random()*.04;
  // Emit just beneath the camera-facing underside, so the slab does not hide
  // most of the short fall before the quiet particles have already faded out.
  const lateral=(this.random()-.5)*station.size*.6,front=station.size*.28;
  p.origin.set(station.x+front+lateral*.5,station.y-1.45,station.z+front-lateral*.5);
  p.dx=(this.random()-.5)*.35;p.dz=(this.random()-.5)*.35;
  p.mesh.position.copy(p.origin);p.mesh.visible=true;p.mesh.material.opacity=.5;p.mesh.scale.setScalar(p.size);
 }
 update(dt,station,enabled=true){
  if(!enabled){this.particles.forEach(p=>p.mesh.visible=false);this.credit=0;this.target=null;return;}
  if(station?.id!==this.target){this.target=station?.id;this.credit=station?1:0;}
  if(station){this.credit+=dt*6;while(this.credit>=1){this.spawn(station);this.credit--;}}
  for(const p of this.particles){if(!p.mesh.visible)continue;p.age+=dt;const u=p.age/p.life;
   if(u>=1){p.mesh.visible=false;continue;}
   p.mesh.position.set(p.origin.x+p.dx*u,p.origin.y-1.7*u-.65*u*u,p.origin.z+p.dz*u);
   p.mesh.material.opacity=.5*(1-u)**1.5;p.mesh.scale.setScalar(p.size*(1-u*.35));
  }
 }
 get activeCount(){return this.particles.filter(p=>p.mesh.visible).length;}
}
