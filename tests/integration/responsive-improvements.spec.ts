import {test,expect} from '@playwright/test';
import {setupDashboard,user} from './dashboard-fixtures';
for(const width of [360,390,430,768,1024,1280,1440,1920])test(`public and administrative routes remain usable at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:960});await setupDashboard(page);
  await page.route('**/rest/v1/site_content**',r=>r.fulfill({json:[]}));await page.route('**/rest/v1/coauthor_books**',r=>r.fulfill({json:[],headers:{'content-range':'*/0'}}));await page.route('**/rest/v1/catalog_books**',r=>r.fulfill({json:[],headers:{'content-range':'*/0'}}));await page.route('**/rest/v1/contact_submissions**',r=>r.fulfill({json:[{id:'x',name:'Pessoa Teste',email:'pessoa@example.com',phone:'11999999999',message:'Mensagem de teste.',status:'pending',created_at:user.created_at,updated_at:user.created_at}],headers:{'content-range':'0-0/1'}}));await page.route('**/rest/v1/rpc/dashboard_report',r=>r.fulfill({json:{contacts_monthly:[{label:'2026-10',value:1}]}}));await page.route('**/rest/v1/rpc/dashboard_users',r=>r.fulfill({json:[]}));
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  for(const path of ['/','/coautorias','/dashboard','/dashboard/coautorias','/dashboard/contatos','/dashboard/catalogo','/dashboard/conteudo','/dashboard/relatorios','/dashboard/usuarios','/dashboard/configuracoes']){
    await page.goto(path);await expect(page.locator('h1').first()).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),path).toBe(true);
    if(path==='/'){await page.locator('#contato').scrollIntoViewIfNeeded();await expect(page.getByLabel('Área de atuação',{exact:true})).toBeVisible();}
    if(path==='/dashboard/contatos'){await page.getByRole('button',{name:'Exportar contatos',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();expect(await page.getByRole('dialog').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);await page.keyboard.press('Escape');}
  }
  expect(errors).toEqual([]);await page.screenshot({path:`qa-results/integration/improvements-${width}.png`,fullPage:true});
});
