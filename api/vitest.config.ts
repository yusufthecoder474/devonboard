// Test DB URL comes from the environment (CI sets DATABASE_URL to the
// Postgres service). Default is a local `devonboard_test` database so
// `npm test` works out of the box without touching the dev/seed database.
process.env.DATABASE_URL ||= 'postgresql://devonboard:devonboard@localhost:5432/devonboard_test?schema=public';
process.env.JWT_SECRET ||= 'test-secret';
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    environment: 'node',
    testTimeout: 30000,
    globalSetup: './tests/globalSetup.ts',
    pool: 'forks',
    singleFork: true,
    coverage: { provider: 'v8', reporter: ['text', 'html'], include: ['src/**/*.ts'] },
  },
});
