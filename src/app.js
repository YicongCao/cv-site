import {installDemoLinks} from './demo-links.js';
import {articleCards} from './articles.js';
import {installSound} from './sound.js';
import {Exhibition} from './exhibition.js';
import {themes} from './world.js';
import {icon,projectIcon} from './icons.js';
import {pixelSVG} from './pixel.js';
import {installBrandIdle} from './brand-idle.js';
import {installGallery} from './gallery.js';
import {installBlankDismiss} from './dialog-dismiss.js';
(async () => {
  'use strict';
  const sound=installSound();
  const boot=window.portfolioBoot;
  const data=boot?.data,galleryConfig=boot?.gallery;
  if(!data||!galleryConfig)throw new Error('作品数据加载失败');
  const projects=data.projects, assets=new Map(data.assets.map(a=>[a.id,a]));
  const $=s=>document.querySelector(s), all=s=>[...document.querySelectorAll(s)];
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const demoLinks=installDemoLinks($('#demo-link'),$('#demo-device-notice'));
  const href=a=>a.src;
  const isImage=a=>a&&['png','jpg','jpeg','gif'].includes(a.type), isVideo=a=>a&&['mp4','mov','flv'].includes(a.type);
  const usable=a=>!!a;
  const motionQuery=matchMedia('(prefers-reduced-motion: reduce)');
  const reduced=()=>motionQuery.matches||new URLSearchParams(location.search).get('motion')==='reduce';
  const delay=ms=>new Promise(resolve=>setTimeout(resolve,reduced()?0:ms));
  let selected=projects.findIndex(p=>p.id==='pgos'), activeTheme=null, exhibition=null, motionBusy=false, detailSpatial=false, returnFocus=null;
  let mediaList=[], mediaIndex=0, pendingHistory=false, videoObserver=null;
  let gallery=null,galleryReturnFocus=null;
  const shortTitles={brushline:'Brushline<span class="title-break"> </span>Rally',museum:'PhotoMuseum',nex:'Nex',pgos:'PGOS',bot:'Bot',win10:'Win10 助手',ishowfx:'iShowFX'};
  function thumb(a){return a?.preview?`<img src="${esc(a.preview)}" alt="${esc(a.chapter)}" loading="lazy">`:`<span>${esc(a?.type==='pdf'?'技术分享':'作品')}</span>`;}
  const projectTheme=id=>themes.find(t=>t.members.includes(id));
  function renderTimeline(preserveCamera=false){
    const p=projects[selected];$('#title').innerHTML=shortTitles[p.id]||esc(p.title);
    $('#title').classList.toggle('latin',['brushline','museum','nex','pgos','bot','ishowfx'].includes(p.id));
    $('#title').classList.toggle('long-title',!shortTitles[p.id]&&p.title.length>8);
    $('#summary').textContent=p.summary;$('#stage').dataset.project=p.id;
    $('#project-topics').innerHTML=(p.workflow||[]).map((item,i)=>`<li>${icon(item.icon||['compass','agent','screen','route'][i%4])}<span>${esc(item.title)}</span></li>`).join('');
    document.body.classList.toggle('theme-focused',!!activeTheme);$('#overview').hidden=!activeTheme;
    const members=projectTheme(p.id).members,current=members.indexOf(p.id);
    $('#previous').disabled=current===0;$('#next').disabled=current===members.length-1;
    if(exhibition){exhibition.select(selected,{focus:!preserveCamera});}else{
      $('#cards').innerHTML=themes.filter(t=>!activeTheme||t.id===activeTheme).map(t=>`<section class="flat-cluster ${!activeTheme&&t.id==='km'?'flat-archive-peek':''}"><h2><button data-theme-action="${t.id}" aria-label="${!activeTheme&&t.id==='km'?'展开':''}${esc(t.title)}">${esc(t.title)}</button></h2><div ${!activeTheme&&(t.id==='km'||innerWidth<=850)?'hidden':''}>${t.members.map(id=>{const i=projects.findIndex(q=>q.id===id),q=projects[i];return `<button class="flat-project ${i===selected?'active':''}" data-card="${i}" aria-label="访问 ${esc(q.title)}">${q.coverSrc?`<img src="${q.coverSrc}" alt="">`:''}<span class="flat-project-title">${projectIcon(q.id)}<span>${esc(q.title)}</span></span></button>`;}).join('')}</div></section>`).join('');
      all('[data-card]').forEach(b=>b.onclick=()=>visitProject(+b.dataset.card));
      all('[data-theme-action]').forEach(b=>b.onclick=()=>focusTheme(b.dataset.themeAction));
    }
  }
  function focusTheme(id){if(motionBusy||$('#detail').open)return;activeTheme=id;selected=projects.findIndex(p=>p.id===themes.find(t=>t.id===id).hub);renderTimeline(true);exhibition?.focusTheme(id);}
  function overview(){if(motionBusy||$('#detail').open)return;activeTheme=null;renderTimeline(true);exhibition?.overview();$('#stage').focus({preventScroll:true});}
  function select(n){if(motionBusy||$('#detail').open)return;selected=n;activeTheme=projectTheme(projects[n].id).id;renderTimeline();}
  function browse(delta){if(!activeTheme){focusTheme(themes[delta>0?0:themes.length-1].id);return;}const ids=themes.find(t=>t.id===activeTheme).members,i=ids.indexOf(projects[selected].id);select(projects.findIndex(p=>p.id===ids[Math.max(0,Math.min(ids.length-1,i+delta))]));}
  function visitProject(index){if(motionBusy||$('#detail').open)return;void sound.tap();selected=index;activeTheme=projectTheme(projects[index].id).id;returnFocus=document.activeElement;renderTimeline(true);if(exhibition)exhibition.visit(index);else openProject(projects[index]);}
  function mediaHtml(a){
    if(!a)return '<div class="document">'+esc(projects[selected].summary)+'</div>';
    if(isImage(a))return `<img class="${a.surface==='light'?'media-illustration':''}" src="${esc(href(a))}" alt="${esc(a.chapter)}">`;
    if(isVideo(a)){const src=href(a);return `<video controls playsinline preload="metadata" poster="${esc(a.preview||'')}" src="${esc(src)}"></video>`;}
    return `<div class="document"><a href="${esc(href(a))}" target="_blank" rel="noopener">${esc(a.title||'阅读技术分享')} ↗</a></div>`;
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
    const p=projects[selected],cards=articleCards(p,data.articles,assets),collection=mediaList.length>1||!!cards;
    const figure=(a,i)=>`<figure data-item="${i}">${isImage(a)?`<button data-expand="${i}" aria-label="放大：${esc(a.chapter)}"><img class="${a.surface==='light'?'media-illustration':''}" src="${esc(href(a))}" width="${a.width}" height="${a.height}" alt="${esc(a.chapter)}" loading="${i<2?'eager':'lazy'}"></button>`:mediaHtml(a)}${isVideo(a)?`<button class="video-expand" data-expand="${i}" aria-label="放大视频：${esc(a.chapter)}">⤢</button>`:''}</figure>`;
    $('#media').classList.toggle('masonry',collection);
    $('#media').innerHTML=collection?'<div class="masonry-grid">'+cards+mediaList.map(figure).join('')+'</div>':mediaHtml(mediaList[0]);
    if(collection)all('[data-item]').forEach(el=>watchVideo(el,mediaList[Number(el.dataset.item)]));else watchVideo($('#media'),mediaList[0]);
    all('[data-expand]').forEach(b=>b.onclick=()=>openLarge(Number(b.dataset.expand)));
    $('#expand').hidden=!mediaList[0]||(!isImage(mediaList[0])&&!isVideo(mediaList[0]));
    $('.media-toolbar').hidden=collection||!mediaList[0];
  }
  async function openProject(p,{fromHistory=false}={}){
    if(motionBusy)return;motionBusy=true;if(fromHistory||!returnFocus?.isConnected)returnFocus=$('#major-gallery').open?(gallery.projectButton(p.id)||$('[data-gallery-close]')):$('#explore');
    selected=projects.indexOf(p);activeTheme=projectTheme(p.id).id;renderTimeline(true);if(fromHistory&&exhibition)exhibition.locate(selected);
    demoLinks.setProject(p);
    $('#detail-period').textContent=p.period;$('#detail-title').textContent=p.title;$('#detail-summary').textContent=p.summary;
    $('#detail').classList.toggle('article-detail',!!p.articleOnly);
    $('#detail-summary').hidden=p.articleOnly||p.workflow?.length===1;
    $('.detail-copy > h3').hidden=$('#contributions').hidden=!!p.articleOnly||!!p.workflow||['cloudgame','xidian'].includes(p.id);
    $('#ownership').hidden=!p.ownership;$('#ownership').textContent=p.ownership||'';$('#workflow').hidden=!p.workflow;
    $('#workflow').innerHTML=(p.workflow||[]).map((item,i)=>`<section>${icon(item.icon||['compass','agent','screen','route'][i%4])}<div><h3>${esc(item.title)}</h3><p>${esc(item.text)}</p></div></section>`).join('');
    $('#contributions').innerHTML=p.contributions.map(c=>`<li>${esc(c)}</li>`).join('');
    const mediaOrder=p.mediaOrder||[p.cover,...p.assets.filter(id=>id!==p.cover)];
    mediaList=p.articleOnly?[]:mediaOrder.map(id=>assets.get(id)).filter(usable);renderMedia();
    detailSpatial=!!exhibition&&!p.articleOnly;const dialog=$('#detail');dialog.dataset.ready='false';dialog.dataset.mediaLayout=mediaList.length+(p.articles?.length||0)>1?'collection':'single';
    document.body.classList.add('is-extracting');
    sound.island({id:null});sound.setDetail(true);dialog.showModal();dialog.scrollTop=0;$('#media').scrollTop=0;

    dialog.classList.remove('measuring');dialog.classList.add('detail-reveal');document.body.classList.add('detail-open');document.body.classList.remove('is-extracting');
    await delay(250);dialog.dataset.ready='true';$('#close-detail').focus({preventScroll:true});motionBusy=false;startVideos();
    if(!fromHistory)history.pushState({portfolioDetail:p.id,portfolioGallery:$('#major-gallery').open},'','#project='+encodeURIComponent(p.id));
    flushHistory();
  }
  async function closeDetail({fromHistory=false}={}){
    if(motionBusy||!$('#detail').open)return;motionBusy=true;$('#detail').dataset.ready='false';
    demoLinks.close();if($('#lightbox').open)closeLarge(false);videoObserver?.disconnect();stopMedia($('#detail'));
    $('#detail').classList.remove('detail-reveal');$('#detail').classList.add('detail-leave');document.body.classList.add('is-returning');
    await delay(160);$('#detail').close();if(detailSpatial&&exhibition)await exhibition.close();
    $('#detail').classList.remove('detail-leave');document.body.classList.remove('detail-open','is-returning');$('#media').innerHTML='';
    detailSpatial=false;motionBusy=false;sound.setDetail($('#major-gallery').open);sound.setAudibleVideo(false);renderTimeline(true);
    if(!fromHistory){if(history.state?.portfolioDetail)history.back();else history.replaceState(null,'',location.pathname+location.search);}
    (returnFocus?.isConnected?returnFocus:$('#explore')).focus({preventScroll:true});flushHistory();
  }
  function showLarge(){const a=mediaList[mediaIndex];stopMedia($('#large-media'));$('#large-media').innerHTML=mediaHtml(a);watchVideo($('#large-media'),a);$('#original-link').href=a.original;$('#original-link').textContent=isImage(a)?'打开原图 ↗':'打开原件 ↗';$('#large-prev').hidden=$('#large-next').hidden=mediaList.length<=1;$('#large-prev').disabled=mediaIndex===0;$('#large-next').disabled=mediaIndex===mediaList.length-1;const v=$('#large-media video');if(v)playVideo(v);}
  function openLarge(index=0){if(!mediaList[index])return;mediaIndex=index;videoObserver?.disconnect();stopMedia($('#media'));showLarge();$('#lightbox').showModal();}
  function closeLarge(resume=true){stopMedia($('#large-media'));$('#lightbox').close();$('#large-media').innerHTML='';const origin=$(`[data-expand="${mediaIndex}"]`)||$('#expand');origin.focus({preventScroll:true});if(resume)startVideos();}
  async function syncHistory({initial=false}={}){if(motionBusy){pendingHistory=true;return;}if(!initial)exhibition?.cancel();if($('#about').open)closeAbout();const id=new URLSearchParams(location.hash.slice(1)).get('project'),p=projects.find(q=>q.id===id);if($('#detail').open&&(!p||p!==projects[selected]))await closeDetail({fromHistory:true});if(location.hash==='#gallery'){openGallery({fromHistory:true});return;}if($('#major-gallery').open&&!p)closeGallery({fromHistory:true});if(id&&!p){history.replaceState(null,'',location.pathname+location.search);overview();return;}if(p&&!$('#detail').open)await openProject(p,{fromHistory:true});}
  function flushHistory(){if(pendingHistory){pendingHistory=false;syncHistory();}}
  addEventListener('popstate',syncHistory);addEventListener('hashchange',syncHistory);
  $('#overview').onclick=overview;$('#previous').onclick=()=>browse(-1);$('#next').onclick=()=>browse(1);$('#explore').onclick=()=>visitProject(selected);$('#title').onclick=()=>visitProject(selected);$('#title').onkeydown=e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();visitProject(selected);}};
  $('#close-detail').onclick=()=>closeDetail();$('#detail').addEventListener('cancel',e=>{e.preventDefault();closeDetail();});
  $('#expand').onclick=()=>openLarge(0);$('#close-lightbox').onclick=()=>closeLarge();$('#lightbox').addEventListener('cancel',e=>{e.preventDefault();closeLarge();});
  installBlankDismiss($('#detail'),()=>{if(!$('#lightbox').open)void closeDetail();});
  installBlankDismiss($('#lightbox'),()=>closeLarge());
  $('#large-prev').onclick=()=>{mediaIndex--;showLarge();};$('#large-next').onclick=()=>{mediaIndex++;showLarge();};
  document.addEventListener('keydown',e=>{if($('#demo-device-notice').open)return;if($('#about').open||($('#major-gallery').open&&!$('#detail').open))return;if(e.key==='Escape'&&!$('#detail').open){if(exhibition?.introActive||['walking','casting','opening'].includes(exhibition?.journey.phase))exhibition.cancel();else if(activeTheme)overview();return;}if(motionBusy||!['ArrowLeft','ArrowRight'].includes(e.key)||document.activeElement.tagName==='VIDEO')return;const d=e.key==='ArrowRight'?1:-1;if($('#lightbox').open){e.preventDefault();mediaIndex=Math.max(0,Math.min(mediaList.length-1,mediaIndex+d));showLarge();}else if(!$('#detail').open){e.preventDefault();browse(d);}});
  addEventListener('resize',()=>{if(!exhibition&&!$('#detail').open)renderTimeline();});
  try{if(new URLSearchParams(location.search).get('renderer')==='flat')throw new Error('Flat gallery');exhibition=new Exhibition({element:$('#stage'),projects,assets,onOverview:()=>{void sound.tap();overview();},onIslandSound:event=>sound.island(event),onAbout:()=>{void sound.tap();openAbout(exhibition.profileButton);},onWalk:(distance,moving)=>sound.walk(distance,moving),onPortal:(phase,token)=>sound.portal(phase,token),onSelect:(i,opts)=>opts?.visit?visitProject(i):select(i),onOpen:i=>openProject(projects[i]),onTheme:focusTheme,onFailure:()=>{$('.map-controls').hidden=true;exhibition=null;$('#stage canvas')?.remove();$('#stage').dataset.renderer='fallback';document.body.classList.remove('webgl-ready');renderTimeline();}});document.body.classList.add('webgl-ready');$('#stage').dataset.animation='idle';}catch(error){$('.map-controls').hidden=true;$('#stage canvas')?.remove();$('#stage').dataset.renderer='fallback';}
  $('.brand').innerHTML=pixelSVG('pixelcao');
  installBrandIdle($('.brand'),{motionQuery,reduced});
  $('#about-content').innerHTML=`<div class="about-heading"><div class="portrait" aria-hidden="true"><svg viewBox="0 0 32 40" shape-rendering="crispEdges"><path fill="#eee6cb" d="M14 1h4v4h2v6h3v7H9v-7h3V5h2zM5 18h22v3H5zM10 27h12v4h3v5H7v-5h3z"/><path fill="#35474c" d="M10 21h12v6H10zM10 36h5v4h-5zm7 0h5v4h-5z"/><path fill="#e4b35c" d="M12 23h2v2h-2zm6 0h2v2h-2zM15 28h2v8h-2z"/></svg></div><div><h2 id="about-title">曹一聪 <span>pixelcao</span></h2><p>T10 工程师 · 2016 年加入腾讯</p></div></div>
  <p class="about-lead">让想法成为可运行、可验证的产品。</p>
  <div class="about-skills">${[
    ['agent','Agent 系统','编排、上下文与工具调用，让智能体稳定完成任务。'],
    ['game','游戏联机','匹配、专用服务器托管与实时网络，从方案走到上线。'],
    ['screen','客户端体验','从 Windows 工具到交互展厅，连接系统能力与用户体验。'],
    ['compass','AI 协作','定义目标、做技术与设计取舍，用 Codex 实现并持续验证。']
  ].map(([key,title,text])=>`<section>${icon(key)}<h3>${title}</h3><p>${text}</p></section>`).join('')}</div>
  <div class="about-school">${icon('school')}<div>西安电子科技大学<span>智能科学与技术</span></div></div>
  <div class="about-links"><a href="https://github.com/yicongcao" target="_blank" rel="noopener">${icon('github')}GitHub ↗</a><a href="tel:18126045570">${icon('phone')}181 2604 5570</a><a href="/resume/" target="_blank" rel="noopener">完整简历 ↗</a></div>`;
  let aboutReturnFocus=null;
  function closeAbout(){$('#about').close();(aboutReturnFocus?.isConnected?aboutReturnFocus:$('.brand')).focus({preventScroll:true});exhibition?.wake();}
  function openAbout(origin=$('.brand')){sound.island({id:null});if(motionBusy||$('#detail').open||$('#about').open)return;aboutReturnFocus=origin;exhibition?.cancel();$('#about').showModal();$('#close-about').focus({preventScroll:true});}
  $('.brand').onclick=()=>openAbout();
  $('#close-about').onclick=closeAbout;$('#about').addEventListener('cancel',e=>{e.preventDefault();closeAbout();});
  gallery=installGallery({dialog:$('#major-gallery'),config:galleryConfig,projects,assets,reduced,onClose:()=>closeGallery(),onProject:(p,origin)=>{returnFocus=origin;exhibition?.locate(projects.indexOf(p));void openProject(p);}});
  function openGallery({fromHistory=false}={}){if(motionBusy||$('#detail').open||$('#major-gallery').open)return;galleryReturnFocus=document.activeElement===document.body?$('#open-gallery'):document.activeElement;exhibition?.cancel();sound.island({id:null});sound.setDetail(true);gallery.open();document.body.classList.add('gallery-open');if(!fromHistory)history.pushState({portfolioGallery:true},'','#gallery');}
  function closeGallery({fromHistory=false}={}){gallery.close();document.body.classList.remove('gallery-open');sound.setDetail(false);exhibition?.wake();if(!fromHistory){if(history.state?.portfolioGallery&&location.hash==='#gallery')history.back();else history.replaceState(null,'',location.pathname+location.search);}(galleryReturnFocus?.isConnected?galleryReturnFocus:$('#open-gallery')).focus({preventScroll:true});}
  $('#open-gallery').onclick=()=>openGallery();
  if(reduced())document.body.dataset.reduced='true';
  renderTimeline(true);
  if(exhibition)await exhibition.ready;
  if(!await boot.complete())return;
  syncHistory({initial:true});
  // Reflow projected label bounds after the local webfont replaces the fallback.
  document.fonts?.ready.then(()=>exhibition?.wake());
})().catch(error=>{window.portfolioBoot?.fail(error);document.querySelector('#title').textContent='作品暂时无法加载';document.querySelector('#summary').textContent='请刷新页面重试，或查看简历。';console.error(error);});
