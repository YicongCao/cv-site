import * as T from 'three';
import {IslandMotion,Meteors} from './island-motion.js';
import {waveFlag} from './ambience.js';
import {projectIcon} from './icons.js';
import {placeLabels} from './label-layout.js';
import {HoverExhaust} from './hover-exhaust.js';
import {RisingBridges} from './rising-bridges.js';
import {TravelerIdle} from './traveler-idle.js';
import {framedStations,archivePeekRect} from './archive-preview.js';
import {MapGestures,zoomFrame} from './map-gestures.js';
import {makeWorld,Journey,themes} from './world.js';
import {box,color,makeIsland,makeTraveler,batchBoxes} from './models.js';
const clamp=T.MathUtils.clamp;
const right=new T.Vector3(1,0,-1).normalize(),up=new T.Vector3(-1,2,-1).normalize();
const direction=new T.Vector3(1,1,1).normalize();
const shortNames={brushline:'Brushline Rally',museum:'PhotoMuseum',nex:'Nex',pgos:'PGOS',cloudgame:'云游戏',bot:'Bot',accelerator:'网游加速器',desktop:'桌面玩机',cleaner:'垃圾清理',win10:'Win10 助手',uwp:'爱看段子',reader:'简致阅读',ishowfx:'iShowFX',xidian:'西电导航','km-compiler':'编译原理','km-bot':'Bot 与 NLP','km-network':'网络与 NAT'};
const featuredLabels=new Set(['nex','pgos','bot','brushline','museum']);
export class Exhibition {
 constructor({element,projects,onSelect,onOpen,onTheme,onFailure,onWalk,onPortal,onAbout,onIslandSound,onOverview}){
  Object.assign(this,{element,projects,onSelect,onOpen,onTheme,onFailure,onWalk,onPortal,onAbout,onIslandSound,onOverview});
  this.world=makeWorld(projects);this.journey=new Journey(this.world);this.selected=this.journey.target;
  this.mode='overview';this.theme=null;this.follow=false;this.active=true;this.last=0;this.time=0;this.heading=0;this.zoom=1;this.pan=new T.Vector3();
  const mq=matchMedia('(prefers-reduced-motion: reduce)');this.reduced=()=>mq.matches||new URLSearchParams(location.search).get('motion')==='reduce';
  this.introActive=!this.reduced()&&!new URLSearchParams(location.hash.slice(1)).has('project');this.introElapsed=0;this.ripples=[];
  this.scene=new T.Scene();this.scene.background=new T.Color(0x222e32);
  this.archiveMask={value:0};
  this.camera=new T.OrthographicCamera(-10,10,8,-8,.1,300);
  this.renderer=new T.WebGLRenderer({antialias:false,alpha:false,preserveDrawingBuffer:true});this.renderer.setPixelRatio(1);this.renderer.outputColorSpace=T.SRGBColorSpace;
  this.renderer.domElement.setAttribute('aria-label','四座主题岛群与白帽旅人');element.prepend(this.renderer.domElement);element.dataset.renderer='webgl';
  this.islands=this.world.stations.map(s=>{
   const group=makeIsland(s);this.scene.add(group);group.traverse(o=>{if(o.material){o.material=o.material.clone();if(!s.walkable)this.maskArchive(o.material);}});
   const edge=new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(s.size,.06,s.size)),new T.LineBasicMaterial({color:color.gold}));edge.position.y=.03;group.add(edge);return {group,edge};
  });
  this.walkway=new T.Group();this.scene.add(this.walkway);this.sections=[];
  for(const e of this.world.edges){
   if(e.shortcut)continue;
   const a=this.world.nodes[e.a],b=this.world.nodes[e.b],len=Math.hypot(b.x-a.x,b.z-a.z),steps=Math.max(1,Math.ceil(len/.42));
   const section=new T.Group();this.walkway.add(section);const angle=Math.atan2(b.x-a.x,b.z-a.z);
   for(let j=0;j<steps;j++){
    const t=(j+.5)/steps,x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t,z=a.z+(b.z-a.z)*t;
    const tile=box(section,x,y-(e.bridge?.09:.075),z,e.bridge?1:.64,.18,len/steps+.015,e.bridge?0x9da68b:0x8b9b80);tile.rotation.y=angle;
    if(e.bridge&&j%2===0)for(const side of [-1,1]){
     const curb=box(section,x+Math.cos(angle)*.55*side,y+.04,z-Math.sin(angle)*.55*side,.12,.15,len/steps*.8,0x7d8f7a);curb.rotation.y=angle;
    }
   }
   if(e.bridge&&len>5)box(section,(a.x+b.x)/2,(a.y+b.y)/2-.65,(a.z+b.z)/2,.5,1,.5,0x556b60);
   batchBoxes(section);section.traverse(o=>{if(o.material){o.material=o.material.clone();if(this.world.stations[a.station].theme==='km')this.maskArchive(o.material);}});this.sections.push({group:section,a:this.world.stations[a.station].theme,b:this.world.stations[b.station].theme});
  }
  this.bridges=new RisingBridges(this.world);this.scene.add(this.bridges.group);
  this.traveler=makeTraveler();this.scene.add(this.traveler.root);this.traveler.root.scale.setScalar(1.15);
  const actorHit=new T.Mesh(new T.BoxGeometry(.9,1.9,.8),new T.MeshBasicMaterial({visible:false}));actorHit.position.y=.95;this.traveler.root.add(actorHit);
  this.profileButton=document.createElement('button');this.profileButton.className='traveler-profile-target';this.profileButton.setAttribute('aria-label','关于 pixelcao，白帽旅人');this.profileButton.setAttribute('aria-haspopup','dialog');this.profileButton.onclick=()=>this.onAbout?.();element.append(this.profileButton);
  this.idle=new TravelerIdle(element);
  this.islandMotion=new IslandMotion({element,islands:this.islands,world:this.world,onSound:onIslandSound});this.meteors=new Meteors(element);
  this.exhaust=new HoverExhaust();this.scene.add(this.exhaust.group);
  this.createSpotlight();
  this.magic=new T.Group();this.scene.add(this.magic);this.sparks=[];for(let i=0;i<10;i++)this.sparks.push(box(this.magic,0,0,0,.07,.07,.07,color.gold));
  this.portal=new T.Group();this.scene.add(this.portal);for(const side of [-1,1]){box(this.portal,side,0,0,.035,2,.035,color.gold);box(this.portal,0,side,0,2,.035,.035,color.gold);}
  this.pointer=new T.Vector2();this.ray=new T.Raycaster();this.center=new T.Vector3();this.goalCenter=new T.Vector3();this.viewHeight=40;
  this.skipButton=document.createElement('button');this.skipButton.className='skip-intro';this.skipButton.textContent='跳过';this.skipButton.onclick=()=>this.skipIntro();element.append(this.skipButton);
  mq.addEventListener('change',()=>{if(this.reduced()){this.skipIntro();if(['walking','casting','opening'].includes(this.journey.phase))this.visit(this.journey.target,{immediate:true});}this.wake();});
  this.bindInput();this.syncLabels();this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(element);this.resize();this.wake();
  document.addEventListener('visibilitychange',()=>{this.last=0;this.hover=-1;this.focused=-1;this.idle.reset();this.onIslandSound?.({id:null});if(!document.hidden)this.wake();});
  this.renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();this.active=false;this.focusShade.remove();this.profileButton.remove();this.islandMotion.bubble.remove();this.idle.dispose();this.onIslandSound?.({id:null});this.journey.cancel();this.closeResolve?.();this.closeResolve=null;this.onFailure?.();});
 }
 maskArchive(material){
  // A gray-white translucent veil composited only over the archive's surfaces.
  material.onBeforeCompile=shader=>{shader.uniforms.archiveMask=this.archiveMask;shader.fragmentShader='uniform float archiveMask;\n'+shader.fragmentShader.replace('#include <colorspace_fragment>','#include <colorspace_fragment>\ngl_FragColor.rgb=mix(gl_FragColor.rgb,vec3(.80,.83,.80),archiveMask);');};
  material.customProgramCacheKey=()=> 'archive-preview-mask-v1';
 }
 updateArchive(dt){
  const stations=this.world.stations.filter(s=>!s.walkable),collapsed=this.mode==='overview';
  const points=[];for(const s of stations)for(const x of [-s.size/2,s.size/2])for(const z of [-s.size/2,s.size/2])for(const y of [-1.5,s.hub?4.9:2.3])points.push(new T.Vector3(s.x+x,s.y+y,s.z+z));
  const xs=points.map(p=>p.dot(right)),ys=points.map(p=>p.dot(up)),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
  const rect=archivePeekRect(this.width,this.height,(maxX-minX)/(maxY-minY));this.archiveRect=rect;
  const units=this.viewHeight/this.height,targetScale=collapsed?Math.min(rect.width/(maxX-minX),rect.height/(maxY-minY))*units:1;
  const offset=new T.Vector3();
  if(collapsed){
   const x=this.center.dot(right)+(rect.x+rect.width/2-this.width/2)*units-(minX+maxX)/2*targetScale;
   const y=this.center.dot(up)+(this.height/2-rect.y-rect.height/2)*units-(minY+maxY)/2*targetScale;
   offset.copy(right).multiplyScalar(x).addScaledVector(up,y);
  }
  const alpha=this.manualDirect||this.reduced()||!this.archivePose?1:1-Math.exp(-dt*7);
  this.archivePose??={scale:targetScale,offset:offset.clone()};
  this.archivePose.scale=T.MathUtils.lerp(this.archivePose.scale,targetScale,alpha);this.archivePose.offset.lerp(offset,alpha);
  this.archiveMask.value=T.MathUtils.lerp(this.archiveMask.value,collapsed?.48:0,alpha);
  this.archiveMoving=Math.abs(this.archivePose.scale-targetScale)>.0001||this.archivePose.offset.distanceTo(offset)>.005||Math.abs(this.archiveMask.value-(collapsed?.48:0))>.001;
  for(const s of stations){const group=this.islands[s.index].group;group.position.set(s.x,s.y,s.z).multiplyScalar(this.archivePose.scale).add(this.archivePose.offset);group.scale.setScalar(this.archivePose.scale);group.visible=!this.introActive;}
  for(const section of this.sections)if(section.a==='km'){section.group.position.copy(this.archivePose.offset);section.group.scale.setScalar(this.archivePose.scale);section.group.visible=!this.introActive;}
  this.element.dataset.archive=collapsed?'collapsed':'expanded';this.element.dataset.archiveMask=this.archiveMask.value.toFixed(2);
 }
 select(index,{focus=false}={}){this.selected=clamp(index,0,this.projects.length-1);if(focus)this.focusTheme(this.world.stations[this.selected].theme);this.syncLabels();this.wake();}
 focusTheme(id){this.cancel();this.manualView=null;this.browsingTransition=true;this.mode='theme';this.theme=id;this.follow=false;this.pan.set(0,0,0);this.zoom=1;this.syncLabels();this.wake();}
 overview(){this.cancel();this.manualView=null;this.hover=-1;this.focused=-1;this.browsingTransition=true;this.mode='overview';this.theme=null;this.follow=false;this.pan.set(0,0,0);this.zoom=1;this.syncLabels();this.wake();}
 locate(index){this.manualView=null;this.skipIntro();this.browsingTransition=false;this.journey.cancel();if(this.world.stations[index].walkable)this.journey.visit(index,true);this.selected=index;this.theme=this.world.stations[index].theme;this.mode='theme';this.follow=false;this.pan.set(0,0,0);this.zoom=1;this.syncLabels();this.cameraAt(true);this.wake();}
 visit(index,{immediate=false}={}){
  if(['detail','closing'].includes(this.journey.phase))return;
  this.manualView=null;this.skipIntro();this.browsingTransition=false;this.addRipple(index);
  if(!this.world.stations[index].walkable){this.cancel();this.selected=index;this.theme=this.world.stations[index].theme;this.mode='theme';this.follow=false;this.pan.set(0,0,0);this.zoom=1;this.syncLabels();this.onOpen(index);this.wake();return;}
  const instant=immediate||this.reduced();if(!this.journey.visit(index,instant))return;
  if(!this.hasVisited&&!instant){this.departureDelay=.65;this.hasVisited=true;}
  this.selected=index;this.theme=this.world.stations[index].theme;this.mode='theme';this.follow=true;this.pan.set(0,0,0);this.zoom=1;this.syncLabels();
  if(instant){this.cameraAt(true);this.updateCharacter(0);this.onOpen(index);}this.wake();
 }
 cancel(){this.skipIntro();if(['walking','casting','opening'].includes(this.journey.phase)){this.journey.cancel();this.departureDelay=0;this.follow=false;this.settling=.2;this.magic.visible=false;this.portal.visible=false;this.wake();}}
 close(){if(!this.world.stations[this.selected].walkable){this.wake();return Promise.resolve();}this.journey.phase=this.reduced()?'idle':'closing';this.journey.elapsed=0;this.wake();return new Promise(resolve=>{this.closeResolve=resolve;if(this.reduced()){resolve();this.closeResolve=null;}});}
 skipIntro(){if(!this.introActive)return;this.introActive=false;this.browsingTransition=true;this.introElapsed=4.5;this.skipButton.hidden=true;this.wake();}
 addRipple(index){
  const station=this.world.stations[index],p=this.clickPoint||station;this.clickPoint=null;
  const mesh=new T.Mesh(new T.RingGeometry(.85,1,48),new T.MeshBasicMaterial({color:0xffe8ad,transparent:true,opacity:.85,depthWrite:false,side:T.DoubleSide}));
  mesh.rotation.x=-Math.PI/2;mesh.position.set(p.x,station.y+.12,p.z);mesh.scale.setScalar(.25);this.scene.add(mesh);this.ripples.push({mesh,elapsed:0});
  if(this.ripples.length>6){const old=this.ripples.shift();this.scene.remove(old.mesh);old.mesh.geometry.dispose();old.mesh.material.dispose();}this.wake();
 }
 updateAmbience(dt){
  for(const {group} of this.islands){if(group.userData.flag)waveFlag(group.userData.flag,this.time,this.reduced());if(group.userData.globe&&!this.reduced())group.userData.globe.rotation.y=this.time*.16;}
  this.ripples=this.ripples.filter(r=>{r.elapsed+=dt;const t=r.elapsed/.7;r.mesh.scale.setScalar(this.reduced()?1: .25+t*2.6);r.mesh.material.opacity=.85*(1-t);if(t>=1){this.scene.remove(r.mesh);r.mesh.geometry.dispose();r.mesh.material.dispose();return false;}return true;});
  this.element.dataset.ripples=String(this.ripples.length);this.element.dataset.windTime=this.time.toFixed(2);
 }
 createSpotlight(){
  // A screen-space light pool keeps the protagonist readable with unlit pixel materials.
  this.focusShade=document.createElement('div');this.focusShade.className='traveler-focus';this.focusShade.setAttribute('aria-hidden','true');this.element.append(this.focusShade);
  this.spotlight=new T.Group();this.scene.add(this.spotlight);this.spotAmount=0;
  const material=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,uniforms:{strength:{value:0}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 vUv;uniform float strength;void main(){float a=(1.-vUv.y)*.045*strength;gl_FragColor=vec4(.9,.85,.65,a);}'});
  this.lightBeam=new T.Mesh(new T.CylinderGeometry(.3,1.35,24,8,1,true),material);this.lightBeam.position.y=12;this.spotlight.add(this.lightBeam);
  const ring=new T.Mesh(new T.RingGeometry(.72,.84,8),new T.MeshBasicMaterial({color:0xffe4a0,transparent:true,opacity:0,depthWrite:false,side:T.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=.045;this.spotlight.add(ring);this.lightRing=ring;
 }
 updateSpotlight(dt){
  const active=!this.reduced()&&(this.introActive||['walking','casting'].includes(this.journey.phase));
  const p=this.journey.position,screen=new T.Vector3(p.x,p.y+.8,p.z).project(this.camera);
  const goal=active&&Math.abs(screen.x)<1.1&&Math.abs(screen.y)<1.1?1:0;
  this.spotAmount=T.MathUtils.lerp(this.spotAmount,goal,Math.min(1,dt*7));if(Math.abs(this.spotAmount-goal)<.005)this.spotAmount=goal;
  this.spotTransition=this.spotAmount!==goal;this.spotlight.visible=this.spotAmount>.001;
  this.spotlight.position.set(p.x,p.y+.02,p.z);this.lightBeam.material.uniforms.strength.value=this.spotAmount;this.lightRing.material.opacity=this.spotAmount*.6;
  this.focusShade.style.opacity=String(this.spotAmount);
  this.focusShade.style.setProperty('--light-x',`${(screen.x*.5+.5)*this.width}px`);this.focusShade.style.setProperty('--light-y',`${(.5-screen.y*.5)*this.height}px`);
  this.focusShade.style.setProperty('--light-radius',`${Math.max(this.mobile?65:90,2.6*this.height/this.viewHeight)}px`);
  this.element.dataset.spotlight=this.spotAmount.toFixed(2);this.element.dataset.departure=String(this.departureDelay>0);
 }
 syncLabels(){
  const layer=this.element.querySelector('#cards');if(!layer)return;layer.replaceChildren();
  for(const theme of themes){
   const b=document.createElement('button');b.disabled=false;b.className='theme-label';b.dataset.theme=theme.id;b.textContent=theme.title;b.setAttribute('aria-label',`浏览${theme.title}`);b.setAttribute('aria-pressed',String(this.theme===theme.id));b.onclick=()=>this.onTheme(theme.id);layer.append(b);
  }
  // Fixed world axis (screen-right is x - z) keeps sign sides stable while panning.
  this.world.stations.forEach((s,i)=>{
   const b=document.createElement('button');b.disabled=false;b.className='island-label';b.classList.toggle('is-featured',featuredLabels.has(s.id));b.dataset.card=i;b.dataset.projectId=s.id;b.dataset.labelSide=s.x>s.z?'right':'left';b.setAttribute('aria-label',`访问 ${this.projects[i].title}`);b.setAttribute('aria-pressed',String(i===this.selected));b.innerHTML=`${projectIcon(s.id)}<span>${shortNames[s.id]}</span>`;
   b.onpointerenter=()=>{this.hover=i;this.wake();};b.onpointerleave=()=>{this.hover=-1;this.wake();};b.onfocus=()=>{this.focused=i;this.wake();};b.onblur=()=>{this.focused=-1;this.wake();};b.onclick=()=>this.mode==='overview'&&!s.walkable?this.onTheme('km'):this.onSelect(i,{visit:true});layer.append(b);
  });
 }
 measureMap(){this.mapTop=this.mobile?Math.max(this.headerHeight+12,this.mode==='theme'?(document.querySelector('.intro')?.getBoundingClientRect().bottom||0)+14:0):0;this.element.style.setProperty('--map-top',this.mapTop+'px');this.element.style.setProperty('--map-bottom',this.mobile?'78px':'0px');}
 resize(){const r=this.element.getBoundingClientRect();if(!r.width||!r.height)return;this.width=r.width;this.height=r.height;this.headerHeight=document.querySelector('header')?.getBoundingClientRect().height||0;this.mobile=r.width<=850;this.renderer.setSize(Math.ceil(r.width/2),Math.ceil(r.height/2),false);this.measureMap();this.cameraAt(true);this.wake();}
 framing(){
  if(this.manualView)return {center:this.manualView.center.clone(),height:this.manualView.height};
  let stations=framedStations(this.world.stations,this.mode,this.theme);
  const shortcut=this.follow?this.bridges.state.focusEdge(this.journey):null;
  if(shortcut)stations=[this.world.stations[this.world.nodes[shortcut.a].station],this.world.stations[this.world.nodes[shortcut.b].station]];
  const points=[];for(const s of stations)for(const x of [-s.size/2,s.size/2])for(const z of [-s.size/2,s.size/2])for(const y of [-1.5,s.hub?4.9:2.3])points.push(new T.Vector3(s.x+x,s.y+y,s.z+z));
  if(this.follow&&this.journey.phase==='walking'){
   const p=this.journey.position;
   if(!shortcut&&this.journey.remaining>16){points.length=0;for(const x of [-9,9])for(const z of [-9,9])for(const y of [0,3])points.push(new T.Vector3(p.x+x,p.y+y,p.z+z));}
   else points.push(new T.Vector3(p.x,p.y+2,p.z));
  }
  const xs=points.map(p=>p.dot(right)),ys=points.map(p=>p.dot(up));
  const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
  const overview=this.mode==='overview',left=overview?35:this.mobile?22:this.width*.32,rightPad=overview?35:28;
  const introBottom=this.mobile&&!overview?document.querySelector('.intro').getBoundingClientRect().bottom-this.element.getBoundingClientRect().top+18:0;
  const top=this.mobile?this.mapTop:Math.max((this.headerHeight||0)+40,introBottom),bottom=this.mobile?84:75;
  const availableW=Math.max(100,this.width-left-rightPad),availableH=Math.max(150,this.height-top-bottom);
  const h=Math.max((maxY-minY)*this.height/availableH,(maxX-minX)*this.height/availableW)*1.12/this.zoom/(overview&&this.mobile?1.45:1);
  const screenX=(left+this.width-rightPad)/2,screenY=(top+this.height-bottom)/2;
  const cx=(minX+maxX)/2-(screenX-this.width/2)*h/this.height,cy=(minY+maxY)/2+(screenY-this.height/2)*h/this.height;
  const frame={center:right.clone().multiplyScalar(cx).addScaledVector(up,cy).add(this.pan),height:h};
  if(this.introActive){const p=this.journey.position,t=clamp((this.introElapsed-2.9)/1.6,0,1),ease=t*t*(3-2*t);frame.center=new T.Vector3(p.x,p.y+1,p.z).lerp(frame.center,ease);frame.height=T.MathUtils.lerp(this.mobile?5:5.8,h,ease);}
  return frame;
 }
 cameraAt(instant=false,dt=.016){
  const frame=this.framing();this.goalCenter.copy(frame.center);this.goalHeight=frame.height;
  const alpha=instant||this.gestures?.moved&&this.gestures.active||this.introActive||this.reduced()?1:1-Math.exp(-dt*12);this.center.lerp(this.goalCenter,alpha);this.viewHeight=T.MathUtils.lerp(this.viewHeight,this.goalHeight,alpha);
  const w=this.viewHeight*this.width/this.height;Object.assign(this.camera,{left:-w/2,right:w/2,top:this.viewHeight/2,bottom:-this.viewHeight/2});this.camera.updateProjectionMatrix();
  this.camera.position.copy(this.center).addScaledVector(direction,100);this.camera.up.set(0,1,0);this.camera.lookAt(this.center);this.camera.updateMatrixWorld();
 }
 bridgeNeighbors(){const indices=new Set();if(this.journey.phase==='walking')for(const lane of this.bridges.state.lanes)if(lane.tiles.some(t=>t.lift>0)){indices.add(this.world.nodes[lane.edge.a].station);indices.add(this.world.nodes[lane.edge.b].station);}return indices;}
 pick(e){const r=this.element.getBoundingClientRect();this.pointer.set((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2);this.ray.setFromCamera(this.pointer,this.camera);const neighbors=this.bridgeNeighbors();const hit=this.ray.intersectObjects(this.islands.filter(({group})=>group.visible).map(x=>x.group).concat(this.traveler.root),true)[0];if(!hit)return -1;this.lastHit=hit.point.clone();let o=hit.object;while(o.parent&&o.parent!==this.scene)o=o.parent;return o===this.traveler.root?-2:this.islands.findIndex(x=>x.group===o);}
 isBlank(){return this.ray.intersectObjects([...this.islands.map(x=>x.group),this.walkway,...this.bridges.tiles.filter(t=>t.group.visible).map(t=>t.group)],true).length===0;}
 beginManual(){if(!this.manualView)this.manualView={center:this.center.clone(),height:this.viewHeight};this.follow=false;this.browsingTransition=false;}
 changeView({dx=0,dy=0,ratio=1,x=this.width/2,y=this.height/2},instant=true){
  this.beginManual();const f=this.manualView,units=f.height/this.height;
  f.center.addScaledVector(right,-dx*units).addScaledVector(up,dy*units);
  const next=zoomFrame({height:f.height,x:f.center.dot(right),y:f.center.dot(up)},ratio,{x,y},this.width,this.height);
  f.center.addScaledVector(right,next.x-f.center.dot(right)).addScaledVector(up,next.y-f.center.dot(up));f.height=next.height;
  const stations=this.world.stations.filter(s=>this.theme==='km'?s.theme==='km':s.walkable);
  const xs=stations.map(s=>new T.Vector3(s.x,s.y,s.z).dot(right)),ys=stations.map(s=>new T.Vector3(s.x,s.y,s.z).dot(up));
  const cx=f.center.dot(right),cy=f.center.dot(up);f.center.addScaledVector(right,clamp(cx,Math.min(...xs)-6,Math.max(...xs)+6)-cx).addScaledVector(up,clamp(cy,Math.min(...ys)-6,Math.max(...ys)+6)-cy);
  this.manualDirect=instant;if(instant)this.cameraAt(true);this.wake();
 }
 tapMap({target,x,y}){
  const card=target.closest?.('[data-card]'),theme=target.closest?.('.theme-label[data-theme]');
  if(theme){this.onTheme(theme.dataset.theme);return;}
  if(target.closest?.('.traveler-profile-target')){this.onAbout?.();return;}
  const i=card?+card.dataset.card:this.pick({clientX:x,clientY:y});
  if(i===-2){this.onAbout?.();return;}
  if(i>=0){const s=this.world.stations[i];if(!s.walkable&&this.theme!=='km'){this.onTheme('km');return;}this.clickPoint=card?null:this.lastHit;this.onSelect(i,{visit:true});}
  else if(this.mode==='theme'&&this.isBlank())this.onOverview?.();
 }
 bindInput(){
  const el=this.element,canvas=this.renderer.domElement;
  this.gestures=new MapGestures({onChange:change=>{this.down={drag:true};this.changeView(change);},onTap:tap=>this.tapMap(tap),onEnd:()=>{this.down=null;this.wake();}});
  el.addEventListener('pointerdown',e=>{
   if(e.button!==0||e.target.closest?.('.skip-intro')||['detail','closing','opening'].includes(this.journey.phase))return;
   if(this.mobile&&e.clientY<this.mapTop)return;
   if(this.introActive){this.skipIntro();return;}
   e.preventDefault();this.down={drag:false};this.gestures.down(e.pointerId,e.clientX,e.clientY,e.target);el.setPointerCapture(e.pointerId);
  });
  el.addEventListener('pointermove',e=>{
   if(this.gestures.active){e.preventDefault();this.gestures.move(e.pointerId,e.clientX,e.clientY);}
   else if(e.pointerType!=='touch'){const hit=this.pick(e);canvas.style.cursor=hit!==-1?'pointer':this.mode==='theme'&&this.isBlank()?'zoom-out':'grab';const hover=hit>=0&&this.mode==='overview'&&!this.world.stations[hit].walkable?-1:hit;if(hover!==this.hover){this.hover=hover;this.wake();}}
  });
  el.addEventListener('pointerup',e=>{this.gestures.up(e.pointerId,e.clientX,e.clientY);if(el.hasPointerCapture(e.pointerId))el.releasePointerCapture(e.pointerId);});
  el.addEventListener('pointercancel',()=>{this.gestures.cancel();this.hover=-1;});
  el.addEventListener('lostpointercapture',e=>{if(this.gestures.points.has(e.pointerId))this.gestures.cancel();});
  el.addEventListener('click',e=>{if(e.detail>0&&!e.target.closest?.('.skip-intro')){e.preventDefault();e.stopPropagation();}},true);
  el.addEventListener('pointerleave',()=>{if(!this.gestures.active){this.hover=-1;this.wake();}});
  el.addEventListener('wheel',e=>{if(['detail','closing','opening'].includes(this.journey.phase))return;e.preventDefault();this.skipIntro();this.changeView({ratio:Math.exp(-e.deltaY*.001),x:e.clientX,y:e.clientY});},{passive:false});
  const controls=document.querySelector('.map-controls');if(controls){controls.hidden=false;controls.querySelectorAll('[data-zoom]').forEach(b=>b.onclick=()=>{this.skipIntro();this.changeView({ratio:Number(b.dataset.zoom),x:this.width/2,y:(this.mapTop+this.height-84)/2},false);});}
 }
 updateCharacter(dt){const j=this.journey,p=j.position,traveling=j.phase==='walking',walking=traveling&&!j.waiting&&!(this.departureDelay>0),target=this.world.stations[j.target];let angle=traveling?(j.direction??this.heading):Math.atan2(target.x+.35-p.x,target.z-.45-p.z);const delta=T.MathUtils.euclideanModulo(angle-this.heading+Math.PI,Math.PI*2)-Math.PI;this.heading+=delta*Math.min(1,dt*15||1);
  const t=this.traveler;t.root.position.set(p.x,p.y+.025,p.z);t.root.rotation.y=this.heading;const desiredStep=walking?Math.sin(j.walked*1.25):0;this.step=walking?desiredStep:T.MathUtils.lerp(this.step||0,0,Math.min(1,dt*22));const step=this.step;t.feet.forEach((f,i)=>{f.position.z=(i?1:-1)*step*.15;f.position.y=.08+Math.max(0,(i?1:-1)*step)*.12;});t.body.position.y=walking?Math.abs(step)*.035:0;t.body.rotation.set(0,0,0);t.hat.position.set(0,.17,0);t.hat.rotation.set(0,0,walking?step*.035:0);t.arms.forEach(a=>a.rotation.z=0);
  const casting=['casting','opening','detail','closing'].includes(j.phase);const armTarget=casting?-clamp(j.phase==='casting'?j.elapsed/.3:j.phase==='closing'?1-j.elapsed/.32:1,0,1)*2.3:step*.28;t.arms[1].rotation.x=T.MathUtils.lerp(t.arms[1].rotation.x,armTarget,Math.min(1,dt*25||1));t.arms[0].rotation.x=-step*.28;
  this.onWalk?.(j.walked,walking&&!(this.departureDelay>0));
  this.onPortal?.(j.phase,j.token);
  t.head.rotation.set(0,0,0);t.arms[1].rotation.z=0;
  if(this.introActive){const time=this.introElapsed;t.root.rotation.y=Math.PI/4;t.head.rotation.y=time<1.5?Math.sin(time*4)*.45:Math.sin(time*2)*.08;
   const lift=clamp((time-1.2)/.35,0,1)*(1-clamp((time-2.65)/.25,0,1));t.head.rotation.z=-lift*.14;t.arms[1].rotation.z=-lift*2.65;t.arms[1].rotation.x=-lift*(.45+Math.sin(time*15)*.15);}
  const onScreen=new T.Vector3(p.x,p.y+1,p.z).project(this.camera);
  const canIdle=j.phase==='idle'&&!this.introActive&&!this.reduced()&&!document.querySelector('dialog[open]')&&!this.down&&!this.browsingTransition&&Math.abs(onScreen.x)<.95&&Math.abs(onScreen.y)<.9;
  this.idle.update(dt,canIdle,t,this.heading,this.camera,this.width,this.height,this.headerHeight);
  this.magic.visible=['casting','opening'].includes(j.phase);this.magic.position.copy(t.root.position);this.sparks.forEach((s,i)=>{const a=this.time*2+i*2.4;s.position.set(Math.cos(a)*(.25+i*.04),.8+((this.time+i*.08)%.8)*1.4,Math.sin(a)*(.25+i*.04));});
  this.portal.visible=['opening','closing'].includes(j.phase);if(this.portal.visible){const raw=clamp(j.phase==='opening'?j.elapsed/.42:1-j.elapsed/.32,0,1),progress=raw*raw*(3-2*raw);const destination=this.center.clone().addScaledVector(new T.Vector3(0,1,0).applyQuaternion(this.camera.quaternion),43/this.height*this.viewHeight);this.portal.position.set(p.x,p.y+1.3,p.z).lerp(destination,progress);this.portal.quaternion.copy(this.camera.quaternion);this.portal.scale.set(T.MathUtils.lerp(.4,(this.camera.right-this.camera.left)*.46,progress),T.MathUtils.lerp(.4,this.viewHeight*.38,progress),1);}
  this.element.dataset.animation=j.phase;this.element.dataset.position=[p.x,p.y,p.z].map(v=>v.toFixed(3)).join(',');this.element.dataset.travelerProject=this.projects[j.target].id;this.element.dataset.follow=String(this.follow);this.element.dataset.remaining=j.remaining.toFixed(2);this.element.dataset.view=this.mode;this.element.dataset.theme=this.theme||'';this.element.dataset.walked=j.walked.toFixed(2);
  this.element.dataset.bridgeWaiting=String(!!j.waiting);this.element.dataset.bridges=JSON.stringify(this.bridges.state.snapshot(j));
  this.element.dataset.routeShortcuts=j.segments.map(s=>this.world.edges[s.edge].shortcut).filter(Boolean).join(',');
 }
 layout(){
  if(this.center.distanceTo(this.goalCenter)<.05&&Math.abs(this.viewHeight-this.goalHeight)<.05)this.browsingTransition=false;
  const hidden=this.introActive||['detail','opening','closing'].includes(this.journey.phase),walking=this.journey.phase==='walking',bridgeNeighbors=this.bridgeNeighbors();
  const fade=(group,intensity)=>{if(group.userData.intensity===intensity)return;group.userData.intensity=intensity;group.traverse(o=>{if(o.material?.color){o.material.userData.baseColor??=o.material.color.clone();o.material.color.copy(o.material.userData.baseColor).lerp(this.scene.background,1-intensity);}});};
  this.sections.forEach(s=>fade(s.group,this.mode==='overview'||(s.a===this.theme&&s.b===this.theme)?1:walking?.40:.36));
  this.islands.forEach(({group,edge},i)=>{
   const station=this.world.stations[i],bridgeNeighbor=bridgeNeighbors.has(i);
   const nearTraveler=walking&&(bridgeNeighbor||Math.hypot(station.x-this.journey.position.x,station.z-this.journey.position.z)<10);
   const collapsed=this.mode==='overview'&&!station.walkable;const highlighted=!collapsed&&i===this.selected&&(this.mode==='theme'||this.world.stations[i].hub);
   if(group.userData.highlight!==highlighted){group.userData.floor.material.color.set(highlighted?0xc5ac73:color.stone);group.userData.floor.material.userData.baseColor=group.userData.floor.material.color.clone();group.userData.highlight=highlighted;group.userData.intensity=undefined;}fade(group,this.mode==='overview'||station.theme===this.theme||nearTraveler?1:walking?.40:.36);
   edge.visible=!collapsed&&(highlighted||i===this.hover||(['casting','opening'].includes(this.journey.phase)&&i===this.journey.target));edge.material.color.set(highlighted?color.gold:0xd8ddc7);
  });
  const project=(el,p)=>{p.project(this.camera);el.style.left=`${(p.x*.5+.5)*this.width}px`;el.style.top=`${(.5-p.y*.5)*this.height}px`;return Math.abs(p.x)<.98&&Math.abs(p.y)<.94;};
  const actor=this.journey.position;const actorShown=project(this.profileButton,new T.Vector3(actor.x,actor.y+1,actor.z));this.profileButton.hidden=hidden||!actorShown;
  this.element.querySelectorAll('[data-theme]').forEach(b=>{b.disabled=false;
   const theme=themes.find(t=>t.id===b.dataset.theme),s=this.world.stations.find(s=>s.id===theme.hub);
   const peek=theme.id==='km'&&this.mode==='overview';b.classList.toggle('archive-peek',peek);
   b.setAttribute('aria-label',peek?'展开4. 古法手作 KM 头条好文':`浏览${theme.title}`);
   if(peek){const r=this.archiveRect;b.hidden=hidden;b.style.left=r.x+'px';b.style.top=r.y+'px';b.style.width=r.width+'px';b.style.height=r.height+'px';return;}
   b.style.width='';b.style.height='';
   const offset=(theme.labelOffsetU||0)/Math.SQRT2;const shown=project(b,new T.Vector3(s.x+offset,s.y+5.6,s.z-offset));b.hidden=hidden||!shown||this.mode!=='overview';
  });
  this.element.querySelectorAll('[data-card]').forEach(b=>{b.disabled=false;
   const i=+b.dataset.card,s=this.world.stations[i],onRight=b.dataset.labelSide==='right',side=onRight?1:-1,ax=onRight?.25:.75;
   const shown=project(b,new T.Vector3(s.x+side*s.size/2,s.y+.3,s.z-side*s.size/2));
   const anchorY=parseFloat(b.style.top),safe=!this.mobile||(anchorY>this.mapTop+22&&anchorY<this.height-82);
   const detailed=this.mode==='theme'&&(s.theme===this.theme||bridgeNeighbors.has(i)||this.hover===i||this.focused===i||(s.walkable&&s.size*this.height/this.viewHeight>65));const labelWidth=b.offsetWidth;const left=parseFloat(b.style.left);b.style.left=`${clamp(left,labelWidth*ax+6,this.width-labelWidth*(1-ax)-6)}px`;
   // Desktop overview names stay visible; narrow screens reveal secondary names on demand.
   b.hidden=hidden||!shown||!safe||(this.mode==='theme'&&!detailed)||(this.mode==='overview'&&!s.walkable);
   b.classList.toggle('quiet',this.mobile&&!detailed&&!s.hub&&this.hover!==i&&this.focused!==i);
   b.classList.toggle('is-hovered',this.hover===i);
  });
  const signs=[...this.element.querySelectorAll('.theme-label,.island-label')].filter(b=>!b.hidden&&!b.classList.contains('archive-peek')&&(!b.classList.contains('quiet')||b.matches(':focus-visible')));
  const labels=signs.map(b=>{const ax=b.classList.contains('theme-label')?.5:b.dataset.labelSide==='right'?.25:.75,ay=b.classList.contains('theme-label')?1:.9;return {element:b,ax,ay,width:b.offsetWidth,height:b.offsetHeight,x:parseFloat(b.style.left)-b.offsetWidth*ax,y:parseFloat(b.style.top)-b.offsetHeight*ay};});
  for(const label of placeLabels(labels,{width:this.width,height:this.height,top:this.mobile?this.mapTop+2:this.headerHeight+8,bottom:this.mobile?84:60})){
   label.element.style.left=`${label.x+label.width*label.ax}px`;label.element.style.top=`${label.y+label.height*label.ay}px`;
  }
 }
 wake(){this.element.dataset.cameraReady='false';if(!this.pending&&this.active&&!document.hidden){this.pending=true;requestAnimationFrame(t=>this.draw(t));}}
 draw(now){
  this.pending=false;if(!this.active||document.hidden)return;const dt=Math.min(.05,this.last?(now-this.last)/1000:.016);this.last=now;this.time+=dt;this.settling=Math.max(0,(this.settling||0)-dt);
  const holding=this.departureDelay>0;this.departureDelay=Math.max(0,(this.departureDelay||0)-dt);
  this.bridges.update(dt,this.journey,this.reduced());
  const arrived=holding||this.introActive?null:this.journey.update(dt,(edge,from,to)=>this.bridges.state.canTraverse(edge,from,to));
  this.bridges.render();
  if(arrived){this.selected=arrived.index;this.theme=this.world.stations[arrived.index].theme;this.mode='theme';this.manualView=null;this.pan.set(0,0,0);this.zoom=1;this.syncLabels();}if(this.introActive){this.introElapsed+=dt;if(this.introElapsed>=4.5)this.introActive=false;}this.skipButton.hidden=!this.introActive;this.element.dataset.intro=this.introActive?(this.introElapsed<1.2?'look':this.introElapsed<2.9?'scratch':'zoom'):'complete';this.measureMap();this.cameraAt(false,dt);this.updateArchive(dt);this.updateCharacter(dt);this.updateAmbience(dt);this.updateSpotlight(dt);
  const canHover=!this.reduced()&&!this.introActive&&!document.querySelector('dialog[open]')&&!this.down?.drag;if(!canHover)this.hover=-1;const focused=this.element.querySelector('[data-card]:focus-visible');const hover=canHover?(this.hover>=0?this.hover:focused?+focused.dataset.card:-1):-1;this.islandMotion.update(dt,hover>=0?hover:-1,this.camera,this.width,this.height);this.meteors.update(dt,canHover&&this.journey.phase==='idle',this.width,this.height);
  this.exhaust.update(dt,hover>=0?this.world.stations[hover]:null,canHover);this.element.dataset.exhaustProject=hover>=0?this.world.stations[hover].id:'';this.element.dataset.exhaustCount=String(this.exhaust.activeCount);
  this.layout();this.scene.updateMatrixWorld();this.renderer.render(this.scene,this.camera);this.element.dataset.drawCalls=String(this.renderer.info.render.calls);
  if(arrived)this.onOpen(arrived.index);if(this.closeResolve&&this.journey.phase==='idle'){this.closeResolve();this.closeResolve=null;}
  const moving=this.archiveMoving||this.bridges.state.moving||this.introActive||this.spotTransition||this.settling>0||this.ripples.length>0||['walking','casting','opening','closing'].includes(this.journey.phase)||this.center.distanceTo(this.goalCenter)>.005||Math.abs(this.viewHeight-this.goalHeight)>.005;
  this.element.dataset.cameraReady=String(!moving);
  this.manualDirect=false;const ambient=!this.reduced()&&!document.querySelector('dialog[open]');
  if(moving||ambient){this.pending=true;requestAnimationFrame(t=>this.draw(t));}else this.last=0;
 }
}
