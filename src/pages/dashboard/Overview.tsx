import { Link } from 'react-router-dom';
import { BookOpen, Library, Inbox, Clock, Plus, ArrowUpRight } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useDashboard } from '../../components/dashboard/context';
import { QueryState, dateLabel } from '../../components/dashboard/shared';
import { useDashboardQuery } from '../../hooks/use-dashboard-query';
import { fetchSummary } from '../../lib/dashboard';
export default function Overview() {
  const query = useDashboardQuery(fetchSummary), { access, canWrite } = useDashboard();
  const reduced = useReducedMotion();
  const indicators = [
    { label: 'Coautorias abertas', key: 'open', module: 'coautorias', icon: BookOpen },
    { label: 'Total de livros cadastrados', key: 'books', module: 'coautorias', icon: Library },
    { label: 'Contatos recebidos', key: 'contacts', module: 'contatos', icon: Inbox },
    { label: 'Novos contatos', key: 'pending', module: 'contatos', icon: Clock },
  ] as const;
  const events = [...(query.data?.recent_books ?? []).map(b => ({ id: b.id, text: `Livro cadastrado: ${b.title}`, date: b.created_at, href: '/dashboard/coautorias' })), ...(query.data?.recent_contacts ?? []).map(c => ({ id: c.id, text: `Contato recebido: ${c.name}`, date: c.created_at, href: `/dashboard/contatos?contato=${c.id}` }))].sort((a,b) => b.date.localeCompare(a.date)).slice(0, 10);
  return <><div className="dash-page-heading"><div><span className="dash-eyebrow">SEU ESPAÇO DE GESTÃO</span><h1>Um novo capítulo, todos os dias.</h1><p>Acompanhe os projetos e as conversas que movem a Literare.</p></div><button onClick={query.reload}>Atualizar dados</button></div>
    <QueryState {...query} retry={query.reload} />
    {query.data && <><div className="dash-stats">{indicators.map(({label,key,module,icon: Icon},i) => <motion.article className="dash-stat" key={key} initial={reduced?false:{opacity:0}} animate={{opacity:1}} transition={{delay:reduced?0:i*.03,duration:reduced?0:.15}}><div><span>{label}</span><Icon size={19} /></div><strong>{query.data![key] === undefined ? '—' : query.data![key]!.toLocaleString('pt-BR')}</strong><small>{access.read.includes(module) ? (module === 'coautorias' ? 'Projetos de coautoria' : 'Mensagens do site') : 'Sem permissão para este indicador'}</small></motion.article>)}</div>
      <section className="dash-card"><div className="dash-section-heading"><h2>Ações rápidas</h2><span>Do planejamento à publicação</span></div><div className="dash-quick-actions">{canWrite('coautorias') && <Link to="/dashboard/coautorias?novo=1"><Plus size={19} />Cadastrar novo livro</Link>}{access.read.includes('coautorias') && <Link to="/dashboard/coautorias"><BookOpen size={19} />Visualizar coautorias</Link>}{access.read.includes('contatos') && <Link to="/dashboard/contatos"><Inbox size={19} />Consultar contatos</Link>}{access.read.includes('catalogo') && <Link to="/dashboard/catalogo"><Library size={19} />Gerenciar catálogo</Link>}</div></section>
      <section className="dash-card"><div className="dash-section-heading"><h2>Atividades recentes</h2><span>Últimos cadastros e mensagens</span></div>{events.length ? <ul className="dash-activity">{events.map(e => <li key={e.id}><span className="dash-event-dot" /><div><Link to={e.href}>{e.text} <ArrowUpRight size={14} /></Link><time dateTime={e.date}>{dateLabel(e.date)}</time></div></li>)}</ul> : <p>Nenhuma atividade disponível para os módulos autorizados.</p>}<p className="dash-muted">O histórico de alterações editoriais ainda não possui uma trilha de auditoria. Aqui são exibidos apenas cadastros e contatos registrados.</p></section></>}
  </>;
}


