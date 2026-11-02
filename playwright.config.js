import { defineConfig } from '@playwright/test';
export default defineConfig({testDir:'./tests', timeout:20000, use:{baseURL:'http://127.0.0.1:4182'}, webServer:{command:'npm run dev -- --port 4182 --strictPort',url:'http://127.0.0.1:4182',reuseExistingServer:false}, reporter:'list'});
