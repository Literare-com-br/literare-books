import ResponsiveImage from '../ui/responsive-image';
import { useEffect, useState } from 'react';
import { catalogSchema } from '../../lib/dashboard-validation';
import { assetUrl, saveCatalog } from '../../lib/dashboard';
import { Feedback, useOperation } from './shared';
import type { CatalogBook, CatalogInput } from '../../types/dashboard';
export default function CatalogForm({ book, saved, cancel }: {book: CatalogBook | null; saved: (message: string) => void; cancel: () => void}) {
  const [values, setValues] = useState<CatalogInput>(book ?? {title:'',authors:[],isbn:'',synopsis:'',category:'',purchase_url:'',publication_status:'draft'});
  const [authors, setAuthors] = useState(book?.authors.join('\n') ?? ''), [file, setFile] = useState<File | null>(null), [preview, setPreview] = useState(''), [validation, setValidation] = useState('');
  const op = useOperation();
  useEffect(() => { if (!file) return; const url = URL.createObjectURL(file); setPreview(url); return () => URL.revokeObjectURL(url); }, [file]);
  return <form aria-busy={op.busy} onSubmit={e => { e.preventDefault(); const parsed = catalogSchema.safeParse({...values,authors:authors.split('\n').map(v=>v.trim()).filter(Boolean)}); if (!parsed.success) { setValidation(parsed.error.issues.map(i=>i.message).join(' ')); return; } setValidation(''); void op.run(async () => { const message = await saveCatalog(parsed.data,file,book); saved(message); }); }}><fieldset disabled={op.busy}><div className="dash-form-grid">
    <label>Título do livro<input required maxLength={180} value={values.title} onChange={e=>setValues({...values,title:e.target.value})} /></label><label>Categoria<input required maxLength={100} value={values.category} onChange={e=>setValues({...values,category:e.target.value})} /></label>
    <label className="dash-full">Autores (um por linha)<textarea required maxLength={3000} rows={3} value={authors} onChange={e=>setAuthors(e.target.value)} /></label><label>ISBN<input maxLength={30} value={values.isbn} onChange={e=>setValues({...values,isbn:e.target.value})} /></label><label>Status de publicação<select value={values.publication_status} onChange={e=>setValues({...values,publication_status:e.target.value as CatalogInput['publication_status']})}><option value="draft">Rascunho</option><option value="published">Publicado</option></select></label>
    <label className="dash-full">Sinopse<textarea rows={6} maxLength={12000} value={values.synopsis} onChange={e=>setValues({...values,synopsis:e.target.value})} /></label><label className="dash-full">Link de compra<input type="url" maxLength={2000} value={values.purchase_url} onChange={e=>setValues({...values,purchase_url:e.target.value})} /></label><label className="dash-full">Capa do livro<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setFile(e.target.files?.[0] ?? null)} /><small>JPG, PNG ou WebP, até 5 MB.</small></label>
    {(file || book?.cover_path) && <ResponsiveImage className="dash-cover-preview" src={file ? preview : assetUrl('catalog-book-covers',book?.cover_path ?? null)} alt="Pré-visualização da capa" />}
    </div>{validation && <p role="alert" className="dash-error">{validation}</p>}<Feedback {...op} /><div className="dash-row-actions"><button className="dash-primary" type="submit">{op.busy?'Salvando…':'Salvar livro'}</button><button type="button" onClick={cancel}>Cancelar</button></div></fieldset></form>;
}
