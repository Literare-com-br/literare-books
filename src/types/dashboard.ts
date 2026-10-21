export type Module = 'coautorias' | 'contatos' | 'catalogo' | 'conteudo' | 'relatorios' | 'usuarios';
export type Role = 'admin' | 'editorial' | 'support' | 'viewer';
export interface Access { version: number; role: Role | null; read: Module[]; write: Module[] }
export interface Contact { id: string; name: string; email: string; phone: string; message: string; status: 'pending' | 'in_progress' | 'completed'; created_at: string; updated_at: string; area_of_activity?: string | null; area_of_activity_other?: string | null }
export interface CatalogBook { id: string; title: string; authors: string[]; isbn: string; synopsis: string; category: string; cover_path: string | null; purchase_url: string; publication_status: 'draft' | 'published'; created_at: string; updated_at: string }
export type CatalogInput = Omit<CatalogBook, 'id' | 'cover_path' | 'created_at' | 'updated_at'>;
export type ContentKey = 'hero' | 'about_intro' | 'about_1' | 'about_2' | 'about_3' | 'banner' | 'categories' | 'contact';
export interface Content { key: ContentKey; state: 'draft' | 'published'; title: string; body: string; image_url: string; items: string[]; updated_at?: string }
export interface Member { user_id: string; email: string; role: Role; modules: Module[]; active: boolean; created_at: string; total_count?: number }
export interface Summary { books?: number; open?: number; contacts?: number; pending?: number; recent_books?: {id: string; title: string; created_at: string}[]; recent_contacts?: {id: string; name: string; created_at: string}[] }
export type Report = Record<string, {label: string; value: number}[]>;
