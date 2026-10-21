import { useEffect, useRef, useState } from 'react';
import type { ImgHTMLAttributes } from 'react';
import { storageAssetUrl } from '../../lib/storage-assets';
export default function StorageImage({bucket,path,publicFallback=false,...props}:ImgHTMLAttributes<HTMLImageElement>&{bucket:string;path:string;publicFallback?:boolean}) {
  const ref=useRef<HTMLImageElement>(null),[visible,setVisible]=useState(props.loading!=='lazy');
  const [source,setSource]=useState<{path:string;url:string}|null>(null);
  useEffect(()=>{
    if(visible||!ref.current)return;
    const observer=new IntersectionObserver(([entry])=>{if(entry.isIntersecting){setVisible(true);observer.disconnect();}},{rootMargin:'300px'});
    observer.observe(ref.current);return()=>observer.disconnect();
  },[visible]);
  useEffect(()=>{
    if(!visible)return;let active=true;
    void storageAssetUrl(bucket,path,publicFallback).then(url=>{if(active)setSource({path,url});}).catch(()=>{if(active)setSource(null);});
    return()=>{active=false;};
  },[bucket,path,publicFallback,visible]);
  return <img {...props} ref={ref} src={source?.path===path?source.url:undefined} decoding="async" />;
}
