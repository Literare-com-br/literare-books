import {test,expect} from '@playwright/test';
import {validISBN,safeDashboardNext,csvCell,catalogSchema} from '../src/lib/dashboard-validation';
test('ISBN checksums, redirect allowlist and CSV formula escaping',()=>{
  for(const isbn of ['', '0-306-40615-2','978-0-306-40615-7','0-8044-2957-X'])expect(validISBN(isbn),isbn).toBe(true);
  for(const isbn of ['123','9780306406158','0306406153','0000000000000'])expect(validISBN(isbn),isbn).toBe(false);
  for(const value of ['https://example.com','//evil.test','/dashboard/../usuarios','/dashboard?next=//evil.test'])expect(safeDashboardNext(value)).toBe('/dashboard');
  expect(safeDashboardNext('/dashboard/contatos')).toBe('/dashboard/contatos');expect(csvCell('=HYPERLINK("x")')).toBe('"\'=HYPERLINK(""x"")"');
  expect(catalogSchema.safeParse({title:'Obra',authors:[],isbn:'',synopsis:'',category:'Categoria',purchase_url:'',publication_status:'draft'}).success).toBe(false);
});
