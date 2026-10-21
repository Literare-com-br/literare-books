import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/integration', outputDir: 'qa-results/integration',
  use: { baseURL: 'http://127.0.0.1:4176', channel: 'msedge' },
  webServer: {
    command: 'npm run dev -- --port 4176 --strictPort', url: 'http://127.0.0.1:4176', reuseExistingServer: false,
    env: { VITE_SUPABASE_URL: 'https://literare-test.invalid', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_local_test_only', VITE_SUPABASE_ANON_KEY: '', VITE_TURNSTILE_SITE_KEY:'local-test-only' },
  }, reporter: 'list',
});
