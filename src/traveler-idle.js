import * as T from 'three';
const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x);};
const envelope=(t,start,end)=>ease(t/start)*(1-ease((t-end)/.4));
export const idleDurations={twirl:3.2,think:3.6,hat:4};

export class IdleClock {
 constructor(random=Math.random){this.random=random;this.last=null;this.bag=[];this.reset();}
 reset(){this.action=null;this.elapsed=0;this.next=10;}
 update(dt,enabled){
  if(!enabled){this.reset();return null;}
  this.next-=dt;
  if(this.action){this.elapsed+=dt;if(this.elapsed>=idleDurations[this.action]){this.action=null;this.elapsed=0;}}
  if(!this.action&&this.next<=1e-8){
   if(!this.bag.length)this.bag=Object.keys(idleDurations);
   const choices=this.bag.filter(a=>a!==this.last);
   this.action=choices[Math.min(choices.length-1,Math.floor(this.random()*choices.length))];
   this.bag=this.bag.filter(a=>a!==this.action);this.last=this.action;this.elapsed=0;this.next=10;
  }
  return this.action;
 }
}
const hatKeys=[
 [0,0,.17,0,0,0],[.5,0,.17,0,0,0],[1,0,.72,.05,0,0],
 [1.55,.12,-.08,.47,1.1,-.12],[2.35,.12,-.08,.47,1.1,-.12],
 [2.9,0,.72,.05,0,0],[3.4,0,.17,0,0,0],[4,0,.17,0,0,0]
];
export function idlePose(action,t){
 const p={spin:0,bob:0,lean:0,headX:0,headY:0,headZ:0,leftX:0,leftZ:0,rightX:0,rightZ:0,hatX:0,hatY:.17,hatZ:0,hatRX:0,hatRZ:0,bubble:0};
 if(!action||t<=0||t>=idleDurations[action])return p;
 if(action==='twirl'){
  const open=envelope(t,.45,2.8),turn=ease((t-.4)/2.35);
  p.spin=Math.PI*2*turn;p.leftZ=-1.25*open;p.rightZ=1.25*open;
  p.leftX=p.rightX=-.1*open;p.bob=Math.sin(turn*Math.PI*4)**2*.045;
  p.lean=Math.sin(turn*Math.PI*2)*.065;p.headZ=-.08*open;
 }else if(action==='think'){
  const lift=envelope(t,.4,3.2),scratch=lift*Math.sin(t*15)*ease((t-.45)/.2);
  p.headZ=-.13*lift;p.headY=Math.sin(t*2)*.14*lift;
  p.rightZ=-2.65*lift;p.rightX=-.5*lift+scratch*.12;
  p.hatRZ=scratch*.025;p.bubble=envelope(t-.4,.25,2.6);
 }else if(action==='hat'){
  const i=hatKeys.findIndex((key,i)=>i<hatKeys.length-1&&t>=key[0]&&t<hatKeys[i+1][0]);
  if(i>=0){const a=hatKeys[i],b=hatKeys[i+1],u=ease((t-a[0])/(b[0]-a[0]));[p.hatX,p.hatY,p.hatZ,p.hatRX,p.hatRZ]=a.slice(1).map((v,j)=>v+(b[j+1]-v)*u);}
  const reach=envelope(t,.5,3.5),inspect=ease((t-1)/.55)*(1-ease((t-2.35)/.55));
  p.leftX=p.rightX=(-2.7+inspect*.8)*reach;
  p.leftZ=(.65-inspect*.35)*reach;p.rightZ=-p.leftZ;
  p.headX=.25*inspect;p.headY=-.12*inspect;p.headZ=Math.sin(t*5)*.035*inspect;
  p.hatRZ+=Math.sin(t*5)*.06*inspect;
 }
 return p;
}
export function applyIdlePose(traveler,p,heading){
 traveler.root.rotation.y=heading+p.spin;traveler.body.position.y+=p.bob;traveler.body.rotation.z=p.lean;
 traveler.head.rotation.set(p.headX,p.headY,p.headZ);
 traveler.arms[0].rotation.set(p.leftX,0,p.leftZ);traveler.arms[1].rotation.set(p.rightX,0,p.rightZ);
 traveler.hat.position.set(p.hatX,p.hatY,p.hatZ);traveler.hat.rotation.set(p.hatRX,0,p.hatRZ);
}

export class TravelerIdle {
 constructor(element){
  this.element=element;this.clock=new IdleClock();this.pixelFrame=-1;
  this.bubble=document.createElement('canvas');this.bubble.className='traveler-thought';this.bubble.width=80;this.bubble.height=56;
  this.bubble.hidden=true;this.bubble.setAttribute('aria-hidden','true');element.append(this.bubble);this.ctx=this.bubble.getContext('2d');
 }
 update(dt,enabled,traveler,heading,camera,width,height,headerHeight){
  const action=this.clock.update(dt,enabled),pose=idlePose(action,this.clock.elapsed);this.bubble.hidden=true;
  if(action)applyIdlePose(traveler,pose,heading);
  if(pose.bubble>.01){
   const frame=Math.floor(this.clock.elapsed*8);
   if(frame!==this.pixelFrame){this.pixelFrame=frame;this.drawThought(frame);}
   const p=traveler.root.position,point=new T.Vector3(p.x+.65,p.y+2.2,p.z-.65).project(camera);
   this.bubble.style.left=`${Math.max(46,Math.min(width-46,(point.x*.5+.5)*width))}px`;
   this.bubble.style.top=`${Math.max(headerHeight+65,Math.min(height-12,(.5-point.y*.5)*height))}px`;
   this.bubble.style.opacity=String(pose.bubble);this.bubble.hidden=false;
  }
  this.element.dataset.idleAction=action||'';this.element.dataset.idleTime=this.clock.elapsed.toFixed(2);this.element.dataset.idleNext=Math.max(0,this.clock.next).toFixed(2);
 }
 drawThought(frame){
  const c=this.ctx,phase=frame*.32;c.clearRect(0,0,80,56);
  // A stepped speech balloon with a moving, tangled pixel line. No text or glyphs.
  c.fillStyle='#708375';c.fillRect(4,0,72,44);c.fillRect(0,4,80,36);c.fillRect(14,42,14,8);c.fillRect(10,48,10,4);
  c.fillStyle='#eee6cb';c.fillRect(6,2,68,40);c.fillRect(2,6,76,32);c.fillRect(16,40,10,6);c.fillRect(12,46,6,4);
  c.strokeStyle='#4c6158';c.lineWidth=2;c.lineJoin='miter';c.beginPath();
  for(let i=0;i<=36;i++){const q=i/36*Math.PI*5,x=Math.round((40+Math.sin(q*1.8+phase)*21+Math.cos(q*.7-phase)*4)/2)*2,y=Math.round((22+Math.cos(q*2.1-phase*.7)*10)/2)*2;if(i===0)c.moveTo(x,y);else c.lineTo(x,y);}
  c.stroke();
 }
 reset(){this.clock.reset();this.bubble.hidden=true;}
 dispose(){this.bubble.remove();}
}
