import { Component, lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { ReactNode, FormEvent } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase, supabaseConfigError } from '../../lib/supabase';
import { loginError } from '../../lib/auth-error';
import { safeDashboardNext } from '../../lib/navigation-security';
import '../../styles/auth.css';
const Gradient = lazy(() => import('./login-gradient'));
class ShaderBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? null : this.props.children; }
}
export default function AuthSectionOne() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [error, setError] = useState('');
  const [shader, setShader] = useState(false);
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => {
      try { setShader(!preference.matches && !!document.createElement('canvas').getContext('webgl2')); }
      catch { setShader(false); }
    };
    update(); preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    const data = new FormData(event.currentTarget);
    const email = String(data.get('email') ?? '').trim();
    const password = String(data.get('password') ?? '');
    if (!email || !password) { setError('Preencha seu e-mail e sua senha.'); return; }
    if (!supabase) { setError(supabaseConfigError); return; }
    pending.current = true; setBusy(true); setError('');
    try {
      const { data: result, error: failure } = await supabase.auth.signInWithPassword({ email, password });
      if (failure || !result.session) {
        setError(loginError(failure));
      } else navigate(safeDashboardNext(params.get('next')), { replace: true });
    } catch { setError('Não foi possível conectar. Verifique sua conexão e tente novamente.'); }
    finally { pending.current = false; setBusy(false); }
  }
  return <main className="auth-page"><div className="auth-grid">
    <section className="auth-form-panel" aria-labelledby="login-title"><div className="auth-inner">
      <Link className="auth-back" to="/">← Literare Books</Link>
      <h1 id="login-title">Bem-vindo de volta.</h1><p className="auth-subtitle">Acesse sua conta para continuar.</p>
      <form onSubmit={submit} aria-busy={busy}>
        <label className="auth-field"><span className="sr-only">E-mail</span><input name="email" type="email" autoComplete="username" placeholder="E-mail" maxLength={254} required disabled={busy} /></label>
        <label className="auth-field"><span className="sr-only">Senha</span><input name="password" type={visible ? 'text' : 'password'} autoComplete="current-password" placeholder="Senha" required disabled={busy} />
          <button type="button" aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={visible} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={20} /> : <Eye size={20} />}</button></label>
        {error && <p className="auth-error" role="alert">{error}</p>}
        <button className="auth-submit" disabled={busy} type="submit">{busy ? 'Entrando…' : 'Entrar'}</button>
      </form>
    </div></section>
    <section className="auth-visual" aria-label="Literare Books">
      {shader && <ShaderBoundary><Suspense fallback={null}><Gradient /></Suspense></ShaderBoundary>}
      <div className="auth-visual-copy"><h2>Novas histórias<br />começam aqui.</h2></div>
    </section>
  </div></main>;
}
