import { useEffect, useRef, useState } from 'react';
import { BlurReveal } from './blur-reveal';
type Turnstile = {render:(element:HTMLElement,options:Record<string,unknown>)=>string;remove:(id:string)=>void};
declare global { interface Window {turnstile?:Turnstile} }
let script:Promise<void>|null=null;
function load() {
  if(window.turnstile)return Promise.resolve();
  if(!script)script=new Promise<void>((resolve,reject)=>{
    const el=document.createElement('script');el.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';el.async=true;
    el.onload=()=>resolve();el.onerror=()=>{script=null;el.remove();reject(new Error('Challenge unavailable'));};document.head.append(el);
  });
  return script;
}
export default function ContactChallenge({onToken}:{onToken:(token:string)=>void}) {
  const ref=useRef<HTMLDivElement>(null),[error,setError]=useState('');
  const sitekey=import.meta.env.VITE_TURNSTILE_SITE_KEY;
  useEffect(()=>{
    if(!sitekey)return;
    let active=true,id:string|undefined;
    void load().then(()=>{if(!active||!ref.current||!window.turnstile)return;id=window.turnstile.render(ref.current,{sitekey,action:'contact_submit',size:'flexible',callback:(token:string)=>onToken(token),'expired-callback':()=>onToken(''),'error-callback':()=>{onToken('');setError('Não foi possível concluir a verificação. Recarregue a página para tentar novamente.');}});}).catch(()=>{if(active)setError('Verificação indisponível. Tente novamente mais tarde.');});
    return()=>{active=false;if(id)window.turnstile?.remove(id);};
  },[sitekey,onToken]);
  return <div className="contact-challenge"><div ref={ref} />{(!sitekey||error)&&<p><BlurReveal as="span">{error||'O envio está temporariamente indisponível. Tente novamente mais tarde.'}</BlurReveal></p>}</div>;
}
