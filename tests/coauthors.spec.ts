import { test, expect } from '@playwright/test';
test('public route handles missing configuration and admin route requires login', async ({ page }) => {
  await page.goto('/coautorias');
  await expect(page.getByRole('heading', { name: 'Histórias que começam com você.' })).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('conexão ainda não está configurada');
  await expect(page.getByRole('button', { name: 'Tentar novamente' })).toBeVisible();
  await page.goto('/dashboard/coautorias');
  await expect(page).toHaveURL(/\/login\?next=\/dashboard\/coautorias$/);
  await expect(page.getByRole('heading', { name: 'Bem-vindo de volta.' })).toBeVisible();
});
