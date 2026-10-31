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
  const $=id=>document.getElementById(id),loader=$('site-loader'),shell=$('app-shell');
  const controller=new AbortController(),loaded=new Map(),total=manifest.reduce((n,r)=>n+r.size,0);
  let done=false,failed=false,percent=0;
  const progress=(next,label)=>{
    percent=Math.max(percent,Math.min(100,Math.floor(next)));
    $('load-percent').textContent=`${percent}%`;
    $('load-progress').setAttribute('aria-valuenow',String(percent));
    $('load-progress').firstElementChild.style.width=`${percent}%`;
    if(label)$('load-status').textContent=label;
  };
  const slow=setTimeout(()=>{if(!done&&!failed)$('load-note').textContent='资源仍在加载，网络可能较慢。'},12000);
  const deadline=setTimeout(()=>fail(new Error('Startup timed out')),45000);
  function clear(){clearTimeout(slow);clearTimeout(deadline);removeEventListener('error',scriptError);}
  function fail(error){
    if(done||failed)return;failed=true;controller.abort();clear();loader.dataset.phase='error';
    $('load-status').textContent='加载暂时中断';$('load-note').textContent='请重试，或先查看简历。';
    $('load-retry').hidden=false;console.error('Portfolio startup:',error);
  }
  function scriptError(event){if(event.error)fail(event.error);}
  addEventListener('error',scriptError);
  $('load-retry').onclick=()=>location.reload();
  const boot=window.portfolioBoot={
    data:null,gallery:null,fail,
    async complete(){
      if(done)return true;if(failed)return false;done=true;clear();progress(100,'展馆已就绪');loader.dataset.phase='ready';
      shell.inert=false;shell.setAttribute('aria-busy','false');
      if(loader.contains(document.activeElement))document.querySelector('.brand')?.focus({preventScroll:true});
      // Let 100% paint once, then release the screen. No artificial minimum wait.
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      loader.classList.add('leaving');
      setTimeout(()=>{loader.hidden=true;},matchMedia('(prefers-reduced-motion: reduce)').matches?0:160);
      return true;
    }
  };
  // Paint the inline loader before starting work, including a warm-cache visit.
  requestAnimationFrame(()=>requestAnimationFrame(async()=>{
    try{
      const results=await Promise.all(manifest.map(async resource=>{
        try{
          return await readResource(resource.url,{signal:controller.signal,onProgress:n=>{
            if(failed||done)return;
            loaded.set(resource.id,Math.min(n,resource.size));
            progress(92*[...loaded.values()].reduce((a,b)=>a+b,0)/total);
          }});
        }catch(error){
          if(resource.id!=='font'||controller.signal.aborted)throw error;
          loaded.set(resource.id,resource.size);return null; // A missing font must not block access.
        }
      }));
      if(failed)return;
      const resources=Object.fromEntries(manifest.map((r,i)=>[r.id,results[i]])),text=bytes=>new TextDecoder().decode(bytes);
      progress(94,'正在整理作品');loader.dataset.phase='prepare';
      boot.data=JSON.parse(text(resources.data));boot.gallery=JSON.parse(text(resources.gallery));
      const style=document.createElement('style');style.textContent=text(resources.style);document.head.append(style);
      if(resources.font&&typeof FontFace!=='undefined'){
        try{
          const font=await new FontFace('Ark Pixel',resources.font,{weight:'400',style:'normal',display:'swap'}).load();
          if(failed)return;document.fonts.add(font);
        }catch(error){console.warn('Using fallback font:',error);}
      }
      if(failed)return;
      progress(97,'正在搭建展馆');loader.dataset.phase='render';
      // Give the preparation message a frame before synchronous WebGL construction.
      await new Promise(resolve=>requestAnimationFrame(resolve));
      if(failed)return;
      const script=document.createElement('script');script.textContent=text(resources.app);document.body.append(script);
    }catch(error){fail(error);}
  }));
  return boot;
}
