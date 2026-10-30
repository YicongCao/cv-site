import {projectIcon} from './icons.js';
import {installBlankDismiss} from './dialog-dismiss.js';
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function resolveGallery(config,projects,assets){
 return config.map(row=>{
  const project=projects.find(p=>p.id===row.id);
  if(!project)throw new Error(`Unknown gallery project: ${row.id}`);
  return {project,period:row.period||project.period,skills:row.skills||project.keywords,images:row.images.slice(0,10).map((image,i)=>{
   const a=typeof image==='string'?assets.get(image):image;
   if(!a)throw new Error(`Unknown gallery image: ${image}`);
   return {src:typeof image==='string'?`/media/gallery/${row.id}-${image}.jpg`:a.src,original:a.original||a.src,width:a.width,height:a.height,alt:`${project.title} · ${a.chapter||'演示画面'} ${i+1}`};
  })};
 });
}
export function installGallery({dialog,config,projects,assets,onProject,onClose,reduced}){
 const rows=resolveGallery(config,projects,assets),preview=document.querySelector('#gallery-preview');
 const list=dialog.querySelector('.gallery-timeline');let previewRow,previewIndex=0,previewOrigin;
 list.innerHTML=rows.map(({project:p,period,skills,images})=>`<article class="gallery-project" data-gallery-project="${p.id}">
  <p class="gallery-period">${esc(period)}</p><div class="gallery-project-body">
  <h2><button data-gallery-detail="${p.id}">${projectIcon(p.id)}<span>${esc(p.title)}</span><span class="gallery-detail-arrow" aria-hidden="true">↗</span></button></h2>
  <ul class="gallery-skills" aria-label="主要职业技能">${skills.map(s=>`<li>${esc(s)}</li>`).join('')}</ul>
  <div class="gallery-filmstrip" role="region" aria-label="${esc(p.title)}插图" tabindex="0">${images.map((a,i)=>`<button class="gallery-photo" data-gallery-image="${i}" aria-label="放大：${esc(a.alt)}" style="--photo-ratio:${Math.max(.65,Math.min(2,a.width/a.height||1.6))}"><img src="${esc(a.src)}" width="${a.width}" height="${a.height}" alt="${esc(a.alt)}" loading="lazy" decoding="async" draggable="false"></button>`).join('')}</div>
  <div class="gallery-strip-controls" ${images.length<2?'hidden':''}><button data-strip-prev aria-label="上一组${esc(p.title)}插图">←</button><button data-strip-next aria-label="下一组${esc(p.title)}插图">→</button></div>
  </div></article>`).join('');
 function showPreview(){
  const a=previewRow.images[previewIndex],img=preview.querySelector('img');img.src=a.original;img.alt=a.alt;
  preview.querySelector('a').href=a.original;preview.querySelector('[data-preview-prev]').disabled=previewIndex===0;preview.querySelector('[data-preview-next]').disabled=previewIndex===previewRow.images.length-1;
 }
 function closePreview(){preview.close();preview.querySelector('img').removeAttribute('src');previewOrigin?.focus({preventScroll:true});}
 rows.forEach(row=>{
  const article=list.querySelector(`[data-gallery-project="${row.project.id}"]`),strip=article.querySelector('.gallery-filmstrip');
  const scroll=direction=>strip.scrollBy({left:direction*Math.max(220,strip.clientWidth*.8),behavior:reduced()?'instant':'smooth'});
  const prev=article.querySelector('[data-strip-prev]'),next=article.querySelector('[data-strip-next]');
  const update=()=>{article.querySelector('.gallery-strip-controls').hidden=strip.scrollWidth<=strip.clientWidth+2;prev.disabled=strip.scrollLeft<=4;next.disabled=strip.scrollLeft+strip.clientWidth>=strip.scrollWidth-2;};
  prev.onclick=()=>scroll(-1);next.onclick=()=>scroll(1);strip.addEventListener('scroll',update,{passive:true});new ResizeObserver(update).observe(strip);
  strip.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();e.stopPropagation();scroll(e.key==='ArrowLeft'?-1:1);}});
  article.querySelector('[data-gallery-detail]').onclick=e=>onProject(row.project,e.currentTarget);
  article.querySelectorAll('[data-gallery-image]').forEach(button=>button.onclick=()=>{previewRow=row;previewIndex=+button.dataset.galleryImage;previewOrigin=button;showPreview();preview.showModal();preview.querySelector('[data-preview-close]').focus();});
 });
 preview.querySelector('[data-preview-close]').onclick=closePreview;
 preview.querySelector('[data-preview-prev]').onclick=()=>{if(previewIndex>0){previewIndex--;showPreview();}};
 preview.querySelector('[data-preview-next]').onclick=()=>{if(previewIndex<previewRow.images.length-1){previewIndex++;showPreview();}};
 preview.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();e.stopPropagation();const next=previewIndex+(e.key==='ArrowRight'?1:-1);if(next>=0&&next<previewRow.images.length){previewIndex=next;showPreview();}}});
 preview.addEventListener('cancel',e=>{e.preventDefault();closePreview();});
 installBlankDismiss(preview,closePreview);
 dialog.querySelector('[data-gallery-close]').onclick=onClose;dialog.addEventListener('cancel',e=>{e.preventDefault();onClose();});
 return {open(){if(!dialog.open){dialog.showModal();dialog.querySelector('[data-gallery-close]').focus({preventScroll:true});}},close(){if(preview.open)closePreview();dialog.close();},projectButton(id){return list.querySelector(`[data-gallery-detail="${id}"]`);}};
}
