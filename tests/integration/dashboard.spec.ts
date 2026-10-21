import {test,expect} from '@playwright/test';
import {setupDashboard,user,adminAccess} from './dashboard-fixtures';
const contact={id:'157724e3-e9bd-42a6-aafc-709024b689bb',name:'Pessoa de Teste',email:'pessoa@example.com',phone:'(11) 99999-9999',message:'Uma mensagem real de teste para atendimento.',status:'pending',created_at:'2026-10-01T12:00:00Z',updated_at:'2026-10-01T12:00:00Z'};
for(const width of [375,768,1024,1440]) test(`dashboard responsive and keyboard navigation at ${width}`,async({page})=>{
  await setupDashboard(page);await page.setViewportSize({width,height:960});await page.goto('/dashboard');
  await expect(page.getByRole('heading',{name:'Um novo capítulo, todos os dias.'})).toBeVisible();
  await expect(page.locator('.dash-stat strong')).toHaveText(['1','2','3','1']);
  if(width<1280){await page.getByRole('button',{name:'Abrir navegação'}).click();const dialog=page.getByRole('dialog',{name:'Menu administrativo'});await expect(dialog).toBeVisible();await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(page.getByRole('button',{name:'Abrir navegação'})).toBeFocused();}
  else await expect(page.locator('.dash-sidebar a.active')).toHaveText('Visão Geral');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`qa-results/integration/dashboard-${width}.png`,fullPage:true});
});
test('every dashboard route redirects unauthenticated accounts',async({page})=>{
  for(const path of ['','coautorias','contatos','catalogo','conteudo','relatorios','usuarios','configuracoes']){await page.goto(`/dashboard${path?'/'+path:''}`);await expect(page).toHaveURL(/\/login/);}
});
test('viewer permissions block direct routes and writing',async({page})=>{
  await setupDashboard(page,{version:1,role:'viewer',read:['contatos'],write:[]});
  let requests=0;await page.route('https://literare-test.invalid/rest/v1/catalog_books**',r=>{requests++;return r.fulfill({json:[]});});
  await page.goto('/dashboard/catalogo');await expect(page.getByRole('heading',{name:'Acesso restrito.'})).toBeVisible();expect(requests).toBe(0);
  await page.route('https://literare-test.invalid/rest/v1/contact_submissions**',r=>r.fulfill({json:[contact],headers:{'content-range':'0-0/1'}}));
  await page.goto('/dashboard/contatos');await page.getByRole('button',{name:/Pessoa de Teste/}).click();await expect(page.getByLabel('Status de atendimento')).toBeDisabled();
});
test('missing migration and permission errors are recoverable',async({page})=>{
  await setupDashboard(page);let missing=true;await page.route('https://literare-test.invalid/rest/v1/rpc/dashboard_access',r=>missing?r.fulfill({status:404,json:{code:'PGRST202',message:'private schema detail'}}):r.fulfill({json:adminAccess}));
  await page.goto('/dashboard');await expect(page.getByRole('alert')).toContainText('migration 202610210001');await expect(page.getByRole('alert')).not.toContainText('private schema');missing=false;await page.getByRole('button',{name:'Tentar novamente'}).click();await expect(page.locator('.dash-stat')).toHaveCount(4);
});
test('contacts read, filters, persistent status and failure retry',async({page})=>{
  await setupDashboard(page);let row={...contact},fail=true,updates=0;
  await page.route('https://literare-test.invalid/rest/v1/contact_submissions**',r=>{
    if(r.request().method()==='PATCH'){updates++;row={...row,...r.request().postDataJSON(),updated_at:'2026-10-21T12:00:00Z'};return r.fulfill({json:row});}
    return fail?r.fulfill({status:403,json:{code:'42501',message:'private'}}):r.fulfill({json:[row],headers:{'content-range':'0-0/1'}});
  });
  await page.goto('/dashboard/contatos');await expect(page.getByRole('alert')).toContainText('permissão');fail=false;await page.getByRole('button',{name:'Tentar novamente'}).click();
  await page.getByRole('button',{name:/Pessoa de Teste/}).click();await page.getByLabel('Status de atendimento').selectOption('completed');await expect(page.getByRole('dialog').getByRole('status')).toContainText('Status atualizado');expect(updates).toBe(1);
  await page.keyboard.press('Escape');await page.reload();await expect(page.locator('.dash-inbox')).toContainText('Concluído');await page.getByLabel('Pesquisar nome ou e-mail').fill('Pessoa');await expect.poll(()=>page.locator('.dash-inbox-row').count()).toBe(1);
});
test('catalog validates ISBN and authors then creates, edits and deletes',async({page})=>{
  await setupDashboard(page);let rows:Record<string,unknown>[]=[],deletions=0;
  await page.route('https://literare-test.invalid/rest/v1/catalog_books**',r=>{
    const method=r.request().method();if(method==='GET')return r.fulfill({json:rows,headers:{'content-range':rows.length?'0-0/1':'*/0'}});
    if(method==='DELETE'){deletions++;rows=[];return r.fulfill({json:{id:'test-id'}});}
    rows=[{id:'test-id',created_at:'2026-10-01T12:00:00Z',...rows[0],...r.request().postDataJSON()}];return r.fulfill({json:rows[0]});
  });
  await page.goto('/dashboard/catalogo');await page.getByRole('button',{name:'Cadastrar livro',exact:true}).click();
  await page.getByLabel('Título do livro').fill('Livro de teste');await page.getByRole('dialog').getByLabel('Categoria',{exact:true}).fill('Literatura');await page.getByLabel('Autores (um por linha)').fill('Autora Um\nAutor Dois');await page.getByLabel('ISBN',{exact:true}).fill('123');await page.getByRole('button',{name:'Salvar livro'}).click();await expect(page.getByRole('alert')).toContainText('ISBN');expect(rows).toHaveLength(0);
  await page.getByLabel('ISBN',{exact:true}).fill('978-0-306-40615-7');await page.getByRole('button',{name:'Salvar livro'}).click();await expect(page.getByRole('dialog')).toHaveCount(0);expect(rows[0].authors).toEqual(['Autora Um','Autor Dois']);expect(rows[0].purchase_url).toBe('');
  await page.reload();await expect(page.locator('.dash-book h2')).toHaveText('Livro de teste');await page.getByRole('button',{name:'Editar',exact:true}).click();await page.getByLabel('Título do livro').fill('Edição revisada');await page.getByRole('button',{name:'Salvar livro'}).click();await expect(page.locator('.dash-book h2')).toHaveText('Edição revisada');
  await page.getByRole('button',{name:'Excluir',exact:true}).click();expect(deletions).toBe(0);await page.getByRole('button',{name:'Confirmar exclusão'}).click();await expect(page.getByRole('dialog')).toHaveCount(0);expect(deletions).toBe(1);
});
test('CMS drafts and published versions persist and preview remains escaped',async({page})=>{
  await setupDashboard(page);let rows:Record<string,unknown>[]=[];
  await page.route('https://literare-test.invalid/rest/v1/site_content**',r=>{if(r.request().method()==='GET')return r.fulfill({json:rows});const value=r.request().postDataJSON();rows=rows.filter(c=>!(c.key===value.key&&c.state===value.state));rows.push(value);return r.fulfill({json:value});});
  await page.goto('/dashboard/conteudo');await page.getByLabel('Título',{exact:true}).fill('Uma nova história');await expect(page.getByRole('region',{name:'Pré-visualização'})).toContainText('Uma nova história');await page.getByRole('button',{name:'Salvar rascunho'}).click();await expect(page.getByRole('status')).toContainText('Rascunho salvo');expect(rows[0].state).toBe('draft');
  await page.reload();await expect(page.getByLabel('Título',{exact:true})).toHaveValue('Uma nova história');await page.getByRole('button',{name:'Publicar alterações'}).click();await expect(page.getByRole('status')).toContainText('Conteúdo publicado');expect(rows.map(c=>c.state)).toEqual(['draft','published']);
});
test('reports request real aggregation and export CSV',async({page})=>{
  await setupDashboard(page);await page.route('https://literare-test.invalid/rest/v1/rpc/dashboard_report',r=>{expect(r.request().postDataJSON()).toHaveProperty('date_from');return r.fulfill({json:{contacts_monthly:[{label:'2026-10',value:3}],contacts_status:[{label:'pending',value:1}]}});});
  await page.goto('/dashboard/relatorios');await expect(page.getByRole('heading',{name:'Contatos por mês'})).toBeVisible();await page.getByLabel('Período',{exact:true}).selectOption('7');const download=page.waitForEvent('download');await page.getByRole('button',{name:'Exportar CSV'}).click();expect((await download).suggestedFilename()).toContain('literare-relatorios');
});
test('member management cannot edit own account and submits explicit grants',async({page})=>{
  await setupDashboard(page);await page.route('https://literare-test.invalid/rest/v1/rpc/dashboard_users',r=>r.fulfill({json:[{user_id:user.id,email:user.email,role:'admin',modules:[],active:true,created_at:user.created_at}]}));let payload:unknown;
  await page.route('https://literare-test.invalid/rest/v1/rpc/dashboard_set_member',r=>{payload=r.request().postDataJSON();return r.fulfill({status:204});});
  await page.goto('/dashboard/usuarios');await expect(page.getByRole('button',{name:'Sua conta'})).toBeDisabled();await page.getByRole('button',{name:'Autorizar conta existente'}).click();await page.getByLabel('E-mail da conta existente').fill('leitor@example.com');await page.getByLabel('contatos',{exact:true}).check();await page.getByRole('button',{name:'Salvar permissões'}).click();await expect(page.getByRole('dialog')).toHaveCount(0);expect(payload).toEqual({member_email:'leitor@example.com',member_role:'viewer',member_modules:['contatos'],member_active:true});
});
test('password changes use Auth and logout removes access',async({page})=>{
  await setupDashboard(page);let changed=false;await page.route('https://literare-test.invalid/auth/v1/user',r=>{if(r.request().method()==='PUT'){changed=true;expect(r.request().postDataJSON()).toMatchObject({password:'senha-segura-teste'});}return r.fulfill({json:user});});
  await page.goto('/dashboard/configuracoes');await page.getByLabel('Nova senha',{exact:true}).fill('senha-segura-teste');await page.getByLabel('Confirmar nova senha').fill('senha-segura-teste');await page.getByRole('button',{name:'Alterar senha',exact:true}).click();await expect(page.getByRole('status')).toContainText('Senha alterada');expect(changed).toBe(true);await page.getByRole('button',{name:'Encerrar sessão'}).click();await expect(page).toHaveURL(/\/login/);
});


