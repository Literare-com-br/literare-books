import { test, expect } from '@playwright/test';
import { resolveSupabaseConfig } from '../src/lib/supabase-config';
import { loginError } from '../src/lib/auth-error';
test('public configuration prefers publishable keys and rejects admin credentials', () => {
  const url = 'https://project-test.supabase.co';
  expect(resolveSupabaseConfig({ url, publishableKey: 'sb_publishable_test', anonKey: 'invalid-legacy' }).error).toBe('');
  const jwt = (role: string) => `header.${Buffer.from(JSON.stringify({ role })).toString('base64url')}.signature`;
  expect(resolveSupabaseConfig({ url, anonKey: jwt('anon') }).error).toBe('');
  expect(resolveSupabaseConfig({ url, publishableKey: 'sb_secret_test' }).error).not.toBe('');
  expect(resolveSupabaseConfig({ url, anonKey: jwt('service_role') }).error).not.toBe('');
  expect(resolveSupabaseConfig({ url }).error).toContain('incompleta');
  expect(resolveSupabaseConfig({ url: 'invalid', publishableKey: 'sb_publishable_test' }).error).toContain('endereço');
  expect(loginError({ code: 'email_provider_disabled' })).toContain('desativado');
});
