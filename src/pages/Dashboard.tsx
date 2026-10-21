import { lazy, Suspense, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Link, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'framer-motion';
import { LayoutDashboard, BookOpen, Inbox, Library, FileText, ChartNoAxesCombined, Users, Settings, LogOut, Menu, ChevronDown, ArrowUpRight } from 'lucide-react';
import { fetchAccess } from '../lib/dashboard';
import { signOut } from '../lib/supabase';
import { useDashboardQuery } from '../hooks/use-dashboard-query';
import { DashboardContext } from '../components/dashboard/context';
import { Feedback, Panel, QueryState, useOperation } from '../components/dashboard/shared';
import type { Access, Module } from '../types/dashboard';
import '../styles/dashboard.css';
import ResponsiveImage from '../components/ui/responsive-image';
const Overview = lazy(() => import('./dashboard/Overview'));
const Coauthors = lazy(() => import('./AdminCoauthorsPage'));
const Contacts = lazy(() => import('./dashboard/Contacts'));
const Catalog = lazy(() => import('./dashboard/Catalog'));
const Content = lazy(() => import('./dashboard/Content'));
const Reports = lazy(() => import('./dashboard/Reports'));
const Members = lazy(() => import('./dashboard/Members'));
const Configuration = lazy(() => import('./dashboard/Configuration'));
const navigation = [
  { path: '', title: 'Visão Geral', icon: LayoutDashboard },
  { path: 'coautorias', title: 'Coautorias', icon: BookOpen },
  { path: 'contatos', title: 'Contatos', icon: Inbox },
  { path: 'catalogo', title: 'Catálogo Editorial', icon: Library },
  { path: 'conteudo', title: 'Conteúdo do Site', icon: FileText },
  { path: 'relatorios', title: 'Relatórios', icon: ChartNoAxesCombined },
  { path: 'usuarios', title: 'Usuários e Permissões', icon: Users },
  { path: 'configuracoes', title: 'Configurações', icon: Settings },
];
function Denied() { return <div className="dash-state"><h1>Acesso restrito.</h1><p>Sua conta não tem permissão para acessar este recurso. Solicite acesso ao administrador.</p><Link to="/dashboard">Voltar à visão geral</Link></div>; }
export default function Dashboard({ session }: { session: Session }) {
  const query = useDashboardQuery(fetchAccess), op = useOperation();
  if (query.loading || query.error) return <main className="dash-access"><QueryState {...query} retry={query.reload} /><button disabled={op.busy} onClick={() => { void op.run(signOut); }}>Sair da conta</button><Feedback {...op} /></main>;
  if (!query.data?.role) return <main className="dash-access"><Denied /><button disabled={op.busy} onClick={() => { void op.run(signOut); }}>Sair da conta</button><Feedback {...op} /></main>;
  return <DashboardContext.Provider value={{ session, access: query.data }}><MotionConfig reducedMotion="user"><Shell access={query.data} session={session} /></MotionConfig></DashboardContext.Provider>;
}
function Shell({ access, session }: { access: Access; session: Session }) {
  const location = useLocation(), reduced = useReducedMotion();
  const [open, setOpen] = useState(false), [profile, setProfile] = useState(false), op = useOperation();
  const path = location.pathname.split('/')[2] ?? '';
  const title = navigation.find(item => item.path === path)?.title ?? 'Dashboard';
  const name = String(session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email || 'Conta');
  const initials = name.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map(word => word[0]).join('').toUpperCase();
  useEffect(() => { document.title = `${title} · Literare Books`; }, [title]);
  useEffect(() => { try { document.documentElement.dataset.dashCompact = String(localStorage.getItem('literare-compact') === 'true'); } catch { /* Optional browser preference. */ } return () => { delete document.documentElement.dataset.dashCompact; }; }, []);
  const visible = navigation.filter(item => !item.path || item.path === 'configuracoes' || access.read.includes(item.path as Module));
  const links = <><Link className="dash-brand" to="/dashboard"><ResponsiveImage src="/images/logoliterare.png" alt="Literare Books" /><span>GESTÃO EDITORIAL</span></Link><nav aria-label="Navegação administrativa">{visible.map(({path, title, icon: Icon}) => <NavLink key={path} end to={`/dashboard${path ? `/${path}` : ''}`} onClick={() => setOpen(false)}><Icon size={19} />{title}</NavLink>)}</nav><div className="dash-sidebar-footer"><Link to="/" target="_blank">Visitar o site <ArrowUpRight size={16} /></Link><button disabled={op.busy} onClick={() => { void op.run(signOut); }}><LogOut size={18} />Sair da conta</button></div></>;
  const guard = (module: Module, element: React.ReactNode) => access.read.includes(module) ? element : <Denied />;
  return <div className="dashboard"><a className="dash-skip" href="#dashboard-main">Pular para o conteúdo</a><aside className="dash-sidebar">{links}</aside>
    {open && <Panel title="Menu administrativo" drawer onClose={() => setOpen(false)}><div className="dash-mobile-nav">{links}</div></Panel>}
    <div className="dash-workspace"><header className="dash-header"><div className="dash-header-title"><button className="dash-menu" aria-label="Abrir navegação" onClick={() => setOpen(true)}><Menu size={22} /></button><div><nav aria-label="Breadcrumb"><Link to="/dashboard">Dashboard</Link><span> / {title}</span></nav><strong>{title}</strong></div></div><div className="dash-account"><button className="dash-profile-button" aria-expanded={profile} onClick={() => setProfile(!profile)}><span className="dash-avatar">{initials}</span><span className="dash-identity"><strong>{name}</strong><small>{session.user.email}</small></span><ChevronDown size={16} /></button>{profile && <div className="dash-profile-menu"><Link to="/dashboard/configuracoes" onClick={() => setProfile(false)}>Meu perfil e preferências</Link><button disabled={op.busy} onClick={() => { void op.run(signOut); }}>Sair da conta</button></div>}</div></header>
      <main id="dashboard-main" tabIndex={-1} className="dash-main"><Feedback {...op} /><AnimatePresence mode="wait"><motion.div key={location.pathname} initial={reduced ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{duration: reduced ? 0 : .14}}><Suspense fallback={<QueryState loading error="" retry={() => {}} />}><Routes>
        <Route index element={<Overview />} /><Route path="coautorias" element={guard('coautorias', <Coauthors />)} /><Route path="contatos" element={guard('contatos', <Contacts />)} /><Route path="catalogo" element={guard('catalogo', <Catalog />)} /><Route path="conteudo" element={guard('conteudo', <Content />)} /><Route path="relatorios" element={guard('relatorios', <Reports />)} /><Route path="usuarios" element={guard('usuarios', <Members />)} /><Route path="configuracoes" element={<Configuration />} /><Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes></Suspense></motion.div></AnimatePresence></main><footer className="dash-footer">Literare Books International <span>Painel administrativo</span></footer>
    </div>
  </div>;
}

