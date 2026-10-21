import ResponsiveImage from '../components/ui/responsive-image';
import { useDebouncedValue } from '../hooks/use-debounced-value';
import { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { coverUrl, deleteBook, saveBook } from '../lib/coauthors';
import { fetchList } from '../lib/dashboard';
import { useDashboardQuery } from '../hooks/use-dashboard-query';
import { useDashboard } from '../components/dashboard/context';
import { Feedback, Panel, Pagination, QueryState, dateLabel, useOperation } from '../components/dashboard/shared';
import BookForm from '../components/coauthors/BookForm';
import type { CoauthorBook } from '../types/coauthor';
import '../styles/coauthors.css';
export default function AdminCoauthorsPage() {
  const [params, setParams] = useSearchParams();
  const { canWrite } = useDashboard(), writable = canWrite('coautorias');
  const [filters, setFilters] = useState({ page: 0, search: '', category: '', status: '', ascending: false });
  const debouncedFilters = useDebouncedValue(filters);
  const loader = useCallback((signal: AbortSignal) => fetchList<CoauthorBook>('coauthor_books', debouncedFilters, signal), [debouncedFilters]);
  const query = useDashboardQuery(loader), op = useOperation();
  const [editing, setEditing] = useState<CoauthorBook | null | undefined>(writable && params.get('novo') === '1' ? null : undefined);
  const [deleting, setDeleting] = useState<CoauthorBook | null>(null);
  function closeEditor() { setEditing(undefined); if (params.has('novo')) setParams({}, {replace: true}); }
  return <><div className="dash-page-heading"><div><span className="dash-eyebrow">PROJETOS EDITORIAIS</span><h1>Coautorias</h1><p>Organize obras, capas e oportunidades de participação.</p></div>{writable && <button className="dash-primary" onClick={() => setEditing(null)}><Plus size={18} />Novo livro</button>}</div>
    <Feedback {...op} /><div className="dash-filters"><label>Pesquisar por título<input value={filters.search} onChange={e => setFilters({...filters, search: e.target.value, page: 0})} /></label><label>Categoria<input value={filters.category} onChange={e => setFilters({...filters, category: e.target.value, page: 0})} placeholder="Nome exato da categoria" /></label><label>Status<select value={filters.status} onChange={e => setFilters({...filters, status: e.target.value, page: 0})}><option value="">Todos</option><option value="open">Abertas</option><option value="closed">Encerradas</option></select></label><label>Ordenação<select value={String(filters.ascending)} onChange={e => setFilters({...filters, ascending: e.target.value === 'true', page: 0})}><option value="false">Mais recentes</option><option value="true">Mais antigos</option></select></label></div>
    <QueryState {...query} retry={query.reload} empty={query.data?.rows.length === 0} />
    {query.data && <><div className="dash-book-grid">{query.data.rows.map(book => <article className="dash-book admin-book-row" key={book.id}><div className="dash-book-cover">{book.cover_path ? <ResponsiveImage src={coverUrl(book.cover_path)} alt={`Capa de ${book.title}`} loading="lazy" /> : <span>Sem capa</span>}</div><div className="dash-book-info"><span className="dash-eyebrow">{book.category}</span><h2>{book.title}</h2><p>{book.editorial_coordinator}</p><span className={`dash-badge admin-status ${book.registration_status}`}>{book.registration_status === 'open' ? 'Inscrições abertas' : 'Inscrições encerradas'}</span><time dateTime={book.created_at}>{dateLabel(book.created_at)}</time>{writable && <div className="dash-row-actions"><button disabled={op.busy} onClick={() => setEditing(book)}>Editar</button><button disabled={op.busy} onClick={() => { void op.run(async () => { const result = await saveBook({title: book.title, description: book.description, category: book.category, editorial_coordinator: book.editorial_coordinator, registration_status: book.registration_status === 'open' ? 'closed' : 'open'}, null, book); return result.warning || 'Status atualizado com sucesso.'; }, query.reload); }}>{book.registration_status === 'open' ? 'Encerrar inscrições' : 'Abrir inscrições'}</button><button className="dash-danger" disabled={op.busy} onClick={() => setDeleting(book)}>Excluir</button></div>}</div></article>)}</div><Pagination page={filters.page} count={query.data.count} onChange={page => setFilters({...filters, page})} /></>}
    {editing !== undefined && writable && <Panel title={editing ? 'Editar projeto' : 'Novo projeto'} busy={op.busy} onClose={closeEditor}><BookForm key={editing?.id ?? 'new'} book={editing} cancel={closeEditor} saved={warning => { closeEditor(); query.reload(); void op.run(async () => warning || 'Projeto salvo com sucesso.'); }} /></Panel>}
    {deleting && writable && <Panel title="Excluir este projeto?" busy={op.busy} onClose={() => setDeleting(null)}><p>A obra “{deleting.title}” será excluída. Esta ação não pode ser desfeita.</p><Feedback {...op} /><div className="dash-row-actions"><button className="dash-danger" disabled={op.busy} onClick={() => { void op.run(async () => (await deleteBook(deleting)) || 'Projeto excluído com sucesso.', () => { setDeleting(null); query.reload(); }); }}>Confirmar exclusão</button><button disabled={op.busy} onClick={() => setDeleting(null)}>Cancelar</button></div></Panel>}
  </>;
}


