import { supabase } from './supabase';
import { validateCover } from './coauthors';
import { catalogSchema } from './dashboard-validation';
import type { Access, CatalogBook, CatalogInput, Contact, Content, Member, Report, Summary } from '../types/dashboard';
export function dashboardClient() {
  if (!supabase) throw new Error('A conexão com o Supabase não está configurada.');
  return supabase;
}
export function dataError(error: unknown): Error {
  const code = (error as {code?: string})?.code;
  if (['PGRST202', 'PGRST205', '42P01', '42703'].includes(code ?? '')) return new Error('O dashboard depende da migration 202610210001. Solicite a aplicação ao responsável pelo Supabase e tente novamente.');
  if (code === '22023') return new Error('Conta não encontrada. Confira o e-mail de uma conta existente no Supabase Auth.');
  return new Error(code === '42501' ? 'Sua conta não tem permissão para esta operação.' : 'Não foi possível concluir a operação. Verifique a conexão e suas permissões e tente novamente.');
}
export async function rpc<T>(name: string, args?: Record<string, unknown>, signal?: AbortSignal): Promise<T> {
  let query = dashboardClient().rpc(name, args);
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query;
  if (error) {
    if(name==='export_contacts_page'&&error.code==='PGRST202')throw new Error('A exportação depende da migration 202610210002. Solicite a aplicação ao responsável pelo Supabase.');
    throw dataError(error);
  }
  return data as T;
}
export const fetchAccess = () => rpc<Access>('dashboard_access');
export const fetchSummary = (signal: AbortSignal) => rpc<Summary>('dashboard_summary', undefined, signal);
export const fetchMembers = (signal: AbortSignal, page = 0, search = '') => rpc<Member[]>('dashboard_users', {member_offset:page*PAGE_SIZE,member_search:search}, signal);
export const fetchReport = (from: string, to: string, signal: AbortSignal) => rpc<Report>('dashboard_report', { date_from: from, date_to: to }, signal);
export const PAGE_SIZE = 12;
export interface ListFilters { page: number; search: string; category?: string; status?: string; author?: string; area?: string; from?: string; to?: string; ascending?: boolean }
export const escapeSearch = (v: string) => v.replace(/[\\%_*,().]/g, ' ').trim().slice(0, 180);
export async function fetchList<T>(table: 'coauthor_books' | 'catalog_books' | 'contact_submissions', filters: ListFilters, signal: AbortSignal) {
  const columns: string = table==='contact_submissions'?'id,name,email,phone,message,status,created_at,updated_at,area_of_activity,area_of_activity_other':table==='coauthor_books'?'id,title,description,category,editorial_coordinator,cover_path,registration_status,created_at,updated_at,created_by':'id,title,authors,isbn,synopsis,category,cover_path,purchase_url,publication_status,created_at,updated_at';
  let query = dashboardClient().from(table).select(columns, { count: 'exact' });
  const search = escapeSearch(filters.search);
  if (search) query = table === 'contact_submissions' ? query.or(`name.ilike.%${search}%,email.ilike.%${search}%`) : query.ilike('title', `%${search}%`);
  if (filters.category) query = query.eq('category', filters.category);
  if (filters.author) query = query.contains('authors', [filters.author.trim()]);
  if (filters.status) query = query.eq(table === 'coauthor_books' ? 'registration_status' : table === 'catalog_books' ? 'publication_status' : 'status', filters.status);
  if(filters.area)query=filters.area==='__unknown__'?query.is('area_of_activity',null):query.eq('area_of_activity',filters.area);
  if (filters.from) query = query.gte('created_at', new Date(`${filters.from}T00:00:00-03:00`).toISOString());
  if (filters.to) { const end = new Date(`${filters.to}T00:00:00-03:00`); end.setUTCDate(end.getUTCDate() + 1); query = query.lt('created_at', end.toISOString()); }
  const { data, error, count } = await query.order('created_at', { ascending: filters.ascending ?? false }).order('id').range(filters.page * PAGE_SIZE, (filters.page + 1) * PAGE_SIZE - 1).abortSignal(signal);
  if(error?.code==='42703'&&table==='contact_submissions')throw new Error('A área de atuação depende da migration 202610210002. Solicite a aplicação ao responsável pelo Supabase.');
  if (error) throw dataError(error);
  return { rows: (data ?? []) as T[], count: count ?? 0 };
}
export async function updateContact(contact: Contact, status: Contact['status']) {
  const { data, error } = await dashboardClient().from('contact_submissions').update({ status }).eq('id', contact.id).select('*').single();
  if (error || !data) throw dataError(error);
  return data as Contact;
}
export function assetUrl(bucket: string, path: string | null) { return path && supabase ? supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl : ''; }
export async function uploadAsset(bucket: string, id: string, file: File) {
  validateCover(file);
  const bitmap = await createImageBitmap(file); bitmap.close();
  const db = dashboardClient();
  const { data: { user }, error } = await db.auth.getUser();
  if (error || !user) throw new Error('Sua sessão expirou. Entre novamente.');
  const ext = {'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp'}[file.type];
  const path = `${user.id}/${id}/${crypto.randomUUID()}.${ext}`;
  const result = await db.storage.from(bucket).upload(path, file, { upsert: false, contentType: file.type });
  if (result.error) throw dataError(result.error);
  return path;
}
export async function cleanupAsset(bucket: string, path: string | null) {
  if (!path) return true;
  try { return !(await dashboardClient().storage.from(bucket).remove([path])).error; } catch { return false; }
}
export async function saveCatalog(input: CatalogInput, file: File | null, previous: CatalogBook | null) {
  const values = catalogSchema.parse(input);
  const db = dashboardClient(), id = previous?.id ?? crypto.randomUUID();
  const uploaded = file ? await uploadAsset('catalog-book-covers', id, file) : null;
  const payload = { ...values, cover_path: uploaded ?? previous?.cover_path ?? null };
  const query = previous ? db.from('catalog_books').update(payload).eq('id', id) : db.from('catalog_books').insert({ ...payload, id });
  const { error, data } = await query.select('*').single();
  if (error || !data) {
    const cleaned = await cleanupAsset('catalog-book-covers', uploaded);
    if (!cleaned) throw new Error('Não foi possível confirmar o salvamento. Atualize a lista antes de repetir. Uma capa pode precisar de limpeza no Storage.');
    throw dataError(error);
  }
  const cleaned = !uploaded || await cleanupAsset('catalog-book-covers', previous?.cover_path ?? null);
  return cleaned ? 'Livro salvo com sucesso.' : 'Livro salvo. A capa anterior precisa de limpeza no Storage.';
}
export async function deleteCatalog(book: CatalogBook) {
  const { error, data } = await dashboardClient().from('catalog_books').delete().eq('id', book.id).select('id').single();
  if (error || !data) throw dataError(error);
  return await cleanupAsset('catalog-book-covers', book.cover_path) ? 'Livro excluído com sucesso.' : 'Livro excluído. A capa precisa de limpeza no Storage.';
}
export async function fetchContent(signal: AbortSignal, publicOnly = false) {
  let query = dashboardClient().from('site_content').select('*');
  if (publicOnly) query = query.eq('state', 'published');
  const { data, error } = await query.abortSignal(signal);
  if (error) throw dataError(error);
  return (data ?? []) as Content[];
}
export async function saveContent(content: Content) {
  const { updated_at: _ignored, ...payload } = content;
  void _ignored;
  const { error, data } = await dashboardClient().from('site_content').upsert(payload, { onConflict: 'key,state' }).select('*').single();
  if (error || !data) throw dataError(error);
}
