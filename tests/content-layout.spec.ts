import { test, expect } from '@playwright/test';
import { aboutCards } from '../src/data/about';

for (const width of [375, 768, 1024, 1440]) {
  test(`institutional cards, categories and navigation at ${width}px`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    if (width <= 800) {
      await page.getByRole('button', { name: 'Abrir menu' }).click();
      const menu = page.getByRole('dialog', { name: 'Menu principal' });
      await expect(menu.getByRole('link', { name: 'Projetos' })).toHaveCount(0);
      await expect(menu.getByRole('link', { name: 'Serviços' })).toBeVisible();
      await expect(menu.getByRole('link', { name: 'Coautorias' })).toBeVisible();
      await page.keyboard.press('Escape');
    } else {
      const nav = page.getByRole('navigation', { name: 'Navegação principal' });
      await expect(nav.getByRole('link', { name: 'Projetos' })).toHaveCount(0);
      await expect(nav.getByRole('link', { name: 'Coautorias' })).toBeVisible();
    }
    await page.locator('#sobre').evaluate(el => window.scrollTo({ top: scrollY + el.getBoundingClientRect().top - 90, behavior: 'instant' }));
    await expect(page.locator('#sobre .about-card')).toHaveCount(3);
    await expect(page.locator('#sobre h2 .sr-only')).toHaveText(aboutCards.map(card => card.title));
    await expect(page.locator('#sobre .about-copy p .sr-only')).toHaveText(aboutCards.map(card => card.text));
    for (let i = 0; i < aboutCards.length; i++) {
      const media = page.locator('#sobre .about-media').nth(i);
      await expect(media).toHaveAttribute('data-image-path', `/images/sobre/sobre-literare-0${i + 1}.png`);
      if (await media.locator('img').count()) {
        await expect.poll(() => media.locator('img').evaluate((img: HTMLImageElement) => img.naturalWidth > 0)).toBe(true);
        await expect(media.locator('img')).toHaveCSS('object-fit', 'contain');
        await expect(media.locator('img')).toHaveCSS('object-position', '50% 50%');
      } else await expect(media).toHaveAttribute('data-image-state', 'missing');
    }
    for(const card of await page.locator('#sobre .about-card').all()){
      await card.scrollIntoViewIfNeeded();await expect(card).toHaveCSS('opacity','1');
    }
    await expect(page.locator('#sobre h2 .blur-reveal').first()).toHaveAttribute('data-reveal', 'done');
    await expect(page.locator('#sobre .about-copy p .blur-reveal').first()).toHaveAttribute('data-reveal', 'done');
    await page.screenshot({ path: `qa-results/about-${width}.png` });
    await page.locator('#universos').evaluate(el => window.scrollTo({ top: scrollY + el.getBoundingClientRect().top - 90, behavior: 'instant' }));
    await expect(page.locator('#universos h2')).toHaveAccessibleName('Diferentes gêneros. Infinitas histórias.');
    await expect(page.locator('.editorial-category h3 .sr-only')).toHaveText(['Não ficção', 'Ficção', 'Biografia', 'Infantojuvenil', 'Negócios', 'Desenvolvimento pessoal']);
    await page.locator('.editorial-category').last().scrollIntoViewIfNeeded();
    await expect(page.locator('.editorial-category').last()).toHaveCSS('opacity', '1');
    await expect(page.locator('.editorial-category h3 .blur-reveal').last()).toHaveAttribute('data-reveal', 'done');
    await expect(page.locator('#universos h2.blur-reveal')).toHaveAttribute('data-reveal', 'done');
    await page.screenshot({ path: `qa-results/categories-${width}.png` });
    await expect(page.locator('.testimonials, .projects-support')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Vamos construir juntos' })).toHaveCount(0);
    await expect(page.getByRole('img', { name: 'Retrato ilustrativo de uma profissional em um escritório' })).toHaveCount(0);
    await expect(page.locator('#projetos')).toBeAttached();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  });
}

test('editorial categories stay readable with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.locator('#universos').evaluate(el => window.scrollTo({ top: scrollY + el.getBoundingClientRect().top - 90, behavior: 'instant' }));
  expect(await page.locator('.editorial-category').evaluateAll(rows => rows.every(row => getComputedStyle(row).opacity === '1' && getComputedStyle(row).transform === 'none'))).toBe(true);
});
