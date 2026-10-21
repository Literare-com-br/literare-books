import { createContactHandler } from './handler.ts';
const required=(name:string)=>Deno.env.get(name)||'';
Deno.serve(createContactHandler({origins:required('CONTACT_ALLOWED_ORIGINS').split(',').map(v=>v.trim()).filter(Boolean),secret:required('TURNSTILE_SECRET_KEY'),supabaseUrl:required('SUPABASE_URL'),serviceKey:required('SUPABASE_SERVICE_ROLE_KEY'),hashSecret:required('CONTACT_HASH_SECRET')}));
