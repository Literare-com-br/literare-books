import ResponsiveImage from '../../components/ui/responsive-image';
import { useDebouncedValue } from '../../hooks/use-debounced-value';
import { useCallback, useState } from 'react';
import { Plus } from 'lucide-react';
import { useDashboard } from '../../components/dashboard/context';
import CatalogForm from '../../components/dashboard/CatalogForm';
import { Feedback, Panel, Pagination, QueryState, dateLabel, useOperation } from '../../components/dashboard/shared';
import { useDashboardQuery } from '../../hooks/use-dashboard-query';
import { assetUrl, deleteCatalog, fetchList } from '../../lib/dashboard';
import type { CatalogBook } from '../../types/dashboard';
export default function Catalog() {
  const { canWrite } = useDashboard(), writable = canWrite('catalogo'), op = useOperation();
  const [filters,setFilters] = useState({page:0,search:'',category:'',author:'',status:''});
  const debouncedFilters = useDebouncedValue(filters);
  const loader = useCallback((signal: AbortSignal)=>fetchList<CatalogBook>('catalog_books',debouncedFilters,signal),[debouncedFilters]);
  const query = useDashboardQuery(loader);
  const [editing,setEditing]=useState<CatalogBook|null|undefined>(),[deleting,setDeleting]=useState<CatalogBook|null>(null);
  return <><div className="dash-page-heading"><div><span className="dash-eyebrow">OBRAS PUBLICADAS</span><h1>Catálogo editorial</h1><p>Administre livros, autores e publicações da editora.</p></div>{writable && <button className="dash-primary" onClick={()=>setEditing(null)}><Plus size={18} />Cadastrar livro</button>}</div><Feedback {...op} /><div className="dash-filters">{(['search','category','author'] as const).map((key,i)=><label key={key}>{['Pesquisar por título','Categoria','Autor (nome completo)'][i]}<input value={filters[key]} onChange={e=>setFilters({...filters,[key]:e.target.value,page:0})} /></label>)}<label>Publicação<select value={filters.status} onChange={e=>setFilters({...filters,status:e.target.value,page:0})}><option value="">Todos</option><option value="draft">Rascunho</option><option value="published">Publicado</option></select></label></div><QueryState {...query} retry={query.reload} empty={query.data?.rows.length===0} />
    {query.data && <><div className="dash-book-grid">{query.data.rows.map(book=><article className="dash-book" key={book.id}><div className="dash-book-cover">{book.cover_path?<ResponsiveImage src={assetUrl('catalog-book-covers',book.cover_path)} alt={`Capa de ${book.title}`} loading="lazy" />:<span>Sem capa</span>}</div><div className="dash-book-info"><span className="dash-eyebrow">{book.category}</span><h2>{book.title}</h2><p>{book.authors.join(', ')}</p><span className={`dash-badge ${book.publication_status}`}>{book.publication_status==='published'?'Publicado':'Rascunho'}</span><time>{dateLabel(book.created_at)}</time>{writable && <div className="dash-row-actions"><button onClick={()=>setEditing(book)}>Editar</button><button className="dash-danger" onClick={()=>setDeleting(book)}>Excluir</button></div>}</div></article>)}</div><Pagination page={filters.page} count={query.data.count} onChange={page=>setFilters({...filters,page})} /></>}
    {editing!==undefined && writable && <Panel title={editing?'Editar livro':'Cadastrar livro'} onClose={()=>setEditing(undefined)}><CatalogForm book={editing} cancel={()=>setEditing(undefined)} saved={message=>{setEditing(undefined);query.reload();void op.run(async()=>message);}} /></Panel>}
    {deleting && writable && <Panel title="Excluir livro do catálogo?" busy={op.busy} onClose={()=>setDeleting(null)}><p>“{deleting.title}” será excluído permanentemente.</p><Feedback {...op} /><div className="dash-row-actions"><button className="dash-danger" disabled={op.busy} onClick={()=>{void op.run(()=>deleteCatalog(deleting),()=>{setDeleting(null);query.reload();});}}>Confirmar exclusão</button><button disabled={op.busy} onClick={()=>setDeleting(null)}>Cancelar</button></div></Panel>}
  </>;
}

