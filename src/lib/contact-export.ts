import {rpc, escapeSearch, type ListFilters} from './dashboard';
import type {Contact} from '../types/dashboard';
export {contactsCSV, contactExportRows, contactHeaders} from './contact-export-format';
export async function fetchContactsForExport(filters:ListFilters,signal:AbortSignal,onProgress:(count:number)=>void) {
  const snapshot=new Date().toISOString(),rows:Contact[]=[];
  let cursor:Contact|undefined;
  while(true){
    signal.throwIfAborted();
    const page=await rpc<Contact[]>('export_contacts_page',{p_search:escapeSearch(filters.search),p_status:filters.status||'',p_area:filters.area||'',p_from:filters.from||null,p_to:filters.to||null,p_ascending:filters.ascending||false,p_snapshot:snapshot,p_cursor_at:cursor?.created_at||null,p_cursor_id:cursor?.id||null},signal);
    if(!Array.isArray(page)||page.length>500)throw new Error('Resposta de exportação inválida.');
    if(page.length&&cursor&&page.at(-1)?.id===cursor.id)throw new Error('Não foi possível avançar na exportação. Tente novamente.');
    rows.push(...page);onProgress(rows.length);
    if(page.length<500)return rows;
    cursor=page.at(-1);
    if(rows.length>=1048575)throw new Error('A exportação excede o limite de linhas do Excel. Selecione um período menor.');
  }
}
export function downloadExport(data:Blob,extension:'csv'|'xlsx') {
  const url=URL.createObjectURL(data),link=document.createElement('a');link.href=url;link.download=`literare-contatos-${new Date().toISOString().slice(0,10)}.${extension}`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

