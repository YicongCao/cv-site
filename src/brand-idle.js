// A five-second idle beat, interrupted immediately by real visitor input.
export function installBrandIdle(brand,{motionQuery,reduced}){
  let timer;
  const letters=brand.querySelectorAll('.pixel-letter');
  const stop=()=>{clearTimeout(timer);brand.classList.remove('brand-idle');};
  const allowed=()=>!document.hidden&&!reduced()&&!document.querySelector('dialog[open]');
  function schedule(){
    clearTimeout(timer);
    if(document.hidden||reduced())return;
    timer=setTimeout(()=>{
      if(allowed())brand.classList.add('brand-idle');
      schedule();
    },5000);
  }
  function activity(){stop();schedule();}
  brand.addEventListener('animationend',event=>{
    if(event.animationName==='pixelLetterHop'&&event.target===letters[letters.length-1])brand.classList.remove('brand-idle');
  });
  for(const type of ['pointermove','pointerdown','keydown','wheel','scroll'])document.addEventListener(type,activity,{passive:true,capture:true});
  document.addEventListener('visibilitychange',activity);
  motionQuery.addEventListener('change',activity);
  schedule();
}
