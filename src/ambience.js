import * as T from 'three';
const alphabet={N:['10001','11001','10101','10011','10001','10001','10001'],E:['11111','10000','10000','11110','10000','10000','11111'],X:['10001','10001','01010','00100','01010','10001','10001'],P:['11110','10001','10001','11110','10000','10000','10000'],G:['01111','10000','10000','10111','10001','10001','01111'],O:['01110','10001','10001','10001','10001','10001','01110'],S:['01111','10000','10000','01110','00001','00001','11110']};
export function makeFlag(id){
 const c=document.createElement('canvas');c.width=96;c.height=40;const ctx=c.getContext('2d');ctx.fillStyle=id==='win10'?'#e8e4ce':'#294044';ctx.fillRect(0,0,96,40);
 if(id==='win10'){ctx.fillStyle='#0078d7';for(const x of [32,50])for(const y of [5,23])ctx.fillRect(x,y,14,14);}
 else {const text=id==='nex'?'NEX':'PGOS',size=3,start=(96-(text.length*6-1)*size)/2;ctx.fillStyle=id==='pgos'?'#edbd69':'#eee6cb';[...text].forEach((l,i)=>alphabet[l].forEach((row,r)=>[...row].forEach((v,x)=>{if(v==='1')ctx.fillRect(start+(i*6+x)*size,9+r*size,size,size);})));}
 const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;texture.magFilter=texture.minFilter=T.NearestFilter;
 const geometry=new T.PlaneGeometry(4.4,1.84,24,10);const mesh=new T.Mesh(geometry,new T.MeshBasicMaterial({map:texture,side:T.DoubleSide}));mesh.position.set(0,3.8,0);mesh.userData.base=new Float32Array(geometry.attributes.position.array);return mesh;
}
export function waveFlag(flag,time,reduced){
 const p=flag.geometry.attributes.position,b=flag.userData.base;
 for(let i=0;i<p.count;i++){const k=i*3,u=(b[k]+2.2)/4.4,phase=time*2.4-u*5.5; p.setXYZ(i,b[k],b[k+1]+(reduced?0:Math.sin(phase+.7)*.08*u),reduced?0:(Math.sin(phase)*.25+Math.sin(phase*1.6+b[k+1])*.04)*u);}
 p.needsUpdate=true;flag.geometry.computeBoundingSphere();
}
export function makeGlobe(){
 const g=new T.Group();g.userData.dynamic=true;g.position.set(0,2.65,.35);
 const globe=new T.Mesh(new T.SphereGeometry(.82,16,10),new T.MeshBasicMaterial({color:0x337daf,wireframe:false}));g.add(globe);
 for(const latitude of [-.45,0,.45]){const r=Math.sqrt(.84*.84-latitude*latitude),pts=[];for(let i=0;i<=32;i++){const a=i/32*Math.PI*2;pts.push(new T.Vector3(Math.cos(a)*r,latitude,Math.sin(a)*r));}g.add(new T.Line(new T.BufferGeometry().setFromPoints(pts),new T.LineBasicMaterial({color:0x83c3ce})));}
 for(const longitude of [0,Math.PI/3,2*Math.PI/3]){const pts=[];for(let i=0;i<=32;i++){const a=i/32*Math.PI*2;pts.push(new T.Vector3(Math.cos(a)*Math.cos(longitude)*.84,Math.sin(a)*.84,Math.cos(a)*Math.sin(longitude)*.84));}g.add(new T.Line(new T.BufferGeometry().setFromPoints(pts),new T.LineBasicMaterial({color:0x83c3ce})));}
 const arc=[];for(let i=0;i<=24;i++){const a=i/24*Math.PI*1.5;arc.push(new T.Vector3(Math.cos(a)*1.12,Math.sin(a)*.47,Math.sin(a)*1.05));}g.add(new T.Line(new T.BufferGeometry().setFromPoints(arc),new T.LineBasicMaterial({color:0xe4b35c})));
 for(const i of [0,24]){const m=new T.Mesh(new T.BoxGeometry(.14,.14,.14),new T.MeshBasicMaterial({color:0xffd58b}));m.position.copy(arc[i]);g.add(m);}return g;
}
