import {test,expect} from '@playwright/test';
import {setupDashboard,user} from './dashboard-fixtures';
for(const width of [375,768,1024,1440]) test(`modules, forms and drawers fit at ${width}px`,async({page})=>{
  await setupDashboard(page);await page.setViewportSize({width,height:900});
  await page.route('https://literare-test.invalid/rest/v1/coauthor_books**',r=>r.fulfill({json:[],headers:{'content-range':'*/0'}}));
  await page.route('https://literare-test.invalid/rest/v1/catalog_books**',r=>r.fulfill({json:[],headers:{'content-range':'*/0'}}));
  await page.route('https://literare-test.invalid/rest/v1/site_content**',r=>r.fulfill({json:[]}));
  await page.route('https://literare-test.invalid/rest/v1/contact_submissions**',r=>r.fulfill({json:[{id:'test',name:'Pessoa de Teste',email:'um.endereco.muito.longo.para.validar.layout@example.com',phone:'(11) 99999-9999',message:'Mensagem com detalhes do contato. '.repeat(20),status:'pending',created_at:user.created_at,updated_at:user.created_at}],headers:{'content-range':'0-0/1'}}));
  await page.route('https://literare-test.invalid/rest/v1/rpc/dashboard_report',r=>r.fulfill({json:{books_categories:[{label:'Uma categoria longa para testar a largura do gráfico',value:2}]}}));
  await page.route('https://literare-test.invalid/rest/v1/rpc/dashboard_users',r=>r.fulfill({json:[{user_id:user.id,email:user.email,role:'admin',modules:[],active:true,created_at:user.created_at}]}));
  async function fits(){expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
  await page.goto('/dashboard/coautorias');await page.getByRole('button',{name:'Novo livro'}).click();await expect(page.getByLabel('Título do livro')).toBeVisible();await fits();await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.goto('/dashboard/catalogo');await page.getByRole('button',{name:'Cadastrar livro',exact:true}).click();await expect(page.getByLabel('Título do livro')).toBeVisible();await fits();await page.keyboard.press('Escape');
  await page.goto('/dashboard/contatos');await page.getByRole('button',{name:/Pessoa de Teste/}).click();await expect(page.getByRole('dialog')).toBeVisible();await fits();await page.keyboard.press('Escape');
  for(const route of ['conteudo','relatorios','usuarios','configuracoes']){await page.goto(`/dashboard/${route}`);await expect(page.locator('.dash-main h1')).toBeVisible();await expect(page.getByRole('status',{name:'Carregando dados'})).toHaveCount(0);await fits();}
  await page.goto('/dashboard/usuarios');await page.getByRole('button',{name:'Autorizar conta existente'}).click();await fits();await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'Autorizar conta existente'})).toBeFocused();
});
