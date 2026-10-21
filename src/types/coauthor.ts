export interface CoauthorBook {
  id: string;
  title: string;
  description: string;
  category: string;
  editorial_coordinator: string;
  cover_path: string | null;
  registration_status: 'open' | 'closed';
  created_at: string;
  updated_at: string;
  created_by: string | null;
}
export type BookInput = Pick<CoauthorBook, 'title' | 'description' | 'category' | 'editorial_coordinator' | 'registration_status'>;
