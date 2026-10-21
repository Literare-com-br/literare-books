export function resolveSupabaseConfig(env: { url?: string; publishableKey?: string; anonKey?: string }) {
  const key = env.publishableKey?.trim() || env.anonKey?.trim() || '';
  const url = env.url?.trim() || '';
  if (!url || !key) return { url, key, error: 'O acesso está indisponível: a configuração de autenticação está incompleta.' };
  try {
    const parsed = new URL(url);
    if (!['https:', 'http:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== '/') throw new Error();
  } catch { return { url, key, error: 'O acesso está indisponível: o endereço de autenticação precisa ser corrigido.' }; }
  let publicKey = /^sb_publishable_[A-Za-z0-9_-]+$/.test(key);
  if (!publicKey && !key.startsWith('sb_secret_')) {
    try { publicKey = JSON.parse(atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).role === 'anon'; }
    catch { publicKey = false; }
  }
  return { url: url.replace(/\/$/, ''), key, error: publicKey ? '' : 'O acesso está indisponível: configure uma chave pública de autenticação válida.' };
}
