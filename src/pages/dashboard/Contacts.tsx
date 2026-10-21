import { useDebouncedValue } from '../../hooks/use-debounced-value';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Mail, Copy } from 'lucide-react';
import { useDashboard } from '../../components/dashboard/context';
import { Feedback, Pagination, Panel, QueryState, dateLabel, useOperation } from '../../components/dashboard/shared';
import { useDashboardQuery } from '../../hooks/use-dashboard-query';
import { dashboardClient, dataError, fetchList, updateContact } from '../../lib/dashboard';
import type { Contact } from '../../types/dashboard';
import { CONTACT_AREAS, contactAreaLabel } from '../../data/contact-areas';
import { contactExportRows, contactsCSV, downloadExport, fetchContactsForExport } from '../../lib/contact-export';
const statuses = { pending: 'Pendente', in_progress: 'Em atendimento', completed: 'Concluído' };
export default function Contacts() {
  const { canWrite, access } = useDashboard(), [params] = useSearchParams();
  const [filters, setFilters] = useState({ page: 0, search: '', status: '', area:'', from: '', to: '', ascending: false });
  const debouncedFilters = useDebouncedValue(filters);
  const loader = useCallback((signal: AbortSignal) => fetchList<Contact>('contact_submissions', debouncedFilters, signal), [debouncedFilters]);
  const query = useDashboardQuery(loader), op = useOperation();
  const [selected, setSelected] = useState<Contact | null>(null), [detailError, setDetailError] = useState('');
  const [exporting,setExporting]=useState(false),[scope,setScope]=useState('filtered'),[progress,setProgress]=useState(0);
  const exportOp=useOperation(),exportController=useRef<AbortController|null>(null);
  useEffect(()=>()=>exportController.current?.abort(),[]);
  async function exportFile(format:'csv'|'xlsx') {
    if(!access.read.includes('contatos'))throw new Error('Sua conta não pode exportar contatos.');
    const controller=new AbortController();exportController.current=controller;setProgress(0);
    const chosen=scope==='all'?{page:0,search:''}:filters;
    try{
      const contacts=await fetchContactsForExport(chosen,controller.signal,setProgress);
      if(!contacts.length)return 'Nenhum contato encontrado para exportar.';
      if(format==='csv')downloadExport(new Blob([contactsCSV(contacts)],{type:'text/csv;charset=utf-8'}),'csv');
      else{const {contactsWorkbook}=await import('../../lib/contact-xlsx');controller.signal.throwIfAborted();downloadExport(new Blob([contactsWorkbook(contactExportRows(contacts))],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),'xlsx');}
      return `${contacts.length} contato(s) exportado(s) com sucesso.`;
    }catch(error){if(controller.signal.aborted)return 'Exportação cancelada.';throw error;}
    finally{exportController.current=null;}
  }
  const id = params.get('contato');
  useEffect(() => {
    if (!id || !/^[a-f0-9-]{36}$/.test(id)) return;
    const controller = new AbortController();
    void dashboardClient().from('contact_submissions').select('id,name,email,phone,message,status,created_at,updated_at,area_of_activity,area_of_activity_other').eq('id', id).abortSignal(controller.signal).single().then(({data,error}) => {
      if (controller.signal.aborted) return;
      if (error) setDetailError(dataError(error).message); else setSelected(data as Contact);
    });
    return () => controller.abort();
  }, [id]);
  return <><div className="dash-page-heading"><div><span className="dash-eyebrow">RELACIONAMENTO</span><h1>Central de contatos</h1><p>Cada conversa pode ser o começo de uma grande história.</p></div><div className="dash-row-actions"><button onClick={query.reload}>Atualizar contatos</button>{access.read.includes("contatos") && <button onClick={()=>setExporting(true)}>Exportar contatos</button>}</div></div><Feedback {...op} />{detailError && <p role="alert" className="dash-error">{detailError}</p>}
    <div className="dash-filters"><label>Pesquisar nome ou e-mail<input value={filters.search} onChange={e => setFilters({...filters,search:e.target.value,page:0})} /></label><label>Status<select value={filters.status} onChange={e => setFilters({...filters,status:e.target.value,page:0})}><option value="">Todos</option>{Object.entries(statuses).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label><label>Área de atuação<select aria-label="Filtrar por área de atuação" value={filters.area} onChange={e=>setFilters({...filters,area:e.target.value,page:0})}><option value="">Todas as áreas</option>{CONTACT_AREAS.map(area=><option key={area}>{area}</option>)}<option value="__unknown__">Não informado</option></select></label><label>De<input type="date" value={filters.from} max={filters.to || undefined} onChange={e => setFilters({...filters,from:e.target.value,page:0})} /></label><label>Até<input type="date" value={filters.to} min={filters.from || undefined} onChange={e => setFilters({...filters,to:e.target.value,page:0})} /></label><label>Ordenação<select value={String(filters.ascending)} onChange={e => setFilters({...filters,ascending:e.target.value==='true',page:0})}><option value="false">Mais recentes</option><option value="true">Mais antigos</option></select></label></div>
    <QueryState {...query} retry={query.reload} empty={query.data?.rows.length === 0} />
    {query.data && <><div className="dash-inbox">{query.data.rows.map(contact => <button className="dash-inbox-row" key={contact.id} onClick={() => setSelected(contact)}><span className="dash-avatar">{contact.name.slice(0, 1).toUpperCase()}</span><span className="dash-inbox-sender"><strong>{contact.name}</strong><small>{contact.email}</small><small>{contactAreaLabel(contact)}</small><span>{contact.message.slice(0, 110)}</span></span><span className="dash-inbox-meta"><time dateTime={contact.created_at}>{dateLabel(contact.created_at)}</time><span className={`dash-badge ${contact.status}`}>{statuses[contact.status]}</span></span></button>)}</div><Pagination page={filters.page} count={query.data.count} onChange={page => setFilters({...filters,page})} /></>}
    {selected && <Panel title="Detalhes do contato" drawer busy={op.busy} onClose={() => setSelected(null)}><h3>{selected.name}</h3><dl className="dash-contact-details"><dt>E-mail</dt><dd>{selected.email}<button aria-label="Copiar e-mail" onClick={() => { void op.run(async () => { await navigator.clipboard.writeText(selected.email); return 'E-mail copiado.'; }); }}><Copy size={15} /></button></dd><dt>Telefone</dt><dd>{selected.phone}<button aria-label="Copiar telefone" onClick={() => { void op.run(async () => { await navigator.clipboard.writeText(selected.phone); return 'Telefone copiado.'; }); }}><Copy size={15} /></button></dd><dt>Área de atuação</dt><dd>{contactAreaLabel(selected)}</dd><dt>Recebido em</dt><dd>{dateLabel(selected.created_at)}</dd><dt>Última atualização</dt><dd>{dateLabel(selected.updated_at)}</dd></dl><p className="dash-message">{selected.message}</p><label>Status de atendimento<select value={selected.status} disabled={op.busy || !canWrite('contatos')} onChange={e => { const status = e.target.value as Contact['status']; void op.run(async () => { setSelected(await updateContact(selected, status)); return 'Status atualizado com sucesso.'; }, query.reload); }}>{Object.entries(statuses).map(([key,label]) => <option value={key} key={key}>{label}</option>)}</select></label><a className="dash-link-button" href={`mailto:${encodeURIComponent(selected.email)}?subject=${encodeURIComponent('Seu contato com a Literare Books')}`}><Mail size={17} />Responder por e-mail</a><Feedback {...op} /></Panel>}
    {exporting && <Panel title="Exportar contatos" busy={exportOp.busy} onClose={()=>setExporting(false)}><p>Exportação de todos os registros autorizados, independentemente da página atual.</p><label>Contatos a exportar<select aria-label="Contatos a exportar" disabled={exportOp.busy} value={scope} onChange={e=>setScope(e.target.value)}><option value="filtered">Com os filtros aplicados</option><option value="all">Todos os contatos autorizados</option></select></label><div className="dash-row-actions"><button disabled={exportOp.busy} onClick={()=>{void exportOp.run(()=>exportFile("csv"));}}>Exportar CSV</button><button disabled={exportOp.busy} onClick={()=>{void exportOp.run(()=>exportFile("xlsx"));}}>Exportar Excel (.xlsx)</button>{exportOp.busy && <button onClick={()=>exportController.current?.abort()}>Cancelar exportação</button>}</div>{exportOp.busy && <p role="status">Preparando arquivo… {progress} contato(s) carregado(s).</p>}<Feedback {...exportOp} /></Panel>}
  </>;
}



