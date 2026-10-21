import { lazy, Suspense, useLayoutEffect, useRef } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
const HomePage = lazy(() => import('./pages/HomePage'));
const AuthRoutes = lazy(() => import('./pages/AuthRoutes'));
const CoauthorsPage = lazy(() => import('./pages/CoauthorsPage'));
function PageScroll() {
  const { pathname, hash } = useLocation();
  const previous = useRef(pathname);
  useLayoutEffect(() => {
    if (previous.current !== pathname && !hash) window.scrollTo({ top: 0, behavior: 'instant' });
    previous.current = pathname;
  }, [pathname, hash]);
  return null;
}
export default function Router() {
  return <BrowserRouter><PageScroll /><Suspense fallback={<main className="route-loading" role="status">Carregando…</main>}><Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/coautorias" element={<CoauthorsPage />} />
    <Route path="/login" element={<AuthRoutes />} />
    <Route path="/dashboard/*" element={<AuthRoutes />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></Suspense></BrowserRouter>;
}
