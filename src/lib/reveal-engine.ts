export interface RevealOptions {
  delay:number; speedReveal:number; speedSegment:number; intensity:number; once:boolean;
  inView:boolean; letterSpacing?:string|number; onStart?:()=>void; onComplete?:()=>void;
  segmentation?:'auto'|'words'|'text';
}
type Entry={start:()=>void;reset:()=>void;once:boolean};
const entries=new Map<Element,Entry>();
let observer:IntersectionObserver|undefined;
const motionQuery=matchMedia('(prefers-reduced-motion: reduce)');
const onMotionChange=()=>{if(motionQuery.matches)for(const entry of entries.values())entry.start()};
function sharedObserver(){
  return observer??=new IntersectionObserver(records=>{
    for(const record of records){const entry=entries.get(record.target);if(!entry)continue;
      if(record.isIntersecting){entry.start();if(entry.once)observer?.unobserve(record.target)}
      else if(!entry.once)entry.reset();
    }
  },{threshold:.12});
}

// One viewport observer for the entire site. Native CSS animations do the work;
// there are no Motion components, React state updates or RAF callbacks per letter.
export function registerReveal(root:HTMLElement,visual:HTMLElement,text:string,options:RevealOptions){
  const reduced=motionQuery;
  const fragment=document.createDocumentFragment();
  const long=text.length>180;
  let segment=0;
  for(const word of options.segmentation==='text'?[text]:text.split(/(\s+)/)){
    if(/^\s+$/.test(word)){fragment.append(document.createTextNode(word));continue}
    const wrapper=document.createElement('span');wrapper.className='blur-word';
    for(const token of long||options.segmentation==='words'||options.segmentation==='text'?[word]:Array.from(word)){
      const letter=document.createElement('span');letter.className='blur-letter';letter.textContent=token;
      letter.style.setProperty('--reveal-delay',`${options.delay+segment++*Math.min(.03/Math.max(options.speedReveal,.01),1.1/Math.max(text.length,1))}s`);
      if(options.letterSpacing!==undefined)letter.style.marginRight=typeof options.letterSpacing==='number'?`${options.letterSpacing}px`:options.letterSpacing;
      wrapper.append(letter);
    }
    fragment.append(wrapper);
  }
  visual.replaceChildren(fragment);
  root.style.setProperty('--reveal-duration',`${.3/Math.max(options.speedSegment,.01)}s`);
  root.style.setProperty('--reveal-blur',`${options.intensity}px`);
  let started=false,complete=false;
  const start=()=>{if(started){if(reduced.matches)finish();return}started=true;root.dataset.reveal='running';options.onStart?.();if(reduced.matches)finish()};
  const finish=()=>{if(complete)return;complete=true;root.dataset.reveal='done';options.onComplete?.()};
  const last=visual.querySelector('.blur-word:last-child .blur-letter:last-child');
  const onEnd=(event:AnimationEvent)=>{if(event.target===last)finish()};
  const onFocus=()=>{start();finish()};
  const focusOwner=root.closest('a,button,summary')??root;
  root.dataset.reveal='pending';
  visual.addEventListener('animationend',onEnd);
  focusOwner.addEventListener('focusin',onFocus);
  if(!entries.size)motionQuery.addEventListener('change',onMotionChange);
  entries.set(root,{start,once:options.once,reset:()=>{started=false;complete=false;root.dataset.reveal='pending'}});
  if(reduced.matches||!options.inView){start();if(reduced.matches)finish()}else sharedObserver().observe(root);
  return()=>{observer?.unobserve(root);entries.delete(root);visual.removeEventListener('animationend',onEnd);focusOwner.removeEventListener('focusin',onFocus);if(!entries.size){observer?.disconnect();observer=undefined;motionQuery.removeEventListener('change',onMotionChange)}};
}
