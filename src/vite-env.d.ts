/// <reference types="vite/client" />
declare const __LOCAL_VIDEOS__:string[];
declare const __ABOUT_IMAGES__:string[];
interface ImportMetaEnv {
  readonly VITE_TURNSTILE_SITE_KEY?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}
