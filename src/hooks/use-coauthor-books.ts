import { useCallback, useEffect, useState } from 'react';
import { fetchBooks } from '../lib/coauthors';
import type { CoauthorBook } from '../types/coauthor';
export function useCoauthorBooks(admin = false) {
  const [state, setState] = useState<{ books: CoauthorBook[]; loading: boolean; error: string }>({ books: [], loading: true, error: '' });
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setState(old => ({ ...old, loading: true, error: '' }));
    void fetchBooks(admin, controller.signal).then(books => {
      if (active) setState({ books, loading: false, error: '' });
    }).catch((error: unknown) => {
      if (active) setState(old => ({ ...old, loading: false, error: error instanceof Error ? error.message : 'Não foi possível carregar os projetos.' }));
    });
    return () => { active = false; controller.abort(); };
  }, [admin, revision]);
  return { ...state, reload };
}
