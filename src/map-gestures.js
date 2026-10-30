// Pointer state is independent of DOM targets: labels and island surfaces pan alike.
export class MapGestures {
 constructor({onChange=()=>{},onTap=()=>{},onEnd=()=>{}}={}){Object.assign(this,{onChange,onTap,onEnd});this.points=new Map();this.moved=false;}
 get active(){return this.points.size>0;}
 get pinching(){return this.points.size>1;}
 frame(){const p=[...this.points.values()];if(p.length>1)return {x:(p[0].x+p[1].x)/2,y:(p[0].y+p[1].y)/2,span:Math.hypot(p[1].x-p[0].x,p[1].y-p[0].y)};return p.length?{...p[0],span:0}:null;}
 down(id,x,y,target){if(!this.active){this.moved=false;this.start={x,y,target};}this.points.set(id,{x,y});if(this.pinching)this.moved=true;this.previous=this.frame();}
 move(id,x,y){
  if(!this.points.has(id))return;this.points.set(id,{x,y});const next=this.frame();
  if(!this.moved&&Math.hypot(x-this.start.x,y-this.start.y)>7)this.moved=true;
  if(this.moved){this.onChange({dx:next.x-this.previous.x,dy:next.y-this.previous.y,ratio:next.span&&this.previous.span?next.span/this.previous.span:1,x:next.x,y:next.y,pinching:this.pinching});}
  this.previous=next;
 }
 up(id,x,y){if(!this.points.has(id))return;if(Math.hypot(x-this.start.x,y-this.start.y)>7)this.moved=true;const tap=!this.moved&&this.points.size===1;this.points.delete(id);this.previous=this.frame();if(!this.active){if(tap)this.onTap({...this.start,x,y});this.onEnd();}}
 cancel(){this.points.clear();this.previous=null;this.moved=true;this.onEnd();}
}

export function zoomFrame(frame,ratio,anchor,width,height){
 const next=Math.max(12,Math.min(240,frame.height/ratio)),delta=(frame.height-next)/height;
 return {height:next,x:frame.x+(anchor.x-width/2)*delta,y:frame.y+(height/2-anchor.y)*delta};
}
