import { test, expect } from '@playwright/test';

for (const width of [375, 768, 1440]) {
  test(`login independent, accessible and responsive at ${width}px`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Bem-vindo de volta.' })).toBeVisible();
    await expect(page.locator('.header, footer')).toHaveCount(0);
    await page.getByRole('textbox', { name: 'E-mail', exact: true }).fill('teste@example.com');
    await page.getByLabel('Senha', { exact: true }).fill('senha-de-teste');
    await page.getByRole('button', { name: 'Mostrar senha' }).click();
    await expect(page.getByLabel('Senha', { exact: true })).toHaveAttribute('type', 'text');
    await page.getByRole('button', { name: 'Ocultar senha' }).click();
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('configuração de autenticação está incompleta');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (width === 1440) await expect(page.locator('.auth-visual canvas')).toHaveCount(1);
    await page.screenshot({ path: `qa-results/login-${width}.png`, fullPage: true });
    expect(errors).toEqual([]);
  });
}

test('unauthenticated dashboard redirects and reduced motion keeps a static visual', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Bem-vindo de volta.' })).toBeVisible();
  await expect(page.locator('.auth-visual canvas')).toHaveCount(0);
  await page.getByRole('link', { name: 'Literare Books' }).click();
  await expect(page.locator('.header-login')).toHaveAttribute('href', '/login');
  await expect(page.locator('#insights, .concept-studies, #subject, .service-details')).toHaveCount(0);
});
