import {useEffect,useRef,useState} from 'react';
const callbacks=new Map<Element,()=>void>();
let observer:IntersectionObserver|undefined;
export function useNearViewport(){
  const ref=useRef<HTMLDivElement>(null);const [near,setNear]=useState(false);
  useEffect(()=>{
    if(!ref.current)return;const element=ref.current;
    observer??=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){callbacks.get(entry.target)?.();callbacks.delete(entry.target);observer?.unobserve(entry.target)}},{rootMargin:'1200px'});
    callbacks.set(element,()=>setNear(true));observer.observe(element);
    return()=>{callbacks.delete(element);observer?.unobserve(element);if(!callbacks.size){observer?.disconnect();observer=undefined}};
  },[]);
  return {ref,near};
}
