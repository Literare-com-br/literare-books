import { lazy,Suspense,useEffect,useRef,useState } from 'react';
const Timeline=lazy(()=>import('../components/ui/timeline'));
export default function FeaturesSection(){
  const ref=useRef<HTMLDivElement>(null);const [near,setNear]=useState(false);
  useEffect(()=>{const observer=new IntersectionObserver(([entry])=>{if(entry.isIntersecting){setNear(true);observer.disconnect()}},{rootMargin:'1000px'});if(ref.current)observer.observe(ref.current);return()=>observer.disconnect()},[]);
  return <div ref={ref}>{near?<Suspense fallback={<div id="diferenciais" className="timeline-placeholder"/>}><Timeline/></Suspense>:<div id="diferenciais" className="timeline-placeholder"/>}</div>;
}
