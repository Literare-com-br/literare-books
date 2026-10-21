import { test, expect } from '@playwright/test';
import { siteContent } from '../src/data/siteContent';
test('portal, responsive layouts, navigation and contact validation',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await page.locator('[data-gp-ready=true]').waitFor();
 await expect(page.locator('[data-gp-motion=on]')).toHaveCount(1);
 await expect(page.locator('h1')).toHaveAccessibleName(siteContent.tagline);
 await expect(page.locator('.hero-bottom h1 .blur-reveal')).toHaveAttribute('data-reveal','done');await page.screenshot({path:'qa-results/desktop-hero.png'});
 await page.evaluate(()=>window.scrollTo({top:innerHeight*.85,behavior:'instant'}));
 await expect.poll(async()=>Number(await page.locator('[data-gp-ready]').getAttribute('data-gp-progress'))).toBeGreaterThan(.2);
 await page.evaluate(()=>window.scrollTo({top:innerHeight*1.7,behavior:'instant'}));
 await expect(page.locator('[data-gp-entered=true]')).toHaveCount(1);
 for(const width of [320,375,430,768,1024,1280,1440,1920]){
  await page.setViewportSize({width,height:900});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
 await page.setViewportSize({width:375,height:812});await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
 await page.screenshot({path:'qa-results/mobile-hero.png'});
 await page.getByRole('button',{name:'Abrir menu'}).click();await expect(page.getByRole('dialog',{name:'Menu principal'})).toBeVisible();
 await page.keyboard.press('Escape');await expect(page.getByRole('dialog',{name:'Menu principal'})).toHaveCount(0);
 await page.getByRole('button',{name:'Abrir menu'}).click();await page.getByRole('dialog').getByRole('link',{name:'Serviços'}).click();
 await expect(page.getByRole('dialog')).toHaveCount(0);
 await page.locator('#contato').evaluate(el=>window.scrollTo({top:scrollY+el.getBoundingClientRect().top-78,behavior:'instant'}));await page.getByRole('button',{name:'Enviar Mensagem'}).click();await expect(page.locator('.field-error .sr-only').first()).toBeVisible();
 await page.getByRole('textbox',{name:'Nome completo',exact:true}).fill('Pessoa de Teste');await page.getByRole('textbox',{name:'E-mail',exact:true}).fill('teste@example.com');await page.getByRole('textbox',{name:'Telefone',exact:true}).fill('(11) 99999-9999');await page.getByLabel('Área de atuação',{exact:true}).selectOption('Psicologia');await page.getByRole('textbox',{name:'Sua mensagem',exact:true}).fill('Gostaria de conversar sobre um novo projeto de identidade.');await page.getByRole('button',{name:'Enviar Mensagem'}).click();await expect(page.getByRole('status')).toContainText('Sua mensagem não foi enviada');
 expect(errors).toEqual([]);
 await page.evaluate(async()=>{const images=Array.from(document.images);images.forEach(img=>{img.loading='eager'});await Promise.all(images.map(img=>img.decode().catch(()=>{})))});expect(await page.evaluate(()=>Array.from(document.images).every(img=>img.naturalWidth>0))).toBe(true);
 await page.screenshot({path:'qa-results/mobile-page.png',fullPage:true});
 await page.emulateMedia({reducedMotion:'reduce'});await page.reload();await expect(page.locator('[data-gp-motion=off]')).toHaveCount(1);await expect(page.locator('#sobre')).toBeAttached();
});
