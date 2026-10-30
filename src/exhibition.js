import * as THREE from 'three';
import {drawPixel} from './pixel.js';

const clamp=THREE.MathUtils.clamp;
const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
const smooth=t=>t*t*(3-2*t);
const mix=THREE.MathUtils.lerp;
const WHITE=0xf4f3ee;
const accent=0xc64a3f;

/** A single scene owns the shelves, floor timeline and extracted detail cover. */
export class Exhibition {
  constructor({element,projects,assets,onSelect,onOpen,onFailure}) {
    Object.assign(this,{element,projects,assets,onSelect,onOpen,onFailure});
    this.selected=0;this.offset=0;this.target=0;this.hover=-1;this.busy=false;this.active=true;
    const mq=matchMedia('(prefers-reduced-motion: reduce)');this.reduced={get matches(){return mq.matches||new URLSearchParams(location.search).get('motion')==='reduce';}};
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color(WHITE);
    this.camera=new THREE.OrthographicCamera(-9,9,5,-5,.1,160);
    this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFShadowMap;
    this.renderer.setClearColor(WHITE);this.renderer.domElement.setAttribute('aria-label','三维作品展厅');
    element.prepend(this.renderer.domElement);element.dataset.renderer='webgl';
    this.scene.add(new THREE.HemisphereLight(0xffffff,0xc5c3b9,2.2));
    const sun=new THREE.DirectionalLight(0xfffbf2,2.5);sun.position.set(-7,13,-9);sun.castShadow=true;
    sun.shadow.mapSize.set(512,512);Object.assign(sun.shadow.camera,{left:-22,right:22,top:22,bottom:-22,near:1,far:70});
    sun.shadow.bias=-.00015;sun.shadow.normalBias=.025;sun.shadow.radius=1;this.scene.add(sun);
    const fill=new THREE.DirectionalLight(0xe8efff,.8);fill.position.set(9,7,8);this.scene.add(fill);
    const floor=new THREE.Mesh(new THREE.PlaneGeometry(180,180),new THREE.ShadowMaterial({color:0x47483d,opacity:.07}));
    floor.rotation.x=-Math.PI/2;floor.position.y=-.045;floor.receiveShadow=true;this.scene.add(floor);
    // A soft contact shadow supplements the directional shadow at the foot of each panel.
    this.contactTexture=this.softShadow();
    this.cards=projects.map((p,i)=>this.createCard(p,i));
    this.axis=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-5*.85+2.0,.005,5*4.8+2.6),new THREE.Vector3(18*.85+2.0,.005,-18*4.8+2.6)]),new THREE.LineBasicMaterial({color:0xd1d0c7,transparent:true,opacity:.7}));this.scene.add(this.axis);
    this.minorTicks=new THREE.Group();for(let i=-20;i<72;i++){const t=i/4;if(i%4===0)continue;const tick=new THREE.Mesh(new THREE.PlaneGeometry(.018,.10),new THREE.MeshBasicMaterial({color:0xc6c9c1}));tick.rotation.x=-Math.PI/2;tick.position.set(t*.85+2.0,.008,-t*4.8+2.6);this.minorTicks.add(tick);}this.scene.add(this.minorTicks);
    this.ray=new THREE.Raycaster();this.pointer=new THREE.Vector2();this.clock=0;this.last=0;
    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(element);
    this.bindInput();this.resize();this.draw(0);
    this.renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();this.active=false;this.tween?.resolve();this.settleResolve?.();this.settleResolve=null;this.tween=null;this.onFailure?.('context-lost');});
    this.renderer.domElement.addEventListener('webglcontextrestored',()=>location.reload());
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)this.wake();});
  }
  softShadow(){
    const c=document.createElement('canvas');c.width=32;c.height=40;const x=c.getContext('2d');
    x.fillStyle='rgba(70,68,60,.18)';
    // A stepped projected silhouette: nearest filtering keeps its stair-step edge.
    for(let y=0;y<36;y++)x.fillRect(Math.floor(y/4),y,21,1);
    const t=new THREE.CanvasTexture(c);t.magFilter=THREE.NearestFilter;t.minFilter=THREE.NearestFilter;return t;
  }
  plate(w,h,depth){
    const cut=.065,x=-w/2,y=-h/2,shape=new THREE.Shape();
    shape.moveTo(x+cut,y);shape.lineTo(x+w-cut,y);shape.lineTo(x+w-cut,y+cut);shape.lineTo(x+w,y+cut);shape.lineTo(x+w,y+h-cut);shape.lineTo(x+w-cut,y+h-cut);shape.lineTo(x+w-cut,y+h);shape.lineTo(x+cut,y+h);shape.lineTo(x+cut,y+h-cut);shape.lineTo(x,y+h-cut);shape.lineTo(x,y+cut);shape.lineTo(x+cut,y+cut);shape.closePath();
    const geometry=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false});geometry.translate(0,0,-depth/2);return geometry;
  }
  labelTexture(text,sub,active=false){
    const c=document.createElement('canvas');c.width=768;c.height=192;const x=c.getContext('2d');
    x.clearRect(0,0,768,192);if(/^\d+$/.test(text))drawPixel(x,text,10,12,8,active?'#c64a3f':'#686962');else{x.fillStyle=active?'#c64a3f':'#686962';x.font='500 54px sans-serif';x.fillText(text,10,72);}

    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
  }
  createCard(p,i){
    const a=this.assets.get(p.cover),ratio=a?a.width/a.height:1.35;
    const h=Math.min(5.2,(ratio>=1.25?4.5:ratio>=.95?3.15:2.5)/ratio),w=h*ratio;
    const group=new THREE.Group();this.scene.add(group);
    const edge=new THREE.MeshPhysicalMaterial({color:0xdfe1db,metalness:.25,roughness:.24,clearcoat:1,clearcoatRoughness:.17});
    const board=new THREE.Mesh(this.plate(w+.09,h+.09,.075),edge);board.castShadow=true;board.receiveShadow=true;group.add(board);
    const back=new THREE.Mesh(new THREE.PlaneGeometry(w-.025,h-.025),new THREE.MeshStandardMaterial({color:0xe8e9e3,roughness:.62}));back.rotation.y=Math.PI;back.position.z=-.039;group.add(back);
    const front=new THREE.Mesh(new THREE.PlaneGeometry(w-.035,h-.035),new THREE.MeshBasicMaterial({color:0xffffff,toneMapped:false}));front.position.z=.041;front.userData.index=i;group.add(front);
    const frame=new THREE.LineSegments(new THREE.EdgesGeometry(this.plate(w+.1,h+.1,.082)),new THREE.LineBasicMaterial({color:0xe6e7df,transparent:true,opacity:.9}));group.add(frame);
    const shadow=new THREE.Mesh(new THREE.PlaneGeometry(w*1.65,3.6),new THREE.MeshBasicMaterial({map:this.contactTexture,transparent:true,depthWrite:false,opacity:.75}));shadow.rotation.x=-Math.PI/2;shadow.position.y=-.02;this.scene.add(shadow);
    const feet=new THREE.Group();this.scene.add(feet);for(const side of [-1,1]){const foot=new THREE.Mesh(new THREE.BoxGeometry(.20,.18,.30),new THREE.MeshStandardMaterial({color:i===0?accent:0x999b94,metalness:.3,roughness:.45}));foot.position.set(side*(w/2-.13),.09,0);foot.castShadow=true;feet.add(foot);const cap=new THREE.Mesh(new THREE.BoxGeometry(.13,.035,.20),new THREE.MeshStandardMaterial({color:0xf4f3ee}));cap.position.set(foot.position.x,.198,-.02);feet.add(cap);}
    const year=p.period.startsWith('近期')?'近期':p.period.match(/\d{4}/)?.[0]||'毕业设计';
    const label=new THREE.Mesh(new THREE.PlaneGeometry(2.6,.65),new THREE.MeshBasicMaterial({map:this.labelTexture(year,p.title,i===0),transparent:true,depthWrite:false,toneMapped:false}));
    label.rotation.x=-Math.PI/2;label.rotation.z=-.07;this.scene.add(label);
    const tick=new THREE.Mesh(new THREE.BoxGeometry(.105,.09,.105),new THREE.MeshBasicMaterial({color:i===0?accent:0xb5b6ae}));this.scene.add(tick);
    const card={p,i,w,h,group,board,front,frame,shadow,label,tick,feet,loaded:false};
    if(a)card.src=p.coverSrc;else this.drawTextCover(card);
    return card;
  }
  loadCover(card){
    if(!card.src||card.requested)return;card.requested=true;
    new THREE.TextureLoader().load(card.src,t=>{t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());card.front.material.map=t;card.front.material.needsUpdate=true;card.loaded=true;this.wake();},undefined,()=>{this.drawTextCover(card);this.wake();});
  }
  drawTextCover(card){
    const c=document.createElement('canvas');c.width=1200;c.height=Math.round(1200*card.h/card.w);const x=c.getContext('2d');x.fillStyle='#f5f4ee';x.fillRect(0,0,c.width,c.height);

    x.fillStyle='#33372e';x.font='500 66px sans-serif';const title=card.p.id==='accelerator'?['腾讯网游','加速器']:card.p.id==='kinect'?['动感单车','健身娱乐系统']:[card.p.title];title.forEach((s,i)=>x.fillText(s,90,260+i*90));
    x.strokeStyle='#c8cec0';x.beginPath();x.moveTo(90,470);x.lineTo(1110,470);x.stroke();x.fillStyle='#72796b';x.font='28px sans-serif';card.p.keywords.forEach((k,i)=>x.fillText(k,90,550+i*48));
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;card.front.material.map=t;card.front.material.needsUpdate=true;card.loaded=true;
  }
  resize(){
    const r=this.element.getBoundingClientRect();if(!r.width||!r.height)return;
    this.width=r.width;this.height=r.height;this.mobile=r.width<=850;
    this.viewHeight=this.mobile?12.8:10.5;const viewWidth=this.viewHeight*r.width/r.height;
    Object.assign(this.camera,{left:-viewWidth/2,right:viewWidth/2,top:this.viewHeight/2,bottom:-this.viewHeight/2});
    const direction=new THREE.Vector3(10,12,16).normalize();this.camera.position.copy(direction.clone().multiplyScalar(30));this.camera.lookAt(0,0,0);
    this.right=new THREE.Vector3(1,0,0).applyQuaternion(this.camera.quaternion);this.up=new THREE.Vector3(0,1,0).applyQuaternion(this.camera.quaternion);
    const center=this.right.clone().multiplyScalar(this.mobile?-.1:-viewWidth*.13).addScaledVector(this.up,this.mobile?3.6:2.35);
    this.camera.position.copy(center).addScaledVector(direction,30);this.camera.lookAt(center);this.camera.updateProjectionMatrix();this.camera.updateMatrixWorld();
    this.renderer.setSize(r.width,r.height);if(this.flight)this.fitFlight();this.layout();this.wake();
  }
  base(card,offset=this.offset){const d=card.i-offset;return new THREE.Vector3(d*.85,card.h/2+.24,-d*4.8);}
  layout(){
    this.axis?.position.set(-this.offset*.85,0,this.offset*4.8);this.minorTicks?.position.copy(this.axis.position);
    for(const c of this.cards){
      const d=c.i-this.offset,visible=d>=(this.mobile?-.8:-2.3)&&d<=5.5;c.group.visible=visible;c.shadow.visible=visible;c.label.visible=visible;c.tick.visible=visible;c.feet.visible=visible;
      if(!visible)continue;this.loadCover(c);
      const b=this.base(c);
      if(!(this.flight&&this.flight.index===c.i)){c.group.position.copy(b);c.group.quaternion.identity();c.group.scale.setScalar(1);}
      c.feet.position.set(b.x,0,b.z);
      const bounce=c.i===this.selected&&this.bounceStart?Math.sin(Math.min(1,(performance.now()-this.bounceStart)/380)*Math.PI)*.065:0;
      c.feet.scale.y=1-bounce*3;if(!this.flight)c.group.position.y-=bounce;
      c.feet.children.forEach((foot,j)=>{if(j%2===0)foot.material.color.set(c.i===this.selected?accent:0x999b94);});
      c.shadow.position.set(b.x+.75, -.015,b.z+1.7);c.label.position.set(b.x+2.5,.012,b.z+2.5);c.tick.position.set(b.x+2.0,.009,b.z+2.6);
      const mobileFade=this.mobile&&d<-.1?1-smooth(clamp((-d-.1)/.7,0,1)):1;
      const faded=(this.flight&&this.flight.index!==c.i?.15:1)*mobileFade;
      for(const obj of [c.board,c.front,c.frame]){obj.material.transparent=faded<1||obj===c.frame;obj.material.opacity=(obj===c.frame?.9:1)*faded;}
      c.shadow.material.opacity=this.flight?.17:.65;
      c.label.material.opacity=this.flight?.15:1;c.tick.material.opacity=this.flight?.15:1;c.tick.material.transparent=!!this.flight;
      c.frame.material.color.set(c.i===this.selected?accent:c.i===this.hover?0x242825:0xa5a69d);
    }
    this.projectLabels();
  }
  projectLabels(){
    // Tiny accessible DOM hit targets track actual projected meshes, never duplicate the visuals.
    const layer=this.element.querySelector('#cards');if(!layer)return;
    layer.querySelectorAll('[data-card]').forEach(button=>{
      const c=this.cards[Number(button.dataset.card)];if(!c||!c.group.visible){button.hidden=true;return;}
      const p=c.group.position.clone().project(this.camera);button.style.left=`${(p.x*.5+.5)*this.width}px`;button.style.top=`${(-p.y*.5+.5)*this.height}px`;button.hidden=false;
    });
  }
  select(index){
    if(this.busy)return;this.selected=clamp(index,0,this.cards.length-1);this.target=this.selected;this.landing=true;this.cards.filter(c=>Math.abs(c.i-this.selected)<=2).forEach(c=>this.loadCover(c));
    this.cards.forEach(c=>{c.label.material.map.dispose();const year=c.p.period.startsWith('近期')?'近期':c.p.period.match(/\d{4}/)?.[0]||'毕业设计';c.label.material.map=this.labelTexture(year,c.p.title,c.i===this.selected);c.tick.material.color.set(c.i===this.selected?accent:0xb5b6ae);});
    if(this.reduced.matches)this.offset=this.target;this.wake();
  }
  pick(event){
    const r=this.renderer.domElement.getBoundingClientRect();this.pointer.set((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1);this.ray.setFromCamera(this.pointer,this.camera);
    return this.ray.intersectObjects(this.cards.filter(c=>c.group.visible).map(c=>c.front),false)[0]?.object.userData.index??-1;
  }
  bindInput(){
    const el=this.renderer.domElement;
    el.addEventListener('pointerdown',e=>{if(this.busy)return;this.down={x:e.clientX,y:e.clientY,id:e.pointerId};});
    el.addEventListener('pointermove',e=>{if(this.busy)return;const hit=this.pick(e);this.hover=hit;el.style.cursor=hit>=0?'pointer':'grab';if(this.down&&Math.abs(e.clientX-this.down.x)>5)el.style.cursor='grabbing';this.wake();});
    el.addEventListener('pointerleave',()=>{this.hover=-1;this.wake();});
    el.addEventListener('pointerup',e=>{
      if(!this.down||this.busy)return;const dx=e.clientX-this.down.x,dy=e.clientY-this.down.y;this.down=null;
      if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)){this.onSelect(clamp(this.selected-Math.sign(dx),0,this.cards.length-1));return;}
      if(Math.hypot(dx,dy)>12)return;const hit=this.pick(e);if(hit<0)return;if(hit===this.selected)this.onOpen(hit);else this.onSelect(hit);
    });
    el.addEventListener('pointercancel',()=>this.down=null);
  }
  /** Lift the actual mesh out of the row, rotate to camera, and fit a measured DOM media box. */
  async extract(index,readRect){
    if(this.busy)return false;
    this.busy=true;this.selected=index;this.target=index;
    if(Math.abs(this.offset-index)>.02&&!this.reduced.matches){await new Promise(resolve=>{this.settleResolve=resolve;this.wake();});}else this.offset=index;
    if(!this.active){this.busy=false;return false;}
    this.layout();const rect=readRect();
    const c=this.cards[index],start=this.base(c),sr=this.element.getBoundingClientRect();
    const ndc=start.clone().project(this.camera);
    const end=new THREE.Vector3(((rect.left+rect.width/2-sr.left)/sr.width)*2-1,1-((rect.top+rect.height/2-sr.top)/sr.height)*2,ndc.z).unproject(this.camera);
    const scale=Math.min(rect.width/c.w,rect.height/c.h)*this.viewHeight/this.height;
    this.flight={index,start,end,scale,progress:0,readRect};
    this.element.dataset.animation='extracting';
    await this.animate(0,1,this.reduced.matches?0:1050);
    this.element.dataset.animation='detail';this.busy=false;return true;
  }
  fitFlight(){
    const f=this.flight,c=this.cards[f.index],rect=f.readRect(),sr=this.element.getBoundingClientRect(),ndc=f.start.clone().project(this.camera);
    f.end.set(((rect.left+rect.width/2-sr.left)/sr.width)*2-1,1-((rect.top+rect.height/2-sr.top)/sr.height)*2,ndc.z).unproject(this.camera);
    f.scale=Math.min(rect.width/c.w,rect.height/c.h)*this.viewHeight/this.height;
  }
  async restore(){
    if(!this.flight)return;this.busy=true;this.element.dataset.animation='returning';
    await this.animate(this.flight.progress,0,this.reduced.matches?0:880);
    this.flight=null;this.busy=false;this.element.dataset.animation='idle';this.layout();this.wake();
  }
  animate(from,to,duration){
    return new Promise(resolve=>{this.tween={from,to,duration,start:performance.now(),resolve};if(!duration){this.flight.progress=to;this.applyFlight();this.tween=null;this.renderer.render(this.scene,this.camera);resolve();}else this.wake();});
  }
  applyFlight(){
    const f=this.flight;if(!f)return;const c=this.cards[f.index],t=f.progress;
    const lift=f.start.clone().add(new THREE.Vector3(0,.55,1.45));
    if(t<.25){c.group.position.lerpVectors(f.start,lift,smooth(t/.25));c.group.quaternion.slerpQuaternions(new THREE.Quaternion(),this.camera.quaternion,smooth(t/.25)*.12);c.group.scale.setScalar(1);}
    else{const u=ease((t-.25)/.75);c.group.position.lerpVectors(lift,f.end,u);c.group.position.y+=Math.sin(u*Math.PI)*.35;c.group.quaternion.slerpQuaternions(new THREE.Quaternion().slerp(this.camera.quaternion,.12),this.camera.quaternion,u);c.group.scale.setScalar(mix(1,f.scale,u));}
    c.shadow.material.opacity=.65*(1-t);this.element.dataset.progress=t.toFixed(3);
  }
  setActive(active){this.active=active;if(active){this.resize();this.wake();}}
  wake(){if(!this.pending&&this.active&&!document.hidden){this.pending=true;requestAnimationFrame(t=>this.draw(t));}}
  draw(now){
    this.pending=false;if(!this.active||document.hidden)return;
    const dt=Math.min(.05,(now-this.last)/1000||.016);this.last=now;
    if(!this.flight){this.offset=THREE.MathUtils.damp(this.offset,this.target,7,dt);if(Math.abs(this.offset-this.target)<.0005)this.offset=this.target;}
    if(this.settleResolve&&Math.abs(this.offset-this.target)<.02){this.offset=this.target;const done=this.settleResolve;this.settleResolve=null;done();}
    if(this.landing&&Math.abs(this.offset-this.target)<.015){this.landing=false;this.bounceStart=this.reduced.matches?null:performance.now();}
    this.layout();
    if(this.tween){const t=clamp((performance.now()-this.tween.start)/this.tween.duration,0,1);this.flight.progress=mix(this.tween.from,this.tween.to,t);if(t===1){const done=this.tween.resolve;this.tween=null;done();}}
    this.applyFlight();this.scene.updateMatrixWorld();this.renderer.render(this.scene,this.camera);
    this.element.dataset.frame=String((Number(this.element.dataset.frame)||0)+1);
    if(this.tween||Math.abs(this.offset-this.target)>.0001||(this.bounceStart&&performance.now()-this.bounceStart<400))this.wake();
  }
}
