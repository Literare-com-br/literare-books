import { createElement, useLayoutEffect, useRef, type CSSProperties, type JSX } from 'react';
import { registerReveal } from '../../lib/reveal-engine';

export interface BlurRevealProps {
  children:string; className?:string; delay?:number; speedReveal?:number; speedSegment?:number;
  intensity?:number; trigger?:boolean; onAnimationComplete?:()=>void; onAnimationStart?:()=>void;
  as?:keyof JSX.IntrinsicElements; style?:CSSProperties; inView?:boolean; once?:boolean; letterSpacing?:string|number;
  segmentation?:'auto'|'words'|'text';
}
export function BlurReveal({children,className,delay=0,speedReveal=1.5,speedSegment=.5,intensity=12,
  trigger=true,onAnimationComplete,onAnimationStart,as='p',style,inView=true,once=true,letterSpacing,segmentation='auto'}:BlurRevealProps){
  const root=useRef<HTMLElement>(null);
  const visual=useRef<HTMLSpanElement>(null);
  const callbacks=useRef({onAnimationComplete,onAnimationStart});
  useLayoutEffect(()=>{callbacks.current={onAnimationComplete,onAnimationStart}},[onAnimationComplete,onAnimationStart]);
  useLayoutEffect(()=>{
    if(!trigger||!root.current||!visual.current)return;
    return registerReveal(root.current,visual.current,children,{delay,speedReveal,speedSegment,intensity,once,inView,letterSpacing,segmentation,
      onStart:()=>callbacks.current.onAnimationStart?.(),onComplete:()=>callbacks.current.onAnimationComplete?.()});
  },[children,delay,speedReveal,speedSegment,intensity,once,inView,letterSpacing,trigger,segmentation]);
  if(!trigger)return null;
  return createElement(as,{ref:root,className:`blur-reveal ${className??''}`,style},
    <span className="sr-only">{children}</span>,<span ref={visual} className="blur-visual" aria-hidden="true"/>);
}
export default BlurReveal;
