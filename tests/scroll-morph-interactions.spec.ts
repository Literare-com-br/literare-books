import { test, expect } from '@playwright/test';

test('desktop entrance timings, original FlipCard and arc parallax', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await page.locator('#servicos').evaluate(el=>window.scrollTo({top:scrollY+el.getBoundingClientRect().top-78,behavior:'instant'}));
  const scene = page.locator('.scroll-morph');
  // Record actual DOM phase changes, rather than sleeping through the intro.
  await scene.evaluate(element => {
    type TimedScene = HTMLElement & { phaseTimes: { phase: string; time: number }[] };
    const scene = element as TimedScene;
    scene.phaseTimes = [];
    const observer = new MutationObserver(() => {
      const phase = scene.dataset.phase ?? '';
      if (scene.phaseTimes.at(-1)?.phase !== phase) scene.phaseTimes.push({ phase, time: performance.now() });
    });
    observer.observe(scene, { attributes: true, attributeFilter: ['data-phase'] });
  });
  await scene.evaluate(el => window.scrollTo({ top: scrollY + el.getBoundingClientRect().top - 78, behavior: 'instant' }));
  await expect(scene).toHaveAttribute('data-phase', 'line', { timeout: 2000 });
  await expect(scene).toHaveAttribute('data-phase', 'circle', { timeout: 3500 });
  const times = await scene.evaluate(element => (element as HTMLElement & { phaseTimes: { phase: string; time: number }[] }).phaseTimes);
  expect(times.map(t => t.phase)).toEqual(['line', 'circle']);
  const lineToCircle = times[1].time - times[0].time;
  expect(lineToCircle).toBeGreaterThan(1800);
  expect(lineToCircle).toBeLessThan(2300);
  await scene.evaluate(el => window.scrollTo({ top: scrollY + el.getBoundingClientRect().top - 78 + 600, behavior: 'instant' }));
  await expect.poll(async () => Number(await scene.getAttribute('data-morph'))).toBeGreaterThan(.999);
  await expect(page.locator('.morph-closing')).toHaveCSS('opacity', '1');
  // Wait for the original second spring (card stiffness 40 / damping 15).
  const card = page.locator('.morph-card').nth(10);
  await expect.poll(() => card.evaluate(el => {
    const m = new DOMMatrix(getComputedStyle(el).transform);
    return Math.abs(Math.hypot(m.m11, m.m12) - 1.8);
  })).toBeLessThan(.01);
  const before = await card.boundingBox();
  await page.mouse.move(1440 * .85, 400);
  await expect.poll(async () => Number(await scene.getAttribute('data-parallax'))).toBeGreaterThan(60);
  await expect.poll(async () => (await card.boundingBox())!.x - before!.x).toBeGreaterThan(45);
  await page.mouse.move(720, 400); // Original parallax recenters at the middle of the scene.
  await expect.poll(async () => Math.abs(Number(await scene.getAttribute('data-parallax')))).toBeLessThan(1);
  await expect.poll(async () => Math.abs((await card.boundingBox())!.x-before!.x)).toBeLessThan(2);
  const flip = card.locator('.book-flip');
  await flip.hover();
  await expect.poll(() => flip.evaluate(el => new DOMMatrix(getComputedStyle(el).transform).m11)).toBeLessThan(-.95);
  await page.mouse.move(720, 400);
  await expect.poll(() => flip.evaluate(el => new DOMMatrix(getComputedStyle(el).transform).m11)).toBeGreaterThan(.95);
  // The sticky scene does not capture the page's scroll.
  await page.locator('#diferenciais').scrollIntoViewIfNeeded();
  await expect(page.locator('#diferenciais')).toBeInViewport();
});
