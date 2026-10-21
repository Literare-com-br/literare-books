import {test,expect} from '@playwright/test';
import {contactsCSV,contactExportRows} from '../src/lib/contact-export-format';
import {contactsWorkbook} from '../src/lib/contact-xlsx';
import {writeFile,mkdir} from 'node:fs/promises';
test('CSV escapes formulas, preserves full messages, BOM, labels and São Paulo time',()=>{
  const csv=contactsCSV([{id:'x',name:'=HYPERLINK("x")',email:'a@example.com',phone:'+5511999999999',message:'Linha 1; com "aspas"\nLinha 2 completa',status:'pending',created_at:'2026-10-21T01:00:00Z',updated_at:'2026-10-21T01:00:00Z'}]);
  expect(csv.startsWith('\uFEFF')).toBe(true);expect(csv).toContain('"Área de atuação"');expect(csv).toContain('"Não informado"');expect(csv).toContain('"\'=HYPERLINK(""x"")"');expect(csv).toContain('20/10/2026, 22:00:00');expect(csv).toContain('Linha 2 completa');
});
test('Excel is an OOXML ZIP with text cells and no formula nodes',async()=>{
  const rows=contactExportRows([{id:'x',name:'=1+1',email:'a@example.com',phone:'+5511999999999',area_of_activity:'Outros',area_of_activity_other:'Pesquisa',message:'Texto <seguro> & completo',status:'completed',created_at:'2026-10-21T01:00:00Z',updated_at:'2026-10-21T01:00:00Z'}]);
  const bytes=contactsWorkbook(rows);expect([...bytes.slice(0,4)]).toEqual([80,75,3,4]);const contents=new TextDecoder().decode(bytes);expect(contents).toContain('t="inlineStr"');expect(contents).not.toContain('<f>');expect(contents).toContain('&lt;seguro&gt; &amp;');
  await mkdir('qa-results/export',{recursive:true});await writeFile('qa-results/export/contacts.xlsx',bytes);
});

