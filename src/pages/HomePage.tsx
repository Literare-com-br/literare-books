import App from '../App';
import { PublishedContent } from '../components/PublishedContent';
import { useEffect,useState } from 'react';
export default function HomePage(){
  const [ready,setReady]=useState(()=>document.fonts.check('700 100px NewJune'));
  useEffect(()=>{let active=true;void document.fonts.load('700 100px NewJune').finally(()=>{if(active)setReady(true);});return()=>{active=false;};},[]);
  return ready?<PublishedContent><App /></PublishedContent>:<main className="route-loading" role="status">Carregando a Literare…</main>;
}
