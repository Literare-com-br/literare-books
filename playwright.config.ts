import { defineConfig } from '@playwright/test';
export default defineConfig({testDir:'./tests',testIgnore:['**/integration/**','**/production/**'],outputDir:'qa-results/site',use:{baseURL:'http://127.0.0.1:4180',channel:'msedge'},webServer:{command:'npm run dev -- --port 4180 --strictPort',url:'http://127.0.0.1:4180',reuseExistingServer:false,env:{VITE_SUPABASE_URL:'',VITE_SUPABASE_PUBLISHABLE_KEY:'',VITE_SUPABASE_ANON_KEY:'',VITE_TURNSTILE_SITE_KEY:''}},reporter:'list'});

