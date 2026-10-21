import {test,expect} from '@playwright/test';
for(const width of [360,390,430,768,1024,1280,1440,1920])test(`login fits at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:960});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/login');
  await expect(page.getByRole('heading',{name:'Bem-vindo de volta.'})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const button=await page.getByRole('button',{name:'Entrar',exact:true}).boundingBox();expect(button!.height).toBeGreaterThanOrEqual(44);
});
