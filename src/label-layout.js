// Preserve projected positions where possible; move only signs that collide.
export function placeLabels(labels,{width,height,top=0,bottom=0,obstacles=[]}){
  const placed=obstacles.slice(),gap=6;
  const overlaps=(a,b)=>a.x<b.x+b.width+gap&&a.x+a.width+gap>b.x&&a.y<b.y+b.height+gap&&a.y+a.height+gap>b.y;
  return labels.map(label=>{
    const clamp=(v,min,max)=>Math.max(min,Math.min(Math.max(min,max),v));
    const x=clamp(label.x,6,width-label.width-6),y=clamp(label.y,top,height-bottom-label.height);
    let best={...label,x,y},score=Infinity;
    for(let ring=0;ring<12;ring++)for(const direction of ring?[-1,1]:[0]){
      const candidate={...label,x,y:clamp(y+direction*ring*(label.height+gap),top,height-bottom-label.height)};
      const collisions=placed.filter(p=>overlaps(candidate,p)).length;
      const cost=collisions*10000+Math.abs(candidate.y-y);
      if(cost<score){best=candidate;score=cost;}
      if(!collisions)break;
    }
    placed.push(best);return best;
  });
}
