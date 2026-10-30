// Navigation and rendering share these tile intervals. A tile must be fully docked
// before the traveler's swept footprint may enter it, including after a reversal.
const clamp=x=>Math.max(0,Math.min(1,x));
const overlaps=(tile,lo,hi)=>tile.to>=lo-1e-8&&tile.from<=hi+1e-8;
export class BridgeState {
 constructor(world){
  this.world=world;this.time=0;
  this.lanes=world.edges.filter(e=>e.shortcut).map(edge=>{
   const count=Math.ceil(edge.length/.8);
   return {edge,direction:0,age:0,origin:0,occupied:false,
    tiles:Array.from({length:count},(_,i)=>({from:i/count,to:(i+1)/count,lift:0,wanted:false,lowerAt:0}))};
  });
  this.byEdge=new Map(this.lanes.map(l=>[l.edge.id,l]));
 }
 approach(journey){
  const result=new Map();let distance=0;
  if(journey.phase==='walking')for(const s of journey.segments){
   if(this.byEdge.has(s.edge)&&distance<=3)result.set(s.edge,s);
   distance+=Math.abs(s.to-s.from)*this.world.edges[s.edge].length;
  }
  return result;
 }
 update(dt,journey,reduced=false){
  this.time+=dt;const approach=this.approach(journey);
  for(const lane of this.lanes){
   const {edge,tiles}=lane,segment=approach.get(edge.id);
   lane.occupied=journey.location.edge===edge.id;
   const at=lane.occupied?journey.location.t:null;
   const direction=segment?Math.sign(segment.to-segment.from):0;
   if(direction&&direction!==lane.direction){lane.direction=direction;lane.lastDirection=direction;lane.age=0;lane.origin=segment.from;}
   if(segment)lane.age+=dt;else lane.direction=0;
   const releases=[];
   for(let i=0;i<tiles.length;i++){
    const tile=tiles[i],support=at!==null&&overlaps(tile,at-.85/edge.length,at+.85/edge.length);
    const ahead=segment&&overlaps(tile,Math.min(segment.from,segment.to),Math.max(segment.from,segment.to));
    const order=Math.max(0,direction>0?i-lane.origin*tiles.length:lane.origin*tiles.length-i-1);
    const wanted=!!support||!!(ahead&&lane.age>=order*.045);
    if(tile.wanted&&!wanted)releases.push(tile);
    tile.wanted=wanted;
   }
   if(lane.lastDirection<0)releases.reverse();
   releases.forEach((tile,i)=>tile.lowerAt=this.time+.16+i*.045);
   for(const tile of tiles){
    if(reduced){tile.lift=lane.occupied&&overlaps(tile,at-.85/edge.length,at+.85/edge.length)?1:0;continue;}
    if(tile.wanted)tile.lift=clamp(tile.lift+dt/.48);
    else if(this.time>=tile.lowerAt)tile.lift=clamp(tile.lift-dt/.6);
   }
  }
 }
 canTraverse(edge,from,to){
  const lane=this.byEdge.get(edge.id);if(!lane)return true;
  const margin=.38/edge.length;
  return lane.tiles.every(tile=>!overlaps(tile,Math.min(from,to)-margin,Math.max(from,to)+margin)||tile.lift>=1-1e-8);
 }
 focusEdge(journey){
  if(journey.phase!=='walking')return null;
  if(this.byEdge.has(journey.location.edge))return this.world.edges[journey.location.edge];
  const next=this.approach(journey).keys().next().value;return next===undefined?null:this.world.edges[next];
 }
 get moving(){return this.lanes.some(l=>l.tiles.some(t=>t.wanted?t.lift<1:t.lift>0));}
 snapshot(journey){return this.lanes.map(l=>({id:l.edge.shortcut,visible:l.tiles.filter(t=>t.lift>0).length,
  ready:l.tiles.filter(t=>t.lift>=1-1e-8).length,total:l.tiles.length,occupied:journey.location.edge===l.edge.id,
  rising:l.tiles.filter(t=>t.wanted&&t.lift>0&&t.lift<1).length,falling:l.tiles.filter(t=>!t.wanted&&t.lift>0).length,
  supported:journey.location.edge!==l.edge.id||this.canTraverse(l.edge,journey.location.t,journey.location.t)}));}
}
