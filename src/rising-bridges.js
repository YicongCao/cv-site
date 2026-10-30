import * as T from 'three';
import {BridgeState} from './bridge-state.js';
import {box,color} from './models.js';
export class RisingBridges {
 constructor(world){
  this.state=new BridgeState(world);this.group=new T.Group();this.tiles=[];
  for(const lane of this.state.lanes){
   const {edge}=lane,a=world.nodes[edge.a],b=world.nodes[edge.b];
   const angle=Math.atan2(b.x-a.x,b.z-a.z),length=Math.hypot(b.x-a.x,b.z-a.z);
   for(const tile of lane.tiles){
    const t=(tile.from+tile.to)/2,g=new T.Group();this.group.add(g);
    const slab=box(g,0,-.18,0,1.06,.36,length/lane.tiles.length+.018,color.stone);
    slab.material=slab.material.clone();slab.material.transparent=true;
    const seam=box(g,0,.006,-length/lane.tiles.length/2,1.06,.018,.035,color.gold);
    seam.material=seam.material.clone();seam.material.transparent=true;
    g.rotation.y=angle;g.visible=false;
    this.tiles.push({tile,group:g,slab,seam,x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t});
   }
  }
 }
 update(dt,journey,reduced){this.state.update(dt,journey,reduced);}
 render(){
  for(const {tile,group,slab,seam,x,y,z} of this.tiles){
   const p=tile.lift,ease=p*p*(3-2*p);group.visible=p>0;
   group.position.set(x,y-(1-ease)*3.2,z);slab.material.opacity=Math.min(1,p*2);
   slab.material.depthWrite=p>.5;seam.visible=tile.wanted&&p<1;
   seam.material.opacity=Math.sin(p*Math.PI)*.6;
  }
 }
}
