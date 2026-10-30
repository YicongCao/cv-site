// The archive is a peripheral preview, never part of the main overview framing.
export function framedStations(stations,mode,theme){
 return mode==='overview'?stations.filter(s=>s.walkable):stations.filter(s=>s.theme===theme);
}

export function archivePeekRect(width,height,aspect){
 const w=Math.min(420,Math.max(190,width*.29));
 const h=Math.min(height*.30,w/aspect);
 // Keep a visible invitation while letting the right and bottom edges run offscreen.
 return {x:width-w*.82,y:height-(width<=850?78:0)-h*.82,width:w,height:h};
}
