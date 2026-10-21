import { createContext, useContext, useLayoutEffect } from 'react';
import type { ReactNode } from 'react';
import { useDashboardQuery } from '../hooks/use-dashboard-query';
import { fetchPublishedContent } from '../lib/published-content';
import { contentDefaults } from '../data/content-defaults';
import type { Content, ContentKey } from '../types/dashboard';
import { ScrollTrigger } from '../lib/gsap';
const Context = createContext<Partial<Record<ContentKey,Content>>>({});
const loadPublished = fetchPublishedContent;
export function PublishedContent({ children }: {children: ReactNode}) {
  const { data } = useDashboardQuery(loadPublished);
  useLayoutEffect(() => {
    if (!data) return;
    const frame = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => cancelAnimationFrame(frame);
  }, [data]);
  const values = Object.fromEntries((data ?? []).map(c=>[c.key,c]));
  return <Context.Provider value={values}>{children}</Context.Provider>;
}
export const usePublishedContent = (key: ContentKey) => useContext(Context)[key] ?? contentDefaults[key];
