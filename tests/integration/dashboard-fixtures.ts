import type { Page } from '@playwright/test';
export const userId='047724e3-e9bd-42a6-aafc-709024b689bb';
export const user={id:userId,email:'admin@example.com',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{full_name:'Editora Teste'},created_at:'2026-10-01T12:00:00Z'};
export const adminAccess={version:1,role:'admin',read:['coautorias','contatos','catalogo','conteudo','relatorios','usuarios'],write:['coautorias','contatos','catalogo','conteudo','relatorios','usuarios']};
export async function setupDashboard(page:Page,access:unknown=adminAccess) {
  await page.addInitScript(({user})=>localStorage.setItem('sb-literare-test-auth-token',JSON.stringify({access_token:'test-access-token',refresh_token:'test-refresh-token',token_type:'bearer',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,user})),{user});
  await page.route('https://literare-test.invalid/auth/v1/**',r=>r.request().url().includes('/logout')?r.fulfill({status:204}):r.fulfill({json:user}));
  await page.route('https://literare-test.invalid/rest/v1/rpc/dashboard_access',r=>r.fulfill({json:access}));
  await page.route('https://literare-test.invalid/rest/v1/rpc/dashboard_summary',r=>r.fulfill({json:{books:2,open:1,contacts:3,pending:1,recent_books:[],recent_contacts:[]}}));
  await page.emulateMedia({reducedMotion:'reduce'});
}
