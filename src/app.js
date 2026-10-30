import {Exhibition} from './exhibition.js';
import {themes} from './world.js';
import {pixelSVG} from './pixel.js';
(async () => {
  'use strict';
  const response=await fetch('/data/portfolio.json');if(!response.ok)throw new Error('作品数据加载失败');const data=await response.json();
  const projects=data.projects, assets=new Map(data.assets.map(a=>[a.id,a]));
  const $=s=>document.querySelector(s), all=s=>[...document.querySelectorAll(s)];
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const href=a=>a.src;
  const isImage=a=>a&&['png','jpg','jpeg','gif'].includes(a.type), isVideo=a=>a&&['mp4','mov','flv'].includes(a.type);
  const usable=a=>!!a;
  const motionQuery=matchMedia('(prefers-reduced-motion: reduce)');
  const reduced=()=>motionQuery.matches||new URLSearchParams(location.search).get('motion')==='reduce';
  const delay=ms=>new Promise(resolve=>setTimeout(resolve,reduced()?0:ms));
  let selected=projects.findIndex(p=>p.id==='pgos'), activeTheme=null, exhibition=null, motionBusy=false, detailSpatial=false, returnFocus=null;
  let mediaList=[], mediaIndex=0, pendingHistory=false, videoObserver=null;
  const shortTitles={brushline:'Brushline<span class="title-break"> </span>Rally',museum:'PhotoMuseum',nex:'Nex',pgos:'PGOS',bot:'Bot',win10:'Win10 助手',ishowfx:'iShowFX'};
  function thumb(a){return a?.preview?`<img src="${esc(a.preview)}" alt="${esc(a.chapter)}" loading="lazy">`:`<span>${esc(a?.type==='pdf'?'技术分享':'作品')}</span>`;}
  const projectTheme=id=>themes.find(t=>t.members.includes(id));
  function renderTimeline(preserveCamera=false){
    const p=projects[selected];$('#title').innerHTML=shortTitles[p.id]||esc(p.title);
    $('#title').classList.toggle('latin',['brushline','museum','nex','pgos','bot','ishowfx'].includes(p.id));
    $('#title').classList.toggle('long-title',!shortTitles[p.id]&&p.title.length>8);
    $('#summary').textContent=p.summary;$('#stage').dataset.project=p.id;
    document.body.classList.toggle('theme-focused',!!activeTheme);$('#overview').hidden=!activeTheme;
    const members=projectTheme(p.id).members,current=members.indexOf(p.id);
    $('#previous').disabled=current===0;$('#next').disabled=current===members.length-1;
    if(exhibition){exhibition.select(selected,{focus:!preserveCamera});}else{
      $('#cards').innerHTML=themes.filter(t=>!activeTheme||t.id===activeTheme).map(t=>`<section class="flat-cluster"><h2><button data-theme-action="${t.id}">${esc(t.title)}</button></h2><div>${t.members.map(id=>{const i=projects.findIndex(q=>q.id===id),q=projects[i];return `<button class="flat-project ${i===selected?'active':''}" data-card="${i}" aria-label="访问 ${esc(q.title)}">${q.coverSrc?`<img src="${q.coverSrc}" alt="">`:''}<span>${esc(q.title)}</span></button>`;}).join('')}</div></section>`).join('');
      all('[data-card]').forEach(b=>b.onclick=()=>visitProject(+b.dataset.card));
      all('[data-theme-action]').forEach(b=>b.onclick=()=>focusTheme(b.dataset.themeAction));
    }
  }
  function focusTheme(id){if(motionBusy||$('#detail').open)return;activeTheme=id;selected=projects.findIndex(p=>p.id===themes.find(t=>t.id===id).hub);renderTimeline(true);exhibition?.focusTheme(id);}
  function overview(){if(motionBusy||$('#detail').open)return;activeTheme=null;renderTimeline(true);exhibition?.overview();$('#stage').focus({preventScroll:true});}
  function select(n){if(motionBusy||$('#detail').open)return;selected=n;activeTheme=projectTheme(projects[n].id).id;renderTimeline();}
  function browse(delta){if(!activeTheme){focusTheme(themes[delta>0?0:2].id);return;}const ids=themes.find(t=>t.id===activeTheme).members,i=ids.indexOf(projects[selected].id);select(projects.findIndex(p=>p.id===ids[Math.max(0,Math.min(ids.length-1,i+delta))]));}
  function visitProject(index){if(motionBusy||$('#detail').open)return;selected=index;activeTheme=projectTheme(projects[index].id).id;returnFocus=document.activeElement;renderTimeline(true);if(exhibition)exhibition.visit(index);else openProject(projects[index]);}
  function mediaHtml(a){
    if(!a)return '<div class="document">'+esc(projects[selected].summary)+'</div>';
    if(isImage(a))return `<img src="${esc(href(a))}" alt="${esc(a.chapter)}">`;
    if(isVideo(a)){const src=href(a);return `<video controls playsinline preload="metadata" poster="${esc(a.preview||'')}" src="${esc(src)}"></video>`;}
    return `<div class="document"><a href="${esc(href(a))}" target="_blank" rel="noopener">阅读技术分享 ↗</a></div>`;
  }
  function watchVideo(container,a){const img=container.querySelector('img');if(img)img.addEventListener('error',()=>{container.innerHTML='<div class="document">图片暂时无法显示</div>';},{once:true});const v=container.querySelector('video');if(v)v.addEventListener('error',()=>{container.innerHTML=`<div class="document">${thumb(a)}<p><a href="${esc(a.original)}" target="_blank" rel="noopener">打开视频 ↗</a></p></div>`;},{once:true});}
  function stopMedia(container){container.querySelectorAll('video').forEach(v=>v.pause());}
  function playVideo(v){v.muted=true;const result=v.play();if(result)result.catch(()=>{});}
  function startVideos(){
    videoObserver?.disconnect();
    const videos=[...$('#media').querySelectorAll('video')];
    if(videos.length===1&&mediaList.length===1){playVideo(videos[0]);return;}
    videoObserver=new IntersectionObserver(entries=>{
      if(!$('#detail').classList.contains('detail-reveal')||$('#lightbox').open)return;
      for(const entry of entries){if(entry.isIntersecting&&entry.intersectionRatio>=.55){videos.filter(v=>v!==entry.target).forEach(v=>v.pause());playVideo(entry.target);}else entry.target.pause();}
    },{root:innerWidth>850?$('#media'):$('#detail'),threshold:[0,.55]});
    videos.forEach(v=>videoObserver.observe(v));
  }
  function renderMedia(){
    stopMedia($('#media'));videoObserver?.disconnect();mediaIndex=0;
    $('#media').classList.toggle('masonry',mediaList.length>1);
    $('#media').innerHTML=mediaList.length>1?'<div class="masonry-grid">'+mediaList.map((a,i)=>`<figure data-item="${i}">${isImage(a)?`<button data-expand="${i}" aria-label="放大：${esc(a.chapter)}"><img src="${esc(href(a))}" width="${a.width}" height="${a.height}" alt="${esc(a.chapter)}" loading="${i<2?'eager':'lazy'}"></button>`:mediaHtml(a)}${isVideo(a)?`<button class="video-expand" data-expand="${i}" aria-label="放大视频：${esc(a.chapter)}">⤢</button>`:''}</figure>`).join('')+'</div>':mediaHtml(mediaList[0]);
    if(mediaList.length>1)all('[data-item]').forEach(el=>watchVideo(el,mediaList[Number(el.dataset.item)]));else watchVideo($('#media'),mediaList[0]);
    all('[data-expand]').forEach(b=>b.onclick=()=>openLarge(Number(b.dataset.expand)));
    $('#expand').hidden=!mediaList[0]||(!isImage(mediaList[0])&&!isVideo(mediaList[0]));
    $('.media-toolbar').hidden=mediaList.length!==1||!mediaList[0];
  }
  async function openProject(p,{fromHistory=false}={}){
    if(motionBusy)return;motionBusy=true;if(fromHistory||!returnFocus?.isConnected)returnFocus=$('#explore');
    selected=projects.indexOf(p);activeTheme=projectTheme(p.id).id;renderTimeline(true);if(fromHistory&&exhibition)exhibition.locate(selected);
    $('#detail-period').textContent=p.period;$('#detail-title').textContent=p.title;$('#detail-summary').textContent=p.summary;
    $('.detail-copy h3').hidden=$('#contributions').hidden=['brushline','museum','cloudgame','xidian'].includes(p.id);
    $('#contributions').innerHTML=p.contributions.map(c=>`<li>${esc(c)}</li>`).join('');
    mediaList=p.assets.map(id=>assets.get(id)).filter(usable).sort((a,b)=>Number(b.id===p.cover)-Number(a.id===p.cover));renderMedia();
    detailSpatial=!!exhibition;const dialog=$('#detail');dialog.dataset.ready='false';
    document.body.classList.add('is-extracting');
    dialog.showModal();dialog.scrollTop=0;$('#media').scrollTop=0;

    dialog.classList.remove('measuring');dialog.classList.add('detail-reveal');document.body.classList.add('detail-open');document.body.classList.remove('is-extracting');
    await delay(250);dialog.dataset.ready='true';$('#close-detail').focus({preventScroll:true});motionBusy=false;startVideos();
    if(!fromHistory)history.pushState({portfolioDetail:p.id},'','#project='+encodeURIComponent(p.id));
    flushHistory();
  }
  async function closeDetail({fromHistory=false}={}){
    if(motionBusy||!$('#detail').open)return;motionBusy=true;$('#detail').dataset.ready='false';
    if($('#lightbox').open)closeLarge(false);videoObserver?.disconnect();stopMedia($('#detail'));
    $('#detail').classList.remove('detail-reveal');$('#detail').classList.add('detail-leave');document.body.classList.add('is-returning');
    await delay(160);$('#detail').close();if(detailSpatial&&exhibition)await exhibition.close();
    $('#detail').classList.remove('detail-leave');document.body.classList.remove('detail-open','is-returning');$('#media').innerHTML='';
    detailSpatial=false;motionBusy=false;renderTimeline(true);
    if(!fromHistory){if(history.state?.portfolioDetail)history.back();else history.replaceState(null,'',location.pathname+location.search);}
    (returnFocus?.isConnected?returnFocus:$('#explore')).focus({preventScroll:true});flushHistory();
  }
  function showLarge(){const a=mediaList[mediaIndex];stopMedia($('#large-media'));$('#large-media').innerHTML=mediaHtml(a);watchVideo($('#large-media'),a);$('#original-link').href=a.original;$('#original-link').textContent=isImage(a)?'打开原图 ↗':'打开原件 ↗';$('#large-prev').hidden=$('#large-next').hidden=mediaList.length<=1;$('#large-prev').disabled=mediaIndex===0;$('#large-next').disabled=mediaIndex===mediaList.length-1;const v=$('#large-media video');if(v)playVideo(v);}
  function openLarge(index=0){if(!mediaList[index])return;mediaIndex=index;videoObserver?.disconnect();stopMedia($('#media'));showLarge();$('#lightbox').showModal();}
  function closeLarge(resume=true){stopMedia($('#large-media'));$('#lightbox').close();$('#large-media').innerHTML='';const origin=$(`[data-expand="${mediaIndex}"]`)||$('#expand');origin.focus({preventScroll:true});if(resume)startVideos();}
  async function syncHistory(){if(motionBusy){pendingHistory=true;return;}exhibition?.cancel();const id=new URLSearchParams(location.hash.slice(1)).get('project'),p=projects.find(q=>q.id===id);if($('#detail').open&&(!p||p!==projects[selected]))await closeDetail({fromHistory:true});if(p&&!$('#detail').open)await openProject(p,{fromHistory:true});}
  function flushHistory(){if(pendingHistory){pendingHistory=false;syncHistory();}}
  addEventListener('popstate',syncHistory);addEventListener('hashchange',syncHistory);
  $('#overview').onclick=overview;$('#previous').onclick=()=>browse(-1);$('#next').onclick=()=>browse(1);$('#explore').onclick=()=>visitProject(selected);$('#title').onclick=()=>visitProject(selected);$('#title').onkeydown=e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();visitProject(selected);}};
  $('#close-detail').onclick=()=>closeDetail();$('#detail').addEventListener('cancel',e=>{e.preventDefault();closeDetail();});
  $('#expand').onclick=()=>openLarge(0);$('#close-lightbox').onclick=()=>closeLarge();$('#lightbox').addEventListener('cancel',e=>{e.preventDefault();closeLarge();});
  $('#large-prev').onclick=()=>{mediaIndex--;showLarge();};$('#large-next').onclick=()=>{mediaIndex++;showLarge();};
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#detail').open){if(['walking','casting','opening'].includes(exhibition?.journey.phase))exhibition.cancel();else if(activeTheme)overview();return;}if(motionBusy||!['ArrowLeft','ArrowRight'].includes(e.key)||document.activeElement.tagName==='VIDEO')return;const d=e.key==='ArrowRight'?1:-1;if($('#lightbox').open){e.preventDefault();mediaIndex=Math.max(0,Math.min(mediaList.length-1,mediaIndex+d));showLarge();}else if(!$('#detail').open){e.preventDefault();browse(d);}});
  addEventListener('resize',()=>{if(!exhibition&&!$('#detail').open)renderTimeline();});
  try{if(new URLSearchParams(location.search).get('renderer')==='flat')throw new Error('Flat gallery');exhibition=new Exhibition({element:$('#stage'),projects,assets,onSelect:(i,opts)=>opts?.visit?visitProject(i):select(i),onOpen:i=>openProject(projects[i]),onTheme:focusTheme,onFailure:()=>{exhibition=null;$('#stage canvas')?.remove();$('#stage').dataset.renderer='fallback';document.body.classList.remove('webgl-ready');renderTimeline();}});document.body.classList.add('webgl-ready');$('#stage').dataset.animation='idle';}catch(error){$('#stage canvas')?.remove();$('#stage').dataset.renderer='fallback';}
  $('.brand').innerHTML=pixelSVG('pixelcao');
  if(reduced())document.body.dataset.reduced='true';
  renderTimeline(true);syncHistory();
})().catch(error=>{document.querySelector('#title').textContent='作品暂时无法加载';document.querySelector('#summary').textContent='请刷新页面重试，或查看简历。';console.error(error);});
