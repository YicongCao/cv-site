const demos = {
  noartfps: {url:'https://yicongcao.github.io/No-Art-FPS/', label:'打开 No-Art-FPS', action:'在线试玩'},
  museum: {url:'https://yicongcao.github.io/photo-museum-demo/', label:'打开 PhotoMuseum', action:'在线观展'},
  brushline: {url:'https://yicongcao.github.io/Brushline-Rally-web/', label:'打开 Brushline Rally', action:'在线试玩'},
};

export function installDemoLinks(link, dialog, nativePanel = null) {
  const image=link.querySelector('img'), action=link.querySelector('[data-demo-action]');
  const host=link.querySelector('[data-demo-host]'), proceed=dialog.querySelector('[data-demo-continue]');
  let origin=null;
  const close=()=>{if(dialog.open)dialog.close();};
  link.addEventListener('click',event=>{
    if(link.href===demos.noartfps.url)return;
    if(!matchMedia('(max-width: 850px), (pointer: coarse)').matches)return;
    event.preventDefault();origin=link;
    proceed.href=link.href;
    dialog.querySelector('[data-demo-name]').textContent=link.getAttribute('aria-label').replace('打开 ','').replace('（新标签页）','');
    if(!dialog.open)dialog.showModal();
    dialog.querySelector('[data-demo-cancel]').focus();
  });
  dialog.querySelector('[data-demo-cancel]').addEventListener('click',close);
  proceed.addEventListener('click',close);
  dialog.addEventListener('close',()=>{if(origin?.isConnected)origin.focus({preventScroll:true});origin=null;});
  dialog.addEventListener('click',event=>{
    if(event.target!==dialog)return;
    const r=dialog.getBoundingClientRect();
    if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)close();
  });
  return {
    close,
    setProject(project){
      const demo=demos[project.id];link.hidden=!demo;
      if(nativePanel)nativePanel.hidden=project.id!=='brushline';
      if(project.id==='brushline')link.setAttribute('aria-describedby','rally-experience-note');
      else link.removeAttribute('aria-describedby');
      if(!demo){link.removeAttribute('href');image.removeAttribute('src');return;}
      link.href=demo.url;link.setAttribute('aria-label',demo.label+'（新标签页）');
      image.src=project.coverSrc;action.textContent=demo.action;
      host.textContent=new URL(demo.url).hostname;
    }
  };
}
