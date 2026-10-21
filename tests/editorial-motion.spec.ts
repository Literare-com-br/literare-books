import { test, expect, type Page } from '@playwright/test';

test.describe.configure({ mode: 'parallel' });
test.setTimeout(45_000);

async function scrollProgress(page: Page, selector: string, progress: number) {
  if(!await page.locator(selector).count()){
    const anchor=selector==='.scroll-morph'?'#servicos':'#projetos';
    await page.locator(anchor).evaluate(el=>window.scrollTo({top:scrollY+el.getBoundingClientRect().top-78,behavior:'instant'}));
  }
  await page.locator(selector).evaluate((element, p) => {
    const rect = element.getBoundingClientRect();
    const header = element.classList.contains('scroll-morph') ? 78 : 0;
    window.scrollTo({ top: scrollY + rect.top - header + (rect.height - innerHeight + header) * p, behavior: 'instant' });
  }, progress);
  // Allow lazy sections/ScrollTrigger to finish refreshing before measuring again.
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.locator(selector).evaluate((element, p) => {
    const rect = element.getBoundingClientRect();
    const header = element.classList.contains('scroll-morph') ? 78 : 0;
    window.scrollTo({ top: scrollY + rect.top - header + (rect.height - innerHeight + header) * p, behavior: 'instant' });
  }, progress);
}

