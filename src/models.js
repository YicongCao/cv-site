import * as T from 'three';
function shadedGeometry(w,h,d){const g=new T.BoxGeometry(w,h,d),tones=[.77,.64,1,.5,.86,.66],colors=[];for(const tone of tones)for(let i=0;i<4;i++)colors.push(tone,tone,tone);g.setAttribute('color',new T.Float32BufferAttribute(colors,3));return g;}
const cube=shadedGeometry(1,1,1), palettes=new Map();
export const color={stone:0xa5ae96,dark:0x36494b,ink:0x202f35,cream:0xeee6cb,gold:0xe4b35c,green:0x708858,red:0xb96d54};
function mats(c){if(!palettes.has(c)){palettes.set(c,new T.MeshBasicMaterial({color:c,vertexColors:true}));}return palettes.get(c);}
export function box(g,x,y,z,w,h,d,c=color.stone){const m=new T.Mesh(cube,mats(c));m.position.set(x,y,z);m.scale.set(w,h,d);g.add(m);return m;}
function screen(g,x,y,z,w,h,kind='code'){
 box(g,x,y,z,w+.12,h+.12,.16,color.stone);box(g,x,y,z+.09,w,h,.025,color.ink);
 if(kind==='pong'){box(g,x-.45*w,y,z+.12,.04,h*.55,.02,color.cream);box(g,x+.45*w,y,z+.12,.04,h*.4,.02,color.cream);box(g,x+.14,y+.1,z+.12,.055,.055,.02,color.gold);}
 else if(kind==='windows'){for(let i=0;i<3;i++)for(let j=0;j<3;j++)box(g,x-w*.28+i*w*.28,y-h*.3+j*h*.3,z+.12,w*.23,h*.22,.02,[0x608aa2,color.gold,color.green][(i+j)%3]);}
 else for(let j=0;j<7;j++){box(g,x-w*.34,y+h*.36-j*h*.11,z+.12,.06,.025,.02,color.gold);box(g,x+.04,y+h*.36-j*h*.11,z+.12,w*(.28+(j%3)*.12),.025,.02,j%3?0x6c9c9f:color.gold);}
 box(g,x,y-h/2-.18,z,.15,.32,.18,color.dark);box(g,x,y-h/2-.35,z,.6,.05,.4,color.dark);
}
function plant(g,x,z){box(g,x,.15,z,.36,.3,.36,color.dark);box(g,x,.5,z,.09,.55,.09,0x80704f);for(let i=0;i<3;i++)box(g,x+(i%2)*.12,.65+i*.16,z,.42-i*.08,.25,.38-i*.07,color.green);}
export function makeExhibit(type,index){const g=new T.Group();g.position.set(.35,0,-.45);
 switch(type){
 case 'race':
  box(g,0,.04,0,2.7,.08,2.2,color.dark);box(g,0,.09,0,1.4,.04,1.05,color.green);
  for(let i=0;i<7;i++){box(g,-1.2+i*.4,.10,.9,.15,.015,.035,color.cream);box(g,-1.2+i*.4,.10,-.9,.15,.015,.035,color.cream);}
  box(g,.25,.23,.83,.9,.25,.4,color.red);box(g,.22,.42,.83,.42,.18,.34,color.cream);box(g,.22,.44,1.01,.25,.10,.018,color.dark);
  for(const x of [-.06,.57])for(const z of [.61,1.04])box(g,x,.18,z,.18,.2,.08,color.ink);
  box(g,-1.22,.8,-.5,.07,1.6,.07,color.cream);for(let x=0;x<4;x++)for(let y=0;y<3;y++)box(g,-1.15+x*.13,1.4-y*.13,-.5,.13,.13,.035,(x+y)%2?color.cream:color.ink);break;
 case 'photos':
  box(g,0,.95,-.55,2.65,1.9,.13,color.dark);for(let i=0;i<3;i++){box(g,-.87+i*.86,1.05,-.44,.7,1.0,.06,color.gold);box(g,-.87+i*.86,1.05,-.39,.57,.86,.03,[0x718781,0x756c62,0x9b8b69][i]);box(g,-.87+i*.86,.86,-.36,.5,.28,.02,color.green);box(g,-.99+i*.86,1.28,-.36,.13,.13,.02,color.cream);}
  box(g,0,.36,.65,1.8,.13,.45,0x89765b);for(const x of [-.7,.7])box(g,x,.17,.65,.1,.3,.25,color.dark);break;
 case 'code':case 'desktop':case 'windows':
  box(g,0,.6,.1,2.25,.12,1.35,color.stone);for(const x of [-.9,.9])box(g,x,.28,.1,.12,.55,.8,color.dark);
  screen(g,-.1,1.38,-.25,1.45,1,type==='windows'?'windows':'code');box(g,-.1,.7,.48,.9,.04,.32,color.dark);
  if(type==='desktop'){box(g,1,1,-.1,.36,.7,.08,color.dark);box(g,1,1,-.05,.27,.52,.02,color.gold);}else box(g,1.05,1.1,-.2,.4,.9,.65,color.dark);break;
 case 'servers':case 'network':
  for(let i=0;i<(type==='servers'?3:2);i++){const x=-.75+i*.75;box(g,x,.8,-.25,.56,1.6,.7,color.dark);for(let j=0;j<5;j++){box(g,x,.24+j*.27,.12,.44,.17,.04,0x60716b);box(g,x-.12,.24+j*.27,.15,.05,.045,.02,color.gold);}}
  for(let i=0;i<3;i++){box(g,-.8+i*.8,.22,.95,.4,.44,.4,color.gold);if(i<2)box(g,-.4+i*.8,.06,.95,.4,.045,.045,color.cream);}
  if(type==='network'){box(g,0,1.3,-.3,.07,1.5,.07,color.cream);box(g,0,2,-.3,1.2,.07,.07,color.gold);}break;
 case 'pong':screen(g,0,1.18,-.4,2.15,1.25,'pong');box(g,0,.24,.65,.9,.2,.5,color.stone);box(g,-.2,.43,.7,.07,.25,.07,color.red);break;
 case 'bot':
  box(g,0,.65,0,1,.85,.68,color.dark);box(g,0,1.38,0,1.2,.72,.82,color.stone);box(g,0,1.4,.43,.9,.37,.035,color.ink);for(const x of [-.24,.24])box(g,x,1.42,.46,.12,.12,.02,color.gold);
  box(g,0,1.9,0,.07,.3,.07,color.gold);for(const x of [-.67,.67]){box(g,x,.85,0,.23,.55,.25,color.stone);box(g,x*.5,.18,0,.3,.25,.5,color.dark);}break;
 case 'cleaner':
  for(let i=0;i<3;i++){box(g,-.8+i*.8,.35,0,.62,.7,.7,[color.green,color.stone,color.gold][i]);box(g,-.8+i*.8,.75,0,.72,.09,.78,color.dark);}
  box(g,.8,.95,.7,.06,1.5,.06,0x917954);box(g,.8,.22,.7,.5,.28,.18,color.cream);break;
 case 'feed':case 'books':
  if(type==='books'){box(g,0,.95,-.3,2.1,1.9,.5,color.dark);for(let r=0;r<3;r++){box(g,0,.1+r*.6,0,2.2,.09,.65,color.stone);for(let i=0;i<7;i++)box(g,-.88+i*.28,.36+r*.6,-.05,.19,.40+(i%2)*.1,.38,[color.red,color.gold,color.green][i%3]);}}
  else {for(let i=0;i<3;i++){box(g,-.8+i*.8,.9,-i*.15,.65,1.65,.12,color.cream);for(let j=0;j<3;j++){box(g,-.8+i*.8,1.43-j*.44,-i*.15+.07,.52,.24,.02,[color.green,color.dark,color.gold][j]);}}}break;
 case 'bike':
  for(const x of [-.75,.75]){const wheel=new T.Mesh(new T.TorusGeometry(.42,.075,4,12),new T.MeshBasicMaterial({color:color.dark}));wheel.position.set(x,.48,0);g.add(wheel);}
  box(g,0,.65,0,1.5,.09,.1,color.red);box(g,0,.7,0,.09,1.0,.1,color.red);box(g,-.25,1.17,0,.6,.1,.3,color.ink);box(g,.7,1.05,0,.08,.85,.1,color.stone);box(g,.7,1.5,0,.45,.08,.1,color.ink);box(g,0,1.8,-.8,.65,.1,.15,color.dark);box(g,0,.9,-.8,.06,1.8,.06,color.stone);break;
 case 'printer':
  box(g,0,.65,0,1.7,.9,1.1,color.stone);box(g,0,1.14,-.2,1.4,.13,.6,color.dark);box(g,0,.5,.7,1.15,.04,.7,color.cream);box(g,0,.53,.75,.9,.02,.45,color.green);screen(g,-.65,1.6,-.55,.55,.6,'windows');break;
 case 'campus':
  box(g,0,.05,0,2.7,.1,2.1,color.green);for(let i=0;i<5;i++){const x=-.9+(i%3)*.85,z=-.5+Math.floor(i/3)*1.1;box(g,x,.35,z,.55,.6,.6,color.cream);box(g,x,.69,z,.65,.09,.7,color.red);}
  box(g,0,.12,.2,2.5,.03,.15,color.stone);break;
 }
 plant(g,1.35,-1.0);if(index%3===0)plant(g,1.35,1.2);return g;
}
export function makeTraveler(){const root=new T.Group(),body=new T.Group();root.add(body);
 const feet=[box(root,-.12,.08,0,.17,.16,.28,color.ink),box(root,.12,.08,0,.17,.16,.28,color.ink)];
 // Stacked tapered cloth and hat create a deliberate pixel silhouette.
 for(let i=0;i<4;i++)box(body,0,.27+i*.12,0,.65-i*.07,.13,.46-i*.035,color.cream);
 box(body,0,.83,.015,.38,.27,.34,color.ink);box(body,-.09,.84,.19,.04,.06,.015,color.gold);box(body,.09,.84,.19,.04,.06,.015,color.gold);
 const hat=new T.Group();body.add(hat);box(hat,0,1.00,0,.79,.075,.62,color.cream);for(let i=0;i<6;i++)box(hat,0,1.08+i*.10,-i*.012,.46-i*.055,.105,.42-i*.045,color.cream);
 box(body,0,.42,.24,.055,.40,.02,color.gold);
 const arms=[new T.Group(),new T.Group()];arms.forEach((a,i)=>{a.position.set(i?.32:-.32,.65,0);body.add(a);box(a,0,-.15,0,.15,.3,.19,color.cream);box(a,0,-.33,0,.10,.10,.12,color.ink);});
 const shadow=box(root,0,.015,0,.65,.018,.5,0x334245);
 return {root,body,feet,arms,hat,shadow};
}
export function makeIsland(station){const g=new T.Group();g.position.set(station.x,station.y,station.z);const tileSize=.48,geo=shadedGeometry(tileSize,.23,tileSize),material=mats(color.stone).clone();const floor=new T.InstancedMesh(geo,material,64);const matrix=new T.Matrix4(),tint=new T.Color();
 for(let x=0;x<8;x++)for(let z=0;z<8;z++){matrix.makeTranslation((x-3.5)*.5,-.115,(z-3.5)*.5);floor.setMatrixAt(x*8+z,matrix);tint.setScalar(.88+((x*13+z*7+station.index)%9)*.015);floor.setColorAt(x*8+z,tint);}g.add(floor);g.userData.floor=floor;
 box(g,0,-.5,0,3.65,.6,3.65,0x64776d);for(const x of [-1.55,1.55])for(const z of [-1.55,1.55])box(g,x,-.95,z,.45,.5,.45,0x50635f);
 g.add(makeExhibit(station.type,station.index));batchBoxes(g);return g;
}

export function batchBoxes(group){
 group.updateMatrixWorld(true);const inv=group.matrixWorld.clone().invert(),meshes=[];group.traverse(o=>{if(o.isMesh&&!o.isInstancedMesh&&o.geometry===cube)meshes.push(o);});if(!meshes.length)return;
 const instanced=new T.InstancedMesh(cube,mats(0xffffff),meshes.length);meshes.forEach((m,i)=>{instanced.setMatrixAt(i,new T.Matrix4().multiplyMatrices(inv,m.matrixWorld));instanced.setColorAt(i,m.material.color);m.removeFromParent();});group.add(instanced);
}
