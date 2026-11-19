// Wipe and reseed ON PURPOSE. The normal seed (prisma/seed.ts) is
// idempotent and never wipes. Usage: npm run seed:reset
import { PrismaClient } from '@prisma/client';
import { spawnSync } from 'child_process';
const prisma = new PrismaClient();
async function main() {
  await prisma.event.deleteMany();
  await prisma.apiCall.deleteMany();
  await prisma.apiKey.deleteMany();
  await prisma.experimentAssignment.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$disconnect();
  const r = spawnSync('npx', ['prisma', 'db', 'seed'], { stdio: 'inherit', shell: true });
  process.exit(r.status ?? 1);
}
main();
