import { publicConfig } from './public-config';
const buckets=['coauthor-book-covers','catalog-book-covers','institutional-images'];
const cache=new Map<string,{expires:number;url:Promise<string>}>();
let actor='anon';
let listening=false;
export function managedAsset(src: string | undefined) {
  if(!src||publicConfig.error)return null;
  try{
    const url=new URL(src),expected=new URL(publicConfig.url);
    if(url.origin!==expected.origin)return null;
    const match=url.pathname.match(/^\/storage\/v1\/object\/(?:public|authenticated|sign)\/([^/]+)\/(.+)$/);
    if(!match||!buckets.includes(match[1]))return null;
    const path=decodeURIComponent(match[2]);
    if(!/^[a-f0-9-]{36}\/[a-f0-9-]{36}\/[a-f0-9-]{36}\.(jpg|png|webp)$/.test(path))return null;
    return {bucket:match[1],path};
  }catch{return null;}
}
export async function storageAssetUrl(bucket:string,path:string,publicFallback=false):Promise<string> {
  const {supabase}=await import('./supabase');
  if(!supabase||!buckets.includes(bucket))throw new Error('Imagem indisponível.');
  if(!listening){listening=true;supabase.auth.onAuthStateChange((_event,session)=>{const next=session?.user.id||'anon';if(next!==actor){actor=next;cache.clear();}});}
  const key=`${actor}:${bucket}:${path}:${publicFallback}`,old=cache.get(key);
  if(old&&old.expires>Date.now())return old.url;
  if(cache.size>=200)cache.delete(cache.keys().next().value!);
  const client=supabase;
  const url=client.storage.from(bucket).createSignedUrl(path,60).then(({data,error})=>{
    if(!error&&data?.signedUrl)return data.signedUrl;
    cache.delete(key);
    // Compatibility for existing published covers before the private-bucket
    // migration. A private bucket never serves this public endpoint.
    if(publicFallback)return client.storage.from(bucket).getPublicUrl(path).data.publicUrl;
    throw new Error('Não foi possível carregar esta imagem.');
  });
  cache.set(key,{expires:Date.now()+50000,url});return url;
}
