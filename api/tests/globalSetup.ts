// Runs once before the test workers start: applies migrations to the
// test database (DATABASE_URL from the environment, default set in
// vitest.config.ts). Never touches the dev database unless DATABASE_URL
// points at it.
import { execSync } from 'child_process';
export default function globalSetup() {
  console.log(`[globalSetup] prisma migrate deploy on ${process.env.DATABASE_URL}`);
  execSync('npx prisma migrate deploy', { stdio: 'inherit', env: process.env });
}
