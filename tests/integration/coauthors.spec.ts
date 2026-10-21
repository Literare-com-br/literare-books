import { test, expect, type Page } from '@playwright/test';
const userId = '047724e3-e9bd-42a6-aafc-709024b689bb';
const bookId = '157724e3-e9bd-42a6-aafc-709024b689bb';
const user = { id: userId, email: 'editor@example.com', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() };
function sample(status = 'open') {
  return { id: bookId, title: 'Obra de teste', description: 'Primeiro parágrafo editorial.\n\nSegundo parágrafo editorial.', category: 'Categoria de teste', editorial_coordinator: 'Coordenação de teste', cover_path: `${userId}/${bookId}/267724e3-e9bd-42a6-aafc-709024b689bb.webp`, registration_status: status, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), created_by: userId };
}
async function session(page: Page) {
  await page.addInitScript(({ user }) => localStorage.setItem('sb-literare-test-auth-token', JSON.stringify({ access_token: 'test-access-token', refresh_token: 'test-refresh-token', token_type: 'bearer', expires_at: Math.floor(Date.now() / 1000) + 3600, expires_in: 3600, user })), { user });
  await page.route('https://literare-test.invalid/auth/v1/**', route => route.fulfill({ json: user }));
}
async function images(page: Page) {
  await page.route('https://literare-test.invalid/storage/v1/object/sign/**',route=>route.fulfill({json:{signedURL:'/object/public/coauthor-book-covers/test.webp'}}));
  await page.route('https://literare-test.invalid/storage/v1/object/public/**', route => route.fulfill({ path: 'public/images/optimized/books-cover-01-240.webp', contentType: 'image/webp' }));
}

for (const width of [375, 768, 1440]) {
  test(`public books, editorial modal and navigation at ${width}px`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: 1000 });
    await images(page);
    await page.route('https://literare-test.invalid/rest/v1/coauthor_books**', route => {
      expect(new URL(route.request().url()).searchParams.get('registration_status')).toBe('eq.open');
      return route.fulfill({ json: [sample()] });
    });
    await page.goto('/coautorias');
    await expect(page.getByRole('heading', { name: 'Histórias que começam com você.' })).toBeVisible();
    const opener = page.getByRole('button', { name: 'Ver detalhes de Obra de teste' });
    await expect(opener).toBeVisible();
    await opener.click();
    const dialog = page.getByRole('dialog', { name: 'Obra de teste' });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('Coordenação de teste');
    await expect(dialog.locator('.book-description p')).toHaveCount(2);
    await expect(dialog.locator('img')).toHaveJSProperty('naturalWidth', 240);
    await expect(dialog).toHaveCSS('opacity', '1');
    await expect(dialog.locator('#book-detail-title .blur-reveal')).toHaveAttribute('data-reveal', 'done');
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');
    await page.screenshot({ path: `qa-results/integration/coauthor-modal-${width}.png` });
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(opener).toBeFocused();
    await opener.click(); await page.getByRole('button', { name: 'Fechar detalhes' }).click(); await expect(dialog).toHaveCount(0);
    await expect(opener).toBeFocused();
    await opener.click(); await page.mouse.click(2, 2); await expect(dialog).toHaveCount(0);
    await expect(opener).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (width < 801) {
      await page.getByRole('button', { name: 'Abrir menu' }).click();
      await expect(page.getByRole('dialog', { name: 'Menu principal' }).getByRole('link', { name: /Coautorias/ })).toHaveAttribute('href', '/coautorias');
      await page.keyboard.press('Escape');
    } else await expect(page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('link', { name: 'Sobre' })).toHaveAttribute('href', '/#sobre');
    await page.evaluate(() => { (document.activeElement as HTMLElement)?.blur(); window.scrollTo({ top: 0, behavior: 'instant' }); });
    await page.screenshot({ path: `qa-results/integration/coauthors-${width}.png` });
    expect(errors).toEqual([]);
  });
}

test('empty results and failed query can be retried without fake books', async ({ page }) => {
  let fail = true;
  await page.route('https://literare-test.invalid/rest/v1/coauthor_books**', route => fail ? route.fulfill({ status: 403, json: { message: 'Internal details' } }) : route.fulfill({ json: [] }));
  await page.goto('/coautorias');
  await expect(page.getByRole('alert')).toContainText('Não foi possível carregar');
  await expect(page.getByRole('alert')).not.toContainText('Internal details');
  fail = false;
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(page.getByRole('heading', { name: 'Novas histórias estão a caminho.' })).toBeVisible();
  await expect(page.locator('.coauthor-book')).toHaveCount(0);
});

