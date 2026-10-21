import { useCallback, useEffect, useRef, useState } from 'react';
export function useDashboardQuery<T>(loader: (signal: AbortSignal) => Promise<T>) {
  const [state, setState] = useState<{ data: T | null; loading: boolean; error: string }>({ data: null, loading: true, error: '' });
  const [revision, setRevision] = useState(0);
  const generation = useRef(0);
  const reload = useCallback(() => setRevision(v => v + 1), []);
  useEffect(() => {
    const controller = new AbortController(), current = ++generation.current;
    setState(old => ({ ...old, data: null, loading: true, error: '' }));
    void loader(controller.signal).then(data => { if (!controller.signal.aborted && current === generation.current) setState({data, loading: false, error: ''}); })
      .catch(error => { if (!controller.signal.aborted && current === generation.current) setState({data: null, loading: false, error: error instanceof Error ? error.message : 'Falha ao carregar os dados.'}); });
    return () => controller.abort();
  }, [loader, revision]);
  return { ...state, reload };
}
