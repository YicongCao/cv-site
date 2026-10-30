// Ignore the letterboxed area around an object-fit:contain image when deciding
// whether the visitor clicked the image itself or the surrounding empty space.
export function insideImage(point,rect,width,height){
 if(!width||!height)return true;
 const scale=Math.min(rect.width/width,rect.height/height),w=width*scale,h=height*scale;
 const x=rect.left+(rect.width-w)/2,y=rect.top+(rect.height-h)/2;
 return point.x>=x&&point.x<=x+w&&point.y>=y&&point.y<=y+h;
}
function blank(dialog,event){
 const target=event.target;if(!target?.closest||event.button!==0)return false;
 if(target.closest('button,a,video,input,textarea,select,figure,svg,h1,h2,h3,p,li'))return false;
 const image=target.closest('img');
 if(image)return !insideImage({x:event.clientX,y:event.clientY},image.getBoundingClientRect(),image.naturalWidth,image.naturalHeight);
 // A native scrollbar is a control, even though its DOM target is a container.
 for(let el=target;el;el=el.parentElement){
  const r=el.getBoundingClientRect();
  if(el.scrollHeight>el.clientHeight&&el.offsetWidth>el.clientWidth+2&&event.clientX>=r.left+el.clientLeft+el.clientWidth&&event.clientX<=r.right)return false;
  if(el===dialog)break;
 }
 return true;
}
export function installBlankDismiss(dialog,onDismiss){
 let down=null;
 dialog.addEventListener('pointerdown',e=>{down=blank(dialog,e)?{x:e.clientX,y:e.clientY,id:e.pointerId}:null;},{capture:true});
 dialog.addEventListener('pointercancel',()=>{down=null;});
 dialog.addEventListener('click',e=>{
  const start=down;down=null;
  if(!start||!dialog.open||!blank(dialog,e)||Math.hypot(e.clientX-start.x,e.clientY-start.y)>7)return;
  // A drag/selection ending in whitespace must not dismiss the reading surface.
  if(dialog.ownerDocument.getSelection()?.toString())return;
  onDismiss();
 });
}
