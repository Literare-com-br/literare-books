import {test,expect} from '@playwright/test';
test('public content requests only published versions and preserves institutional structure',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.route('https://literare-test.invalid/rest/v1/site_content**',r=>{expect(new URL(r.request().url()).searchParams.get('state')).toBe('eq.published');return r.fulfill({json:[{key:'hero',state:'published',title:'Um título institucional publicado',body:'',image_url:'',items:[]},{key:'categories',state:'published',title:'Nossos universos',body:'Categorias publicadas pela equipe.',image_url:'',items:['Literatura','Conhecimento']}]});});
  await page.goto('/');await expect(page.locator('.hero-bottom h1')).toHaveAccessibleName('Um título institucional publicado');await expect(page.locator('#sobre .about-card')).toHaveCount(3);await expect(page.locator('.editorial-category')).toHaveCount(2);await expect(page.locator('#universos')).toContainText('Nossos universos');
});