for (const width of [320, 375, 430, 768, 1024, 1440, 1920]) {
  test(`editorial scroll and device fit at ${width}px`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: width < 768 ? 812 : 1000 });
    await page.goto('/');
    await page.locator('[data-gp-ready=true]').waitFor();
    await page.locator('#servicos').evaluate(el=>window.scrollTo({top:scrollY+el.getBoundingClientRect().top-78,behavior:'instant'}));
    const covers = page.locator('.book-front img');
    await expect(covers).toHaveCount(20);
    await expect(page.locator('#sobre .bento')).toHaveCount(1);
    const heading = page.locator('.morph-opening h2');
    await expect(heading).toHaveAccessibleName('Histórias que merecem ganhar o mundo.');
    await scrollProgress(page, '.scroll-morph', 0);
    await expect(page.locator('.scroll-morph')).toHaveAttribute('data-phase', 'line', { timeout: 2000 });
    await expect(page.locator('.scroll-morph')).toHaveAttribute('data-phase', 'circle', { timeout: 3500 });
    await expect(heading).toHaveCSS('opacity', '1');
    await expect.poll(() => page.locator('.morph-stage').evaluate(stage => {
      const bounds = stage.getBoundingClientRect();
      const cx = bounds.left + bounds.width / 2, cy = bounds.top + bounds.height / 2;
      const radius = Math.min(Math.min(bounds.width, bounds.height) * 0.35, 350);
      return Array.from(stage.querySelectorAll('.morph-card')).every(card => {
        const rect = card.getBoundingClientRect();
        return Math.abs(Math.hypot(rect.x + rect.width / 2 - cx, rect.y + rect.height / 2 - cy) - radius) < 1;
      });
    })).toBe(true);
    const ring = await page.locator('.morph-stage').evaluate(stage => {
      const bounds = stage.getBoundingClientRect();
      const cx = bounds.left + bounds.width / 2, cy = bounds.top + bounds.height / 2;
      return Array.from(stage.querySelectorAll('.morph-card')).map(card => {
        const rect = card.getBoundingClientRect();
        return Math.atan2(rect.y + rect.height / 2 - cy, rect.x + rect.width / 2 - cx) * 180 / Math.PI;
      }).sort((a,b) => a-b);
    });
    for (let i=0;i<20;i++) expect((ring[(i+1)%20]-ring[i]+360)%360).toBeCloseTo(18, 0);
    const textBounds = await heading.boundingBox();
    const stageBounds = await page.locator('.morph-stage').boundingBox();
    expect(Math.abs(textBounds!.x + textBounds!.width/2 - (stageBounds!.x + stageBounds!.width/2))).toBeLessThan(1);
    expect(Math.abs(textBounds!.y + textBounds!.height/2 - (stageBounds!.y + stageBounds!.height/2))).toBeLessThan(25);
    await expect(page.locator('.morph-opening p .sr-only')).toHaveText('ROLE PARA EXPLORAR');
    await expect(page.locator('.morph-card').first()).toHaveCSS('width','60px');
    await expect(page.locator('.morph-card').first()).toHaveCSS('height','85px');
    expect(await covers.evaluateAll(imgs => imgs.every(img => (img as HTMLImageElement).naturalWidth > 0))).toBe(true);
    if ([320,768,1440].includes(width)) await page.screenshot({path:`qa-results/morph-${width}-circle.png`});
    // The first 600px reproduce the reference morph; the remaining 2400px shuffle the arc.
    await scrollProgress(page, '.scroll-morph', 0.2);
    await expect.poll(async()=>Number(await page.locator('.scroll-morph').getAttribute('data-morph'))).toBeGreaterThan(.999);
    await expect(page.locator('.morph-closing')).toHaveCSS('opacity','1');
    await expect(heading).toHaveCSS('opacity','0');
    const beforeRotate=await page.locator('.morph-card').last().getAttribute('style');
    if ([320,768,1440].includes(width)) await page.screenshot({path:`qa-results/morph-${width}-arc.png`});
    await scrollProgress(page, '.scroll-morph', 0.45);
    await expect.poll(async()=>Number(await page.locator('.scroll-morph').getAttribute('data-rotation'))).toBeGreaterThan(100);
    expect(await page.locator('.morph-card').last().getAttribute('style')).not.toEqual(beforeRotate);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    // Native wheel scroll remains available, and the scene can be revisited.
    const beforeWheel = await page.evaluate(() => scrollY);
    await page.mouse.wheel(0, 650);
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(beforeWheel);
    // Edge animates wheel input asynchronously; let it finish before jumping back.
    await page.evaluate(() => new Promise<void>(resolve => {
      let previous = scrollY, stable = 0;
      const check = () => {
        stable = Math.abs(scrollY - previous) < .5 ? stable + 1 : 0;
        previous = scrollY;
        if (stable >= 12) resolve(); else requestAnimationFrame(check);
      };
      requestAnimationFrame(check);
    }));
    await page.locator('#diferenciais').evaluate(el=>window.scrollTo({top:scrollY+el.getBoundingClientRect().top-78,behavior:'instant'}));
    await expect(page.locator('#diferenciais.journey-section')).toBeAttached();
    await expect.poll(() => page.locator('#diferenciais').evaluate(el => el.style.getPropertyValue('--timeline-travel'))).not.toBe('');
    await page.locator('#diferenciais').evaluate(el=>window.scrollTo({top:scrollY+el.getBoundingClientRect().top-78,behavior:'instant'}));
    await expect(page.locator('#diferenciais')).toBeInViewport();
    await scrollProgress(page, '.scroll-morph', 0);
    await expect.poll(async()=>Number(await page.locator('.scroll-morph').getAttribute('data-morph'))).toBeLessThan(.001);
    await expect(page.locator('.scroll-morph')).toHaveAttribute('data-phase', 'circle');
    await scrollProgress(page, '.phone-scroll', 0);
    await expect.poll(() => page.locator('[data-phone-device]').evaluate(el => Math.abs(new DOMMatrix(getComputedStyle(el).transform).m23))).toBeGreaterThan(0.1);
    expect(await page.locator('[data-phone-frame]').evaluate(el => {
      const bounds = el.getBoundingClientRect();
      return bounds.left >= 0 && bounds.right <= innerWidth && bounds.top >= 78 && bounds.bottom <= innerHeight;
    })).toBe(true);
    const initial = await page.locator('[data-phone-device]').getAttribute('style');
    await scrollProgress(page, '.phone-scroll', 1);
    await expect.poll(async () => (await page.locator('[data-phone-device]').getAttribute('style')) !== initial).toBe(true);
    await expect.poll(() => page.locator('[data-phone-device]').evaluate(el => Math.abs(new DOMMatrix(getComputedStyle(el).transform).m23))).toBeLessThan(0.01);
    await expect.poll(() => page.locator('.phone-title h2 .blur-letter').last().evaluate(el => getComputedStyle(el).opacity)).toBe('1');
    await expect.poll(() => page.locator('.phone-title p.blur-reveal .blur-letter').last().evaluate(el => getComputedStyle(el).opacity)).toBe('1');
    // Let the spring settle, then verify the complete phone stays inside the viewport.
    await expect.poll(async () => page.locator('[data-phone-frame]').evaluate(el => {
      const rect = el.getBoundingClientRect();
      return rect.left >= 0 && rect.right <= innerWidth && rect.top >= 78 && rect.bottom <= innerHeight;
    })).toBe(true);
    if (await page.locator('.phone-media video').count()) {
      expect(await page.locator('.phone-media video').evaluate((video: HTMLVideoElement) => video.autoplay && video.muted && video.loop && video.playsInline && !video.controls)).toBe(true);
    } else {
      await expect(page.locator('.phone-media')).toHaveAttribute('data-video-state', 'missing');
      await expect(page.locator('.phone-media-note .sr-only')).toHaveText('Vídeo em breve');
    }
    if ([320, 768, 1440].includes(width)) await page.screenshot({ path: `qa-results/phone-${width}.png` });
    await page.locator('#contato').evaluate(el=>window.scrollTo({top:scrollY+el.getBoundingClientRect().top-78,behavior:'instant'}));
    await expect(page.locator('#contato')).toBeInViewport();
    expect(errors).toEqual([]);
  });
}

test('reduced motion keeps text, books and phone readable without a scroll scene', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 320, height: 812 });
  await page.goto('/');
  await page.locator('#servicos').evaluate(el=>window.scrollTo({top:scrollY+el.getBoundingClientRect().top-78,behavior:'instant'}));
  await expect(page.locator('.scroll-morph')).toHaveClass(/is-still/);

  await page.locator('#servicos').scrollIntoViewIfNeeded();
  for (const cover of await page.locator('.morph-card').all()) {
    const rect = await cover.boundingBox();
    expect(rect!.x).toBeGreaterThanOrEqual(0);
    expect(rect!.x + rect!.width).toBeLessThanOrEqual(320);
  }
  await expect(page.locator('.morph-opening h2')).toHaveCSS('opacity', '1');
  await page.locator('#projetos').scrollIntoViewIfNeeded();
  await expect(page.locator('.phone-scroll')).toHaveClass(/is-still/);
  await expect(page.locator('[data-phone-device]')).toHaveCSS('transform', 'none');
});
