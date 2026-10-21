import { createClient } from '@supabase/supabase-js';
import { resolveSupabaseConfig } from './supabase-config';
const config = resolveSupabaseConfig({
  url: import.meta.env.VITE_SUPABASE_URL,
  publishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
});
export const supabaseConfigError = config.error;
export const supabase = !config.error
  ? createClient(config.url, config.key, { auth: { persistSession: true, autoRefreshToken: true } })
  : null;

export async function signOut() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error('Não foi possível encerrar a sessão.');
}
