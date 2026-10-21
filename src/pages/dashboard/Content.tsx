import { useEffect, useState } from 'react';
import { useDashboard } from '../../components/dashboard/context';
import { Feedback, QueryState, useOperation } from '../../components/dashboard/shared';
import { useDashboardQuery } from '../../hooks/use-dashboard-query';
import { assetUrl, cleanupAsset, fetchContent, saveContent, uploadAsset } from '../../lib/dashboard';
import { contentDefaults, contentLabels } from '../../data/content-defaults';
import type { Content, ContentKey } from '../../types/dashboard';
import ResponsiveImage from '../../components/ui/responsive-image';
export default function ContentPage() {
  const query=useDashboardQuery(fetchContent), {canWrite}=useDashboard();
  const [key,setKey]=useState<ContentKey>('hero');
  const [version,setVersion]=useState<Content['state']>('draft');
  return <><div className="dash-page-heading"><div><span className="dash-eyebrow">IDENTIDADE E NARRATIVA</span><h1>Conteúdo do site</h1><p>Edite textos e imagens preservando a estrutura institucional.</p></div></div><QueryState {...query} retry={query.reload} />{query.data && <><label className="dash-content-selector">Seção do site<select value={key} onChange={e=>setKey(e.target.value as ContentKey)}>{Object.entries(contentLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label><label className="dash-content-selector">Versão para editar<select value={version} onChange={e=>setVersion(e.target.value as Content["state"])}><option value="draft">Rascunho (ou publicação atual)</option><option value="published">Publicação atual</option></select></label><ContentEditor key={`${key}:${version}:${JSON.stringify(query.data)}`} initial={query.data.find(c=>c.key===key&&c.state===version) ?? query.data.find(c=>c.key===key&&c.state==='published') ?? contentDefaults[key]} writable={canWrite('conteudo')} reload={query.reload} /></>}</>;
}
function ContentEditor({initial,writable,reload}:{initial:Content;writable:boolean;reload:()=>void}) {
  const [value,setValue]=useState(initial),[items,setItems]=useState(initial.items.join('\n')),[file,setFile]=useState<File|null>(null),op=useOperation();
  const [imagePreview,setImagePreview]=useState('');
  useEffect(()=>{if(!file)return;const url=URL.createObjectURL(file);setImagePreview(url);return()=>URL.revokeObjectURL(url);},[file]);
  const hasImage=['about_1','about_2','about_3','banner'].includes(value.key);
  async function save(state:Content['state']) {
    const categories=items.split('\n').map(v=>v.trim()).filter(Boolean);
    if (value.key==='categories' && (categories.length<1||categories.length>12||categories.some(v=>v.length>48))) throw new Error('Use de 1 a 12 categorias com até 48 caracteres cada.');
    let uploaded:string|null=null;
    if (file) uploaded=await uploadAsset('institutional-images',crypto.randomUUID(),file);
    try { await saveContent({...value,state,items:value.key==='categories'?categories:[],image_url:uploaded?assetUrl('institutional-images',uploaded):value.image_url}); }
    catch(e) { await cleanupAsset('institutional-images',uploaded); throw e; }
    return state==='published'?'Conteúdo publicado. Atualize a página pública para visualizar.':'Rascunho salvo. O conteúdo público foi preservado.';
  }
  return <div className="dash-content-grid"><form className="dash-card" onSubmit={e=>{e.preventDefault();void op.run(()=>save('draft'));}}><fieldset disabled={!writable||op.busy}><p className="dash-muted">Versão carregada: {initial.state==='draft'?'rascunho':'publicada ou conteúdo original'}. Salvar rascunho preserva a publicação atual.</p><label>Título<input required aria-label="Título" maxLength={100} value={value.title} onChange={e=>setValue({...value,title:e.target.value})} /><small>{value.title.length}/100 caracteres</small></label><label>Texto de apoio<textarea rows={6} maxLength={600} value={value.body} onChange={e=>setValue({...value,body:e.target.value})} /><small>{value.body.length}/600 caracteres</small></label>{value.key==='categories' && <label>Categorias (uma por linha)<textarea rows={8} maxLength={600} value={items} onChange={e=>setItems(e.target.value)} /></label>}{hasImage&&<><label>Endereço da imagem<input maxLength={2000} value={value.image_url} onChange={e=>setValue({...value,image_url:e.target.value})} pattern="(https://.*|/images/.*)" /></label><label>Enviar imagem<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setFile(e.target.files?.[0]??null)} /><small>JPG, PNG ou WebP, até 5 MB. Salve para enviar a imagem.</small></label></>}<div className="dash-row-actions"><button type="submit">Salvar rascunho</button><button className="dash-primary" type="button" onClick={e=>{if(e.currentTarget.form?.reportValidity()) void op.run(()=>save('published'));}}>Publicar alterações</button></div></fieldset><Feedback {...op} />{op.message && <button type="button" onClick={reload}>Recarregar versões salvas</button>}</form><section className="dash-card dash-content-preview" aria-label="Pré-visualização"><span className="dash-eyebrow">PRÉ-VISUALIZAÇÃO DO CONTEÚDO</span><h2>{value.title}</h2><p>{value.body}</p>{hasImage&&(imagePreview||value.image_url)&&<ResponsiveImage src={imagePreview||value.image_url} alt="Pré-visualização institucional" />}{value.key==='categories' && <ol>{items.split('\n').filter(Boolean).map((item,i)=><li key={i}>{item}</li>)}</ol>}<small>A tipografia e os limites do site são preservados na publicação.</small></section></div>;
}



