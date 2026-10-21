import { z } from './validation';
export function validISBN(value: string) {
  if(value.length>30||value&& !/^[0-9Xx -]+$/.test(value))return false;
  const v = value.replace(/[ -]/g, '').toUpperCase();
  if (!v) return value==='';
  if(v==='0000000000')return false;
  if (/^\d{9}[\dX]$/.test(v)) return [...v].reduce((sum, digit, i) => sum + (digit === 'X' ? 10 : Number(digit)) * (10 - i), 0) % 11 === 0;
  return /^97[89]\d{10}$/.test(v) && [...v].reduce((sum, digit, i) => sum + Number(digit) * (i % 2 ? 3 : 1), 0) % 10 === 0;
}
export const catalogSchema = z.object({
  title: z.string().trim().min(1, 'Informe o título.').max(180),
  authors: z.array(z.string().trim().min(1).max(100)).min(1, 'Informe pelo menos um autor.').max(30),
  isbn: z.string().trim().max(30).refine(validISBN, 'Informe um ISBN-10 ou ISBN-13 válido.'),
  synopsis: z.string().trim().max(12000), category: z.string().trim().min(1, 'Informe a categoria.').max(100),
  purchase_url: z.string().trim().max(2000).refine(v => !v || /^https?:\/\/\S+$/.test(v), 'Use um endereço HTTP ou HTTPS válido.'),
  publication_status: z.enum(['draft', 'published']),
});
export { safeDashboardNext } from './navigation-security';
export function csvCell(value: unknown) {
  const text = String(value ?? '');
  return `"${(/^(?:\s*[=+\-@]|[\t\r\n])/.test(text) ? "'" : '') + text.replace(/"/g, '""')}"`;
}

