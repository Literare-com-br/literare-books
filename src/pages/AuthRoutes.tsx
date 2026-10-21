import { lazy, Suspense, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { safeDashboardNext } from '../lib/navigation-security';
const Login = lazy(() => import('../components/ui/auth-section-1'));
const Dashboard = lazy(() => import('./Dashboard'));

export default function AuthRoutes() {
  const { pathname, search } = useLocation();
  const [auth, setAuth] = useState<{ ready: boolean; session: Session | null }>({ ready: !supabase, session: null });
  useEffect(() => {
    if (!supabase) return;
    let active = true;
    let changed = false;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      changed = true;
      if (active) setAuth({ ready: true, session });
    });
    void supabase.auth.getSession().then(({ data, error }) => {
      if (active && !changed) setAuth({ ready: true, session: error ? null : data.session });
    }).catch(() => { if (active && !changed) setAuth({ ready: true, session: null }); });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);
  useEffect(() => {
    if (!auth.session?.expires_at) return;
    const timer = window.setTimeout(() => {
      void supabase?.auth.getSession().then(({ data }) => setAuth({ ready: true, session: data.session }))
        .catch(() => setAuth({ ready: true, session: null }));
    }, Math.max(0, auth.session.expires_at * 1000 - Date.now()));
    return () => window.clearTimeout(timer);
  }, [auth.session]);
  if (!auth.ready) return <main role="status" className="route-loading">Verificando sessão…</main>;
  const authenticated = !!auth.session && (!auth.session.expires_at || auth.session.expires_at * 1000 > Date.now());
  if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) return authenticated
    ? <Suspense fallback={<main role="status">Carregando painel…</main>}><Dashboard key={auth.session!.user.id} session={auth.session!} /></Suspense>
    : <Navigate to={pathname === '/dashboard' ? '/login' : `/login?next=${safeDashboardNext(pathname)}`} replace />;
  const next = safeDashboardNext(new URLSearchParams(search).get('next'));
  return authenticated ? <Navigate to={next} replace /> : <Suspense fallback={null}><Login /></Suspense>;
}
