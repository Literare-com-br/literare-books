import { publicConfig } from './public-config';
import type { Content } from '../types/dashboard';
export async function fetchPublishedContent(signal: AbortSignal): Promise<Content[]> {
  if(publicConfig.error)return [];
  const response=await fetch(`${publicConfig.url}/rest/v1/site_content?select=key,state,title,body,image_url,items,updated_at&state=eq.published`,{headers:{apikey:publicConfig.key},signal});
  if(!response.ok)throw new Error('Não foi possível atualizar o conteúdo institucional.');
  const data=await response.json();return Array.isArray(data)?data:[];
}
