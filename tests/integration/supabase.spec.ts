import { test, expect } from '@playwright/test';

// Real SDK with intercepted HTTP, never a substitute for validation on a real project.
test('password login, persisted session, authorized dashboard and sign out', async ({ page }) => {
  const user = { id: '047724e3-e9bd-42a6-aafc-709024b689bb', email: 'teste@example.com', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() };
  await page.route('https://literare-test.invalid/auth/v1/**', async route => {
    if (route.request().url().includes('/logout')) return route.fulfill({ status: 204 });
    if (route.request().url().includes('/token')) {
      expect(route.request().postDataJSON()).toMatchObject({ email: 'teste@example.com', password: 'senha-teste' });
      return route.fulfill({ json: { access_token: 'test-access-token', refresh_token: 'test-refresh-token', token_type: 'bearer', expires_in: 3600, user } });
    }
    return route.fulfill({ json: user });
  });
  await page.route('https://literare-test.invalid/rest/v1/rpc/dashboard_access', route => route.fulfill({ json: { version: 1, role: 'admin', read: [], write: [] } }));
  await page.route('https://literare-test.invalid/rest/v1/rpc/dashboard_summary', route => route.fulfill({ json: {} }));
  await page.goto('/login?next=/dashboard');
  await page.getByLabel('E-mail', { exact: true }).fill('teste@example.com');
  await page.getByLabel('Senha', { exact: true }).fill('senha-teste');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Um novo capítulo, todos os dias.' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Um novo capítulo, todos os dias.' })).toBeVisible();
  await page.route('https://literare-test.invalid/rest/v1/rpc/dashboard_access', route => route.fulfill({ json: { version: 1, role: 'admin', read: [], write: [] } }));
  await page.route('https://literare-test.invalid/rest/v1/rpc/dashboard_summary', route => route.fulfill({ json: {} }));
  await page.goto('/login?next=/dashboard');
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.evaluate(async () => {
    const path = '/src/lib/supabase.ts';
    const { signOut } = await import(/* @vite-ignore */ path);
    await signOut();
  });
  await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
});

test('invalid credentials stay on login with a friendly error', async ({ page }) => {
  await page.route('https://literare-test.invalid/auth/v1/token**', route => route.fulfill({ status: 400, json: { error_code: 'invalid_credentials', msg: 'Internal authentication detail' } }));
  await page.route('https://literare-test.invalid/rest/v1/rpc/dashboard_access', route => route.fulfill({ json: { version: 1, role: 'admin', read: [], write: [] } }));
  await page.route('https://literare-test.invalid/rest/v1/rpc/dashboard_summary', route => route.fulfill({ json: {} }));
  await page.goto('/login?next=/dashboard');
  await page.getByLabel('E-mail', { exact: true }).fill('teste@example.com');
  await page.getByLabel('Senha', { exact: true }).fill('senha-invalida');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Confira seu e-mail e sua senha');
  await expect(page.getByRole('alert')).not.toContainText('Internal');
  await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
});

test('disabled email provider is reported without blaming the password', async ({ page }) => {
  await page.route('https://literare-test.invalid/auth/v1/token**', route => route.fulfill({ status: 422, json: { code: 422, error_code: 'email_provider_disabled', msg: 'Email logins are disabled' } }));
  await page.goto('/login');
  await page.getByLabel('E-mail', { exact: true }).fill('teste@example.com');
  await page.getByLabel('Senha', { exact: true }).fill('senha-teste');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('login por e-mail está desativado');
});

test('expired session with a rejected refresh cannot open the dashboard', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('sb-literare-test-auth-token', JSON.stringify({
    access_token: 'expired-test-token', refresh_token: 'expired-refresh-token',
    expires_at: Math.floor(Date.now() / 1000) - 60, expires_in: 3600, token_type: 'bearer',
    user: { id: '047724e3-e9bd-42a6-aafc-709024b689bb', aud: 'authenticated' },
  })));
  await page.route('https://literare-test.invalid/auth/v1/token**', route => route.fulfill({ status: 400, json: { error_code: 'refresh_token_not_found', msg: 'Invalid refresh token' } }));
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
  await expect(page.getByRole('heading', { name: 'Bem-vindo de volta.' })).toBeVisible();
});

test('contact preserves failed submission and clears only after confirmed insert', async ({ page }) => {
  let requests = 0;
  let succeed = false;
  await page.route('https://literare-test.invalid/functions/v1/submit-contact', async route => {
    requests++;
    expect(route.request().method()).toBe('POST');
    const payload = route.request().postDataJSON();
    expect(payload).toMatchObject({ name: 'Pessoa Teste', email: 'teste@example.com', phone: '(11) 99999-9999', area_of_activity: 'Psicologia', turnstileToken: 'test-proof-token', message: 'Mensagem para testar o contato com a editora.' });
    expect(route.request().url()).not.toContain('select=');
    if (succeed) return route.fulfill({ status: 201, json: {sent:true} });
    return route.fulfill({ status: 403, json: { message: 'Database internal error' } });
  });
  await page.addInitScript(() => { window.turnstile = {render:(_element,options)=>{queueMicrotask(()=> (options.callback as (token:string)=>void)('test-proof-token'));return 'test';},remove:()=>{}}; });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.locator('#contato').evaluate(el => window.scrollTo({ top: scrollY + el.getBoundingClientRect().top - 78, behavior: 'instant' }));
  await page.getByRole('textbox', { name: 'Nome completo', exact: true }).fill('Pessoa Teste');
  await page.getByRole('textbox', { name: 'E-mail', exact: true }).fill('teste@example.com');
  await page.getByRole('textbox', { name: 'Telefone', exact: true }).fill('(11) 99999-9999');
  await page.getByLabel('Área de atuação', {exact:true}).selectOption('Psicologia');
  await page.getByRole('textbox', { name: 'Sua mensagem', exact: true }).fill('Mensagem para testar o contato com a editora.');
  await page.getByRole('button', { name: 'Enviar Mensagem' }).click();
  await expect(page.getByRole('status')).toContainText('Seus dados foram mantidos');
  await expect(page.getByRole('textbox', { name: 'Nome completo', exact: true })).toHaveValue('Pessoa Teste');
  succeed = true;
  await page.getByRole('button', { name: 'Enviar Mensagem' }).click();
  await expect(page.getByRole('status')).toContainText('Mensagem enviada com sucesso');
  await expect(page.getByRole('textbox', { name: 'Nome completo', exact: true })).toHaveValue('');
  expect(requests).toBe(2);
});


