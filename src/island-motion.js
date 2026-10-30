import * as T from 'three';
const TAU=Math.PI*2,clamp=T.MathUtils.clamp,ease=x=>{x=clamp(x,0,1);return x*x*(3-2*x);};
export const botLines=['你好','什么是喷气背包？','去哪获取铁矿石'];
export function botFrame(time){
 const total=botLines.reduce((s,line)=>s+(line.length-1)*.14+.46,0);let t=time%total;
 for(let i=0;i<botLines.length;i++){const line=botLines[i],duration=(line.length-1)*.14+.46;if(t<duration){const typing=(line.length-1)*.14;return {index:i,count:Math.min(line.length,Math.floor(t/.14)+1),text:t<typing+.30?line.slice(0,Math.floor(t/.14)+1):'',speaking:t<typing};}t-=duration;}
}
export function rallyFrame(time){
 const t=time%8;let angle,speed,drift=0,phase;
 if(t<4){angle=t/4*TAU;speed=1;phase='drive';}
 else if(t<5.1){const u=(t-4)/1.1;angle=TAU+ease(u)*Math.PI/2;speed=1-u;drift=Math.sin(Math.PI*u)*.8;phase='drift';}
 else{angle=TAU+Math.PI/2;speed=0;phase=t<5.55?'stop':t<6.05?'horn':'rest';}
 // Return along the last quarter before the next lap, without teleporting.
 if(t>6.5){const u=ease((t-6.5)/1.5);angle=TAU+Math.PI/2+u*Math.PI*1.5;speed=Math.sin(Math.PI*u)*.6;phase='return';}
 return {x:1.05*Math.sin(angle),z:.82*Math.cos(angle),heading:Math.atan2(1.05*Math.cos(angle),-.82*Math.sin(angle))-drift,speed,phase};
}
export function pongFrame(time){
 const q=time*1.1,leg=Math.floor(q),u=q-leg;
 const targets=[-.25,.26,-.12,.20,-.28,.08],a=targets[leg%targets.length],b=targets[(leg+1)%targets.length];
 return {x:(leg%2?1-u:u)*1.84-.92,y:T.MathUtils.lerp(a,b,u),left:leg%2?b:a,right:leg%2?a:b};
}
// Canvas pixels form the miniature artwork; text remains in the Ark Pixel HTML layer.
export function photoCanvas(i){const c=document.createElement('canvas');c.width=72;c.height=96;const x=c.getContext('2d');x.fillStyle='#e6d9b2';x.fillRect(0,0,72,96);x.fillStyle=['#8eb3af','#c4a384','#93a4ba'][i%3];x.fillRect(4,4,64,88);x.fillStyle='#e9d6a0';x.fillRect(44,16,12,12);x.fillStyle=['#607969','#7c7768','#677d93'][i%3];for(let k=0;k<8;k++)x.fillRect(k*10,48-(k%3)*8,12,48);x.fillStyle='#485f59';for(let k=0;k<6;k++)x.fillRect(k*14,66-(k%2)*12,16,40);return c;}
const texture=c=>{const t=new T.CanvasTexture(c);t.magFilter=t.minFilter=T.NearestFilter;t.colorSpace=T.SRGBColorSpace;return t;};
export function makePhotoPanels(){
 const group=new T.Group(),panels=[];
 for(let i=0;i<3;i++){const geometry=new T.PlaneGeometry(.74,1,24,8),mesh=new T.Mesh(geometry,new T.MeshBasicMaterial({map:texture(photoCanvas(i)),side:T.DoubleSide}));mesh.userData.flat=geometry.attributes.position.array.slice();group.add(mesh);panels.push(mesh);}
 group.userData.dynamic=true;return {group,panels,update(time){
  const t=time%10,bend=ease(t/1.1)*(1-ease((t-8.1)/1.1)),turn=ease((t-1.1)/7)*TAU*2;
  for(let i=0;i<3;i++){const mesh=panels[i],p=mesh.geometry.attributes.position,b=mesh.userData.flat;
   for(let j=0;j<p.count;j++){const k=j*3,angle=(i-1)*TAU/3+b[k]/.74*1.72+turn;
    p.setXYZ(j,T.MathUtils.lerp(b[k]+(i-1)*.86,Math.sin(angle)*.86,bend),1.05+b[k+1]*(1+bend*.35),T.MathUtils.lerp(-.39,Math.cos(angle)*.86,bend));}
   p.needsUpdate=true;mesh.geometry.computeBoundingSphere();
  }return bend;
 }};
}
export function makeFlowScreen(){
 const canvas=document.createElement('canvas');canvas.width=192;canvas.height=144;const ctx=canvas.getContext('2d'),map=texture(canvas),photos=[0,1,2].map(photoCanvas);
 const group=new T.Group();group.userData.dynamic=true;const border=new T.Mesh(new T.BoxGeometry(2.7,2.04,.12),new T.MeshBasicMaterial({color:0xeee6cb}));group.add(border);
 const mesh=new T.Mesh(new T.PlaneGeometry(2.56,1.92),new T.MeshBasicMaterial({map,side:T.DoubleSide}));mesh.position.z=.07;group.add(mesh);group.position.set(0,2,-.65);
 return {group,update(time){ctx.fillStyle='#293c3d';ctx.fillRect(0,0,192,144);ctx.save();ctx.beginPath();ctx.rect(0,0,192,144);ctx.clip();const tx=(time*10)%396,ty=(time*30)%258;
  for(let col=Math.floor(tx/66)-2;col<Math.floor(tx/66)+5;col++)for(let row=Math.floor(ty/86)-2;row<Math.floor(ty/86)+5;row++){const x=col*66-tx,y=row*86-ty+((col%2+2)%2)*28;ctx.drawImage(photos[((row+col)%3+3)%3],x,y,58,77);}ctx.restore();map.needsUpdate=true;}};
}
export class IslandMotion {
 constructor({element,islands,world,onSound}){Object.assign(this,{element,islands,world,onSound});this.active=-1;this.elapsed=0;this.lastSpeech='';this.lastLine=-1;
  this.bubble=document.createElement('div');this.bubble.className='bot-bubble';this.bubble.hidden=true;this.bubble.setAttribute('aria-hidden','true');element.append(this.bubble);
 }
 update(dt,index,camera,width,height){
  if(index!==this.active){if(this.active>=0)this.reset(this.active);this.active=index;this.elapsed=0;this.lastSpeech='';this.lastLine=-1;this.onSound?.({id:null});}
  this.bubble.hidden=true;if(index<0)return;this.elapsed+=dt;const station=this.world.stations[index],island=this.islands[index].group,ref=island.userData.motion,t=this.elapsed;
  const g=ref.exhibit;let phase='active';
  if(station.id==='brushline'){const f=rallyFrame(t);ref.car.position.set(f.x,.0,f.z);ref.car.rotation.y=f.heading-Math.PI/2;phase=f.phase;ref.dust.visible=phase==='drift';ref.dust.children.forEach((p,i)=>{p.position.set(f.x-Math.sin(f.heading)*(.2+i*.12),.13+i*.02,f.z-Math.cos(f.heading)*(.2+i*.12));p.scale.setScalar(.09+Math.sin(t*12+i)*.02);});this.onSound?.({id:'brushline',phase,speed:f.speed});}
  else if(station.id==='museum'){const bend=ref.photos.update(t);ref.wall.visible=bend<.05;}
  else if(station.id==='cloudgame'){const f=pongFrame(t);ref.ball.position.set(f.x,1.18+f.y,-.28);ref.paddles[0].position.y=1.18+f.left;ref.paddles[1].position.y=1.18+f.right;}
  else if(station.id==='bot'){
   const f=botFrame(t),key=f.index+':'+f.count;g.position.y=ref.y+Math.sin(t*7)*.035;g.rotation.z=Math.sin(t*5)*.035;
   this.bubble.textContent=f.text;const s=new T.Vector3(station.x,station.y+3.2,station.z).project(camera);this.bubble.style.left=`${(s.x*.5+.5)*width}px`;this.bubble.style.top=`${(.5-s.y*.5)*height}px`;this.bubble.hidden=!f.text;const half=this.bubble.offsetWidth/2+8;this.bubble.style.left=`${clamp((s.x*.5+.5)*width,half,width-half)}px`;this.bubble.style.top=`${Math.max(55,(.5-s.y*.5)*height)}px`;
   if(f.index!==this.lastLine){this.lastLine=f.index;this.onSound?.({id:'bot',phase:'line',text:botLines[f.index]});}
   if(f.speaking&&key!==this.lastSpeech){this.lastSpeech=key;this.onSound?.({id:'bot',phase:'syllable',pitch:f.count});}
  }
  else if(station.id==='accelerator'){const a=t*2.1;ref.packet.visible=true;ref.packet.position.set(Math.cos(a)*1.12,Math.sin(a)*.47,Math.sin(a)*1.05);}
  else if(station.id==='xidian'){const open=ease((t%5)/1)*(1-ease(((t%5)-3.5)/1));ref.map.visible=open>.01;ref.map.scale.setScalar(Math.max(.01,open));ref.map.children.forEach((p,i)=>p.rotation.y=(i-1)*(1-open)*1.4);}
  else if(station.id==='ishowfx'||station.id==='uwp'){ref.flow.group.visible=true;ref.flow.update(t);}
  else if(station.id==='kinect'){ref.wheels.forEach(w=>w.rotation.z=t*5);ref.pedal.rotation.z=-t*5;ref.sensor.scale.setScalar(.15*(1+Math.sin(t*5)*.12));}
  else if(station.id==='reader'){ref.page.rotation.y=Math.sin(t*2)*1.35;}
  else if(station.id==='cleaner'){ref.bits.forEach((p,i)=>{const u=(t*.6+i*.23)%1;p.position.set((i%3-1)*.8,.2+Math.sin(u*Math.PI)*1.1,.9*(1-u));p.scale.copy(p.userData.homeScale).multiplyScalar(Math.max(.04,1-u));p.rotation.z=u*2;});}
  else if(station.id==='pgos'){ref.nodes.forEach((p,i)=>{const u=(t*.65+i*.33)%1;p.position.set((i-1)*.8*(1-u),.3+Math.sin(u*Math.PI)*.8,.95-u*1.2);p.scale.copy(p.userData.homeScale).multiplyScalar(1-u*.45);});}
  else if(station.id==='win10'){ref.tiles.forEach((p,i)=>{const u=t%4,open=ease((u-i*.06)/.7)*(1-ease((u-2.6)/.7));p.scale.copy(p.userData.homeScale).multiplyScalar(Math.max(.001,open));p.position.y=1+Math.floor(i/3)*.28+open*.1;});}
  else if(station.id==='desktop'){const u=(t%2)/2;ref.sync.visible=true;ref.sync.position.set(-.4+u*1.4,1.25+Math.sin(u*Math.PI)*.65,.4);ref.sync.rotation.y=t*3;}
  else if(station.id==='nex'){ref.cursor.visible=true;ref.cursor.position.y=1.65-(t*.6%1)*.75;ref.cursor.scale.x=.5+(Math.sin(t*6)+1)*.3;}
  this.element.dataset.hoverProject=station.id;this.element.dataset.hoverTime=t.toFixed(2);this.element.dataset.hoverPhase=phase;
 }
 reset(index){const ref=this.islands[index].group.userData.motion;if(!ref)return;ref.exhibit.position.y=ref.y;ref.exhibit.rotation.z=0;
  if(ref.car){ref.car.position.set(.25,0,.83);ref.car.rotation.y=0;ref.dust.visible=false;}
  if(ref.photos){ref.photos.update(0);ref.wall.visible=true;}
  if(ref.ball){ref.ball.position.set(.14,1.28,-.28);ref.paddles.forEach(p=>p.position.y=1.18);}
  for(const key of ['packet','map','sync','cursor'])if(ref[key])ref[key].visible=false;
  if(ref.flow){ref.flow.group.visible=false;ref.flow.update(0);}
  if(ref.wheels)ref.wheels.forEach(w=>w.rotation.z=0);if(ref.pedal)ref.pedal.rotation.z=0;if(ref.sensor)ref.sensor.scale.setScalar(.15);
  if(ref.page)ref.page.rotation.y=0;
  for(const key of ['bits','nodes','tiles'])if(ref[key])ref[key].forEach(p=>{p.position.copy(p.userData.home);p.rotation.set(0,0,0);p.scale.copy(p.userData.homeScale).multiplyScalar(key==='tiles'?.001:1);});
  this.element.dataset.hoverProject='';this.element.dataset.hoverTime='0';this.element.dataset.hoverPhase='';
 }
}
export class Meteors{
 constructor(element){this.element=element;this.wait=10+Math.random()*5;this.items=[];this.count=0;}
 update(dt,enabled,width,height=width*.625){
  if(!enabled){for(const item of this.items)item.el.remove();this.items=[];return;}
  this.wait-=dt;if(this.wait<=0){this.wait=10+Math.random()*5;this.count++;for(let i=0;i<2;i++){
   const el=document.createElement('div');el.className='pixel-meteor';el.setAttribute?.('aria-hidden','true');el.innerHTML='<span class="meteor-tail"><i></i><i></i><i></i><i></i><i></i></span><span class="meteor-core"></span>';this.element.append(el);
   this.items.push({el,t:-i*.28,x:.86+Math.random()*.16,y:.015+Math.random()*.07,life:2.8+Math.random()*.5});
  }}
  this.items=this.items.filter(item=>{
   item.t+=dt;if(item.t>=item.life){item.el.remove();return false;}const progress=Math.max(0,item.t/item.life);
   item.el.style.opacity=String(item.t<0?0:.78*Math.pow(1-progress,1.25));
   item.el.style.transform=`translate(${(item.x-progress*.88)*width}px,${(item.y+progress*.88)*height}px)`;
   item.el.style.setProperty?.('--meteor-angle',`${-Math.atan2(height,width)*180/Math.PI}deg`);return true;
  });this.element.dataset.meteorPasses=String(this.count);this.element.dataset.meteorNext=this.wait.toFixed(2);
 }
}
