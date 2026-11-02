// Download decoded bytes, not Content-Length (which can describe compressed bytes).
export async function readResource(url,{fetcher=fetch,signal,onProgress=()=>{}}={}){
  const response=await fetcher(url,{signal});
  if(!response.ok)throw new Error(`Resource ${response.status}: ${url}`);
  if(!response.body){const bytes=new Uint8Array(await response.arrayBuffer());onProgress(bytes.length);return bytes;}
  const reader=response.body.getReader(),chunks=[];let length=0;
  try{for(;;){const {done,value}=await reader.read();if(done)break;chunks.push(value);length+=value.length;onProgress(length);}}
  finally{reader.releaseLock();}
  const bytes=new Uint8Array(length);let offset=0;
  for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  return bytes;
}

export function startBoot(manifest){
  const mark=name=>window.__cvBootTrace?.mark(name);mark('boot-enter');
  const $=id=>document.getElementById(id),loader=$('site-loader'),shell=$('app-shell');
  const required=manifest.filter(r=>r.id!=='font');
  const controller=new AbortController(),fontController=new AbortController(),loaded=new Map(),total=required.reduce((n,r)=>n+r.size,0);
  let done=false,failed=false,percent=0;
  const progress=(next,label)=>{
    percent=Math.max(percent,Math.min(100,Math.floor(next)));
    $('load-progress').setAttribute('aria-valuenow',String(percent));
    $('load-progress').firstElementChild.style.width=`${percent}%`;
    if(label)$('load-status').textContent=label;
  };
  const slow=setTimeout(()=>{if(!done&&!failed){loader.dataset.slow='true';$('load-status').textContent='仍在加载，你可以继续等待，或先查看简历。';mark('slow-notice');}},5000);
  let deadline;
  // Hidden documents may suspend their first WebGL frame. Give a returning
  // visitor a fresh visible timeout instead of failing while the tab is hidden.
  function armDeadline(){clearTimeout(deadline);if(!done&&!failed&&!document.hidden)deadline=setTimeout(()=>fail(new Error('Startup timed out')),45000);}
  document.addEventListener?.('visibilitychange',armDeadline);armDeadline();
  function clear(){clearTimeout(slow);clearTimeout(deadline);document.removeEventListener?.('visibilitychange',armDeadline);removeEventListener('error',scriptError);}
  function fail(error){
    if(done||failed)return;failed=true;controller.abort();fontController.abort();clear();loader.dataset.phase='error';mark('boot-error');
    $('load-status').textContent='加载暂时中断，请重试或查看简历。';
    $('load-retry').hidden=false;$('load-resume').hidden=false;console.error('Portfolio startup:',error);
  }
  function scriptError(event){if(event.error)fail(event.error);}
  addEventListener('error',scriptError);
  $('load-retry').onclick=()=>location.reload();
  const boot=window.portfolioBoot={
    data:null,gallery:null,fail,
    async complete(){
      if(done)return true;if(failed)return false;done=true;clear();progress(100,'展馆已就绪');loader.dataset.phase='ready';mark('scene-ready');
      shell.inert=false;shell.setAttribute('aria-busy','false');
      if(loader.contains(document.activeElement))document.querySelector('.brand')?.focus({preventScroll:true});
      // The scene already rendered its first frame. No additional rAF gate.
      loader.classList.add('leaving');
      setTimeout(()=>{loader.hidden=true;mark('loader-hidden');},matchMedia('(prefers-reduced-motion: reduce)').matches?0:160);
      return true;
    }
  };
  // Start I/O immediately; painting must never gate resource discovery.
  (async()=>{
    try{
      mark('fetch-start');
      const results=await Promise.all(required.map(resource=>readResource(resource.url,{signal:controller.signal,onProgress:n=>{
        if(failed||done)return;
        loaded.set(resource.id,Math.min(n,resource.size));
        progress(92*[...loaded.values()].reduce((a,b)=>a+b,0)/total);
      }})));
      mark('resources-ready');if(failed)return;
      const resources=Object.fromEntries(required.map((r,i)=>[r.id,results[i]])),text=bytes=>new TextDecoder().decode(bytes);
      progress(94,'正在整理作品');loader.dataset.phase='prepare';
      boot.data=JSON.parse(text(resources.data));boot.gallery=JSON.parse(text(resources.gallery));
      const style=document.createElement('style');style.textContent=text(resources.style);document.head.append(style);
      if(failed)return;
      progress(97,'正在搭建展馆');loader.dataset.phase='render';mark('app-execute');
      const script=document.createElement('script');script.textContent=text(resources.app);document.body.append(script);
    }catch(error){fail(error);}
  })();
  // Optional fonts never block the app, including stalled transfers or decode.
  const optionalFont=manifest.find(r=>r.id==='font');
  if(optionalFont&&typeof FontFace!=='undefined'){
    const fontDeadline=setTimeout(()=>fontController.abort(),8000);
    (async()=>{
      try{
        const bytes=await readResource(optionalFont.url,{signal:fontController.signal});
        const font=await new FontFace('Ark Pixel',bytes,{weight:'400',style:'normal',display:'swap'}).load();
        if(!failed&&!fontController.signal.aborted){document.fonts.add(font);mark('font-ready');}
      }catch{mark('font-fallback');}
      finally{clearTimeout(fontDeadline);}
    })();
  }
  return boot;
}
