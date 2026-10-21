import { supabase } from './supabase';
import type { BookInput, CoauthorBook } from '../types/coauthor';
export const COVER_BUCKET = 'coauthor-book-covers';
const columns = 'id,title,description,category,editorial_coordinator,cover_path,registration_status,created_at,updated_at,created_by';
function client() {
  if (!supabase) throw new Error('A conexão ainda não está configurada. Tente novamente mais tarde.');
  return supabase;
}
export function coverUrl(path: string | null) {
  return path && supabase ? supabase.storage.from(COVER_BUCKET).getPublicUrl(path).data.publicUrl : '';
}
export async function isCoauthorAdmin() {
  const { data, error } = await client().rpc('is_coauthor_admin');
  if (error) throw new Error('Não foi possível verificar sua permissão. Tente novamente.');
  return data === true;
}
export async function fetchBooks(admin = false, signal?: AbortSignal): Promise<CoauthorBook[]> {
  let query = client().from('coauthor_books').select(columns).order('created_at', { ascending: false });
  if (!admin) query = query.eq('registration_status', 'open');
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query;
  if (error) throw new Error('Não foi possível carregar os projetos. Tente novamente.');
  return (data ?? []) as CoauthorBook[];
}
export function validateCover(file: File) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Escolha uma capa JPG, PNG ou WebP.');
  if (file.size === 0 || file.size > 5 * 1024 * 1024) throw new Error('A capa deve ter até 5 MB e não pode estar vazia.');
}
async function removeUnusedCover(path: string | null): Promise<boolean> {
  if (!path) return true;
  try {
    const db = client();
    const { data, error } = await db.from('coauthor_books').select('id').eq('cover_path', path).limit(1);
    if (error) return false;
    if (data?.length) return true;
    const result = await db.storage.from(COVER_BUCKET).remove([path]);
    return !result.error;
  } catch { return false; }
}
export async function saveBook(input: BookInput, file: File | null, previous: CoauthorBook | null) {
  const db = client();
  const id = previous?.id ?? crypto.randomUUID();
  let uploaded: string | null = null;
  if (file) {
    validateCover(file);
    const { data: { user }, error } = await db.auth.getUser();
    if (error || !user) throw new Error('Sua sessão expirou. Entre novamente para continuar.');
    const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[file.type];
    uploaded = `${user.id}/${id}/${crypto.randomUUID()}.${extension}`;
    const result = await db.storage.from(COVER_BUCKET).upload(uploaded, file, { upsert: false, contentType: file.type });
    if (result.error) {
      const cleaned = await removeUnusedCover(uploaded);
      throw new Error(cleaned ? 'Não foi possível enviar a capa. Verifique sua permissão e tente novamente.' : 'Não foi possível confirmar o upload. Confira a conexão e a limpeza do Storage antes de repetir.');
    }
  }
  const cover_path = uploaded ?? previous?.cover_path ?? null;
  if (input.registration_status === 'open' && !cover_path) throw new Error('Adicione uma capa antes de abrir as inscrições.');
  try {
    const query = previous
      ? db.from('coauthor_books').update({ ...input, cover_path }).eq('id', id)
      : db.from('coauthor_books').insert({ ...input, id, cover_path });
    const { data, error } = await query.select(columns).single();
    if (error || !data) throw new Error('Não foi possível salvar o projeto. Confira sua conexão e permissão e tente novamente.');
    const cleaned = uploaded ? await removeUnusedCover(previous?.cover_path ?? null) : true;
    return { book: data as CoauthorBook, warning: cleaned ? '' : 'Projeto salvo. A capa anterior não pôde ser removida do Storage; a limpeza poderá ser refeita pelo administrador.' };
  } catch (error) {
    const cleaned = await removeUnusedCover(uploaded);
    if (!cleaned) throw new Error('Não foi possível confirmar o salvamento. Confira a lista antes de repetir. Uma capa pode precisar de limpeza no Storage.');
    throw error;
  }
}
export async function deleteBook(book: CoauthorBook) {
  const { data, error } = await client().from('coauthor_books').delete().eq('id', book.id).select('id').single();
  if (error || !data) throw new Error('Não foi possível excluir o projeto. Tente novamente.');
  const cleaned = await removeUnusedCover(book.cover_path);
  return cleaned ? '' : 'Projeto excluído. A capa não pôde ser removida; confira a limpeza no Storage.';
}
