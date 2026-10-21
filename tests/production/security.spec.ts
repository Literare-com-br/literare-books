import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const hosting=JSON.parse(readFileSync('vercel.json','utf8')) as {headers:{source:string;headers:{key:string;value:string}[]}[]};
test('production pages render under configured CSP with isolated administrative bundles',async({page})=>{
  const csp=hosting.headers.find(rule=>rule.source==='/(.*)')!.headers;
  await page.route('http://127.0.0.1:4197/**',async route=>{if(!route.request().isNavigationRequest())return route.continue();const response=await route.fetch();const headers={...response.headers()};for(const {key,value} of csp)headers[key]=value;await route.fulfill({response,headers});});
  await page.addInitScript(()=>{const win=window as typeof window&{policyFailures:string[]};win.policyFailures=[];document.addEventListener('securitypolicyviolation',e=>win.policyFailures.push(JSON.stringify({directive:e.violatedDirective,blocked:e.blockedURI,source:e.sourceFile,line:e.lineNumber,sample:e.sample})));});
  const requests:string[]=[];page.on('request',request=>requests.push(request.url()));
  await page.goto('/login');await expect(page.getByRole('heading',{name:'Bem-vindo de volta.'})).toBeVisible();expect(requests.some(url=>url.includes('HomePage-'))).toBe(false);expect(requests.some(url=>url.includes('Dashboard-'))).toBe(false);
  requests.length=0;await page.goto('/');await expect(page.locator('.hero-bottom h1')).toBeVisible();expect(requests.some(url=>/Dashboard-|Contacts-|contact-xlsx-|Catalog-/.test(url))).toBe(false);await page.locator('#contato').evaluate(el=>window.scrollTo({top:scrollY+el.getBoundingClientRect().top-78,behavior:'instant'}));await expect(page.getByRole('textbox',{name:'Nome completo',exact:true})).toBeVisible();expect(await page.evaluate(()=>(window as typeof window&{policyFailures:string[]}).policyFailures)).toEqual([]);
  await page.goto('/dashboard/contatos');await expect(page).toHaveURL(/\/login/);
});

