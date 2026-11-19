import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: '.',
  use: { baseURL: 'http://localhost:5173' },
  webServer: [
    { command: 'npm run dev', url: 'http://localhost:4000/health', cwd: '../api', reuseExistingServer: true },
    { command: 'npm run dev', url: 'http://localhost:5173', cwd: '../web', reuseExistingServer: true },
  ],
});
