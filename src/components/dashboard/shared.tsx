import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { X, RefreshCw } from 'lucide-react';
import { PAGE_SIZE } from '../../lib/dashboard';
export const dateLabel = (value: string) => new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' });
export function QueryState({ loading, error, retry, empty = false }: { loading: boolean; error: string; retry: () => void; empty?: boolean }) {
  if (loading) return <div role="status" aria-label="Carregando dados" className="dash-skeleton"><span /><span /><span /></div>;
  if (error) return <div className="dash-state" role="alert"><h2>Não foi possível carregar</h2><p>{error}</p><button onClick={retry}><RefreshCw size={16} />Tentar novamente</button></div>;
  if (empty) return <div className="dash-state"><h2>Nenhum registro encontrado</h2><p>Cadastre um item ou ajuste os filtros para continuar.</p></div>;
  return null;
}
export function Pagination({ page, count, onChange }: { page: number; count: number; onChange: (page: number) => void }) {
  return <nav className="dash-pagination" aria-label="Paginação"><span>{count} registro(s) · Página {page + 1} de {Math.max(1, Math.ceil(count / PAGE_SIZE))}</span><div><button disabled={!page} onClick={() => onChange(page - 1)}>Anterior</button><button disabled={(page + 1) * PAGE_SIZE >= count} onClick={() => onChange(page + 1)}>Próxima</button></div></nav>;
}
export function Panel({ title, children, onClose, busy = false, drawer = false }: { title: string; children: ReactNode; onClose: () => void; busy?: boolean; drawer?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null), reduced = useReducedMotion();
  function dismiss() { if (!busy && !ref.current?.querySelector('fieldset:disabled, [aria-busy="true"]')) onClose(); }
  useEffect(() => {
    const dialog = ref.current!, previous = document.activeElement as HTMLElement | null, overflow = document.body.style.overflow;
    dialog.showModal(); document.body.style.overflow = 'hidden';
    return () => { dialog.close(); document.body.style.overflow = overflow; previous?.focus({ preventScroll: true }); };
  }, []);
  return <dialog ref={ref} className={`dash-dialog ${drawer ? 'dash-drawer' : ''}`} aria-label={title} onCancel={event => { event.preventDefault(); dismiss(); }}>
    <motion.div initial={reduced ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .16 }}><div className="dash-dialog-heading"><h2>{title}</h2><button aria-label="Fechar" disabled={busy} onClick={dismiss}><X size={20} /></button></div>{children}</motion.div>
  </dialog>;
}
export function useOperation() {
  const lock = useRef(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('');
  async function run(action: () => Promise<string | void>, after?: () => void) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(''); setMessage('');
    try { setMessage((await action()) || 'Alterações salvas com sucesso.'); after?.(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível concluir.'); }
    finally { lock.current = false; setBusy(false); }
  }
  return { busy, error, message, run };
}
export function Feedback({ error, message }: { error: string; message: string }) { return <>{error && <p className="dash-error" role="alert">{error}</p>}{message && <p className="dash-success" role="status">{message}</p>}</>; }
