import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./tests/production',outputDir:'qa-results/production',use:{baseURL:'http://127.0.0.1:4197',channel:'msedge'},webServer:{command:'npm run preview -- --port 4197 --strictPort',url:'http://127.0.0.1:4197',reuseExistingServer:false},reporter:'list'});
