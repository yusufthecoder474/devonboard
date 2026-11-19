import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { createHash } from 'crypto';
const prisma = new PrismaClient();
function rng(seed: number) { let a = seed; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rand = rng(42);
const hash = bcrypt.hashSync('Password123!', 10);
// Idempotent: never wipe on boot. Run `npm run seed:reset` to wipe on purpose.
async function main() {
  if (await prisma.user.count() > 0) { console.log('Seed skipped: users already exist (use npm run seed:reset to wipe and reseed).'); return; }
  const admin = await prisma.user.create({ data: { email: 'admin@devonboard.test', passwordHash: hash, role: 'ADMIN' } });
  await prisma.experimentAssignment.create({ data: { userId: admin.id, variant: 'A' } });
  for (let i = 0; i < 500; i++) {
    const variant = i % 2 === 0 ? 'A' : 'B';
    const daysAgo = Math.floor(rand() * 30);
    const signup = new Date(Date.now() - daysAgo * 86400000 - Math.floor(rand() * 80000000));
    const u = await prisma.user.create({ data: { email: `dev${i}@example.test`, passwordHash: hash, createdAt: signup } });
    await prisma.experimentAssignment.create({ data: { userId: u.id, variant, createdAt: signup } });
    await prisma.event.create({ data: { userId: u.id, type: 'signup', createdAt: signup } });
    // Same conversion probabilities for A and B: the synthetic data must
    // not pre-decide a winner. The z-test on it is a demo only.
    const pKey = 0.62;
    if (rand() > pKey) continue;
    const t1 = new Date(signup.getTime() + Math.floor(rand() * 3600000));
    await prisma.event.create({ data: { userId: u.id, type: 'key_created', createdAt: t1 } });
    const raw = `dv_live_seed${String(i).padStart(4, '0')}`;
    const key = await prisma.apiKey.create({ data: { userId: u.id, prefix: raw.slice(0, 12), hash: createHash('sha256').update(raw).digest('hex'), name: 'default', createdAt: t1, lastUsedAt: t1 } });
    if (rand() > 0.70) continue;
    const t2 = new Date(t1.getTime() + Math.floor(rand() * 600000));
    await prisma.event.create({ data: { userId: u.id, type: 'snippet_copied', createdAt: t2 } });
    if (rand() > 0.65) continue;
    const t3 = new Date(t2.getTime() + Math.floor(rand() * 900000));
    await prisma.event.create({ data: { userId: u.id, type: 'first_call_success', createdAt: t3 } });
    const n = 1 + Math.floor(rand() * 20);
    for (let j = 0; j < n; j++) await prisma.apiCall.create({ data: { keyId: key.id, endpoint: '/v1/echo', status: rand() < 0.95 ? 200 : 400, latencyMs: 5 + Math.floor(rand() * 120), createdAt: new Date(t3.getTime() + j * 60000) } });
  }
  console.log('Seeded 500 synthetic users + 1 admin (admin@devonboard.test / Password123!)');
}
main().finally(() => prisma.$disconnect());
