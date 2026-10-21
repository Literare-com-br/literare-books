import { createContext, useContext } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { Access, Module } from '../../types/dashboard';
export const DashboardContext = createContext<{ session: Session; access: Access } | null>(null);
export function useDashboard() {
  const value = useContext(DashboardContext);
  if (!value) throw new Error('Contexto administrativo indisponível.');
  return { ...value, canWrite: (resource: Module) => value.access.write.includes(resource) };
}
