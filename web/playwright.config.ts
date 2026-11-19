import { defineConfig } from '@playwright/test';
const dbUrl = process.env.DATABASE_URL || 'postgresql://devonboard:devonboard@localhost:5432/devonboard_test?schema=public';
export default defineConfig({
  testDir: './e2e',
  use: { baseURL: 'http://localhost:5173' },
  webServer: [
    {
      // Apply migrations to the test database, then start the API.
      command: 'npx prisma migrate deploy && npm run dev',
      url: 'http://localhost:4000/health',
      cwd: '../api',
      reuseExistingServer: true,
      env: {
        DATABASE_URL: dbUrl,
        JWT_SECRET: process.env.JWT_SECRET || 'e2e-test-secret',
        CORS_ORIGIN: 'http://localhost:5173',
        NODE_ENV: 'test',
        PORT: '4000',
      },
    },
    { command: 'npm run dev', url: 'http://localhost:5173', cwd: '.', reuseExistingServer: true },
  ],
});