test('management requires authentication and explicit authorization', async ({ page }) => {
  await page.goto('/dashboard/coautorias');
  await expect(page).toHaveURL(/\/login\?next=\/dashboard\/coautorias$/);
  await session(page);
  await page.route('https://literare-test.invalid/rest/v1/rpc/dashboard_access', route => route.fulfill({ json: { version: 1, role: null, read: [], write: [] } }));
  let mutations = 0;
  await page.route('https://literare-test.invalid/rest/v1/coauthor_books**', route => { mutations++; return route.fulfill({ status: 403 }); });
  await page.goto('/dashboard/coautorias');
  await expect(page.getByRole('heading', { name: 'Acesso restrito.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Novo livro' })).toHaveCount(0);
  expect(mutations).toBe(0);
});

test('admin creates, uploads, edits, closes and deletes with confirmation', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await session(page); await images(page);
  await page.route('https://literare-test.invalid/rest/v1/rpc/dashboard_access', route => route.fulfill({ json: { version: 1, role: 'admin', read: ['coautorias'], write: ['coautorias'] } }));
  let rows: ReturnType<typeof sample>[] = [];
  let uploads = 0, removals = 0, deletions = 0;
  await page.route('https://literare-test.invalid/storage/v1/object/coauthor-book-covers**', route => {
    if (route.request().method() === 'POST') { uploads++; return route.fulfill({ json: { Key: 'coauthor-book-covers/test' } }); }
    removals++; return route.fulfill({ json: [] });
  });
  await page.route('https://literare-test.invalid/rest/v1/coauthor_books**', route => {
    const method = route.request().method();
    const url = new URL(route.request().url());
    if (method === 'GET') return route.fulfill({ json: url.searchParams.has('cover_path') ? [] : rows });
    if (method === 'POST') { rows = [{ ...sample(), ...route.request().postDataJSON() }]; return route.fulfill({ json: rows[0] }); }
    if (method === 'PATCH') { rows = [{ ...rows[0], ...route.request().postDataJSON() }]; return route.fulfill({ json: rows[0] }); }
    deletions++; const id = rows[0].id; rows = []; return route.fulfill({ json: { id } });
  });
  await page.goto('/dashboard/coautorias');
  await page.getByRole('button', { name: 'Novo livro' }).click();
  await page.getByLabel('Título do livro').fill('Obra de teste');
  await page.getByRole('dialog').getByLabel('Categoria', { exact: true }).fill('Categoria de teste');
  await page.getByLabel('Coordenador(a) Editorial').fill('Coordenação de teste');
  await page.getByLabel('Sobre o livro').fill('Primeiro parágrafo editorial.\n\nSegundo parágrafo editorial.');
  await page.getByLabel('Status das inscrições').selectOption('open');
  await page.getByRole('button', { name: 'Salvar projeto' }).click();
  await expect(page.getByRole('alert')).toContainText('Adicione uma capa');
  await page.getByLabel('Capa do livro', { exact: true }).setInputFiles({ name: 'invalid.txt', mimeType: 'text/plain', buffer: Buffer.from('invalid') });
  await expect(page.locator('#cover-error')).toContainText('JPG, PNG ou WebP');
  await page.getByLabel('Capa do livro', { exact: true }).setInputFiles('public/images/optimized/books-cover-01-240.webp');
  await expect(page.getByRole('img', { name: 'Pré-visualização da capa' })).toBeVisible();
  await page.getByRole('button', { name: 'Salvar projeto' }).click();
  await expect(page.getByRole('status')).toContainText('Projeto salvo com sucesso');
  expect(uploads).toBe(1);
  await expect(page.locator('.admin-book-row')).toHaveCount(1);
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `qa-results/integration/admin-coauthors-${width}.png`, fullPage: true });
  }
  await page.getByRole('button', { name: 'Editar', exact: true }).click();
  await page.getByLabel('Título do livro').fill('Obra revisada');
  await page.getByRole('button', { name: 'Salvar projeto' }).click();
  await expect(page.locator('.admin-book-row h2')).toHaveText('Obra revisada');
  await page.getByRole('button', { name: 'Encerrar inscrições' }).click();
  await expect(page.locator('.admin-status')).toHaveText('Inscrições encerradas');
  expect(rows[0].registration_status).toBe('closed');
  expect(removals).toBe(0);
  await page.getByRole('button', { name: 'Excluir', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible(); expect(deletions).toBe(0);
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click(); expect(deletions).toBe(0);
  await page.getByRole('button', { name: 'Excluir', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar exclusão' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('status')).toContainText('Projeto excluído com sucesso');
  expect(deletions).toBe(1); expect(removals).toBe(1);
  expect(errors).toEqual([]);
});


