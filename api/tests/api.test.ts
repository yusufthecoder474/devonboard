import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { prisma } from '../src/db.js';

// Self-contained: runs against DATABASE_URL from the environment
// (vitest.config.ts defaults it to a local `devonboard_test` database).
// Migrations run once in tests/globalSetup.ts. Every user created here
// is deleted in afterAll (cascades to keys, calls, events, assignments).
const suffix = Date.now();
const emails: string[] = [];
const email = (n: string) => { const e = `${n}-${suffix}@example.test`; emails.push(e); return e; };
afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: emails } } });
  await prisma.$disconnect();
});
async function signup(n: string, extra: Record<string, unknown> = {}) {
  const r = await request(app).post('/api/auth/signup').send({ email: email(n), password: 'Password123!', ...extra });
  expect(r.status).toBe(201);
  return { cookie: r.headers['set-cookie'][0] as string, user: r.body.user };
}
async function createKey(cookie: string) {
  const r = await request(app).post('/api/keys').set('Cookie', cookie).send({ name: 'test' });
  expect(r.status).toBe(201);
  expect(r.body.key.startsWith('dv_live_')).toBe(true);
  return { id: r.body.id as string, key: r.body.key as string, prefix: r.body.prefix as string };
}
async function waitFor(fn: () => Promise<boolean>, label: string) {
  const end = Date.now() + 5000;
  while (Date.now() < end) { if (await fn()) return; await new Promise(r => setTimeout(r, 50)); }
  throw new Error(`timed out waiting for: ${label}`);
}

describe('auth and keys', () => {
  it('signs up and returns a variant', async () => {
    const { user } = await signup('main');
    expect(['A', 'B']).toContain(user.variant);
    expect(user.role).toBe('DEVELOPER');
  });
  it('rejects bad login', async () => {
    const r = await request(app).post('/api/auth/login').send({ email: email('nobody'), password: 'wrong-password' });
    expect(r.status).toBe(401); expect(r.body.error.code).toBe('UNAUTHORIZED');
  });
  it('requires auth for GET /api/keys', async () => {
    const r = await request(app).get('/api/keys');
    expect(r.status).toBe(401);
  });
  it('lists keys with prefix only and never the full key', async () => {
    const { cookie } = await signup('list');
    const { key, prefix } = await createKey(cookie);
    const r = await request(app).get('/api/keys?page=1&limit=20').set('Cookie', cookie);
    expect(r.status).toBe(200);
    expect(r.body.page).toBe(1); expect(r.body.limit).toBe(20); expect(r.body.total).toBe(1);
    expect(r.body.items).toHaveLength(1);
    expect(r.body.items[0].prefix).toBe(prefix);
    expect(r.body.items[0].key).toBeUndefined();
    expect(JSON.stringify(r.body)).not.toContain(key);
  });
  it('blocks signup role escalation: role ADMIN still yields DEVELOPER and funnel 403', async () => {
    const { cookie, user } = await signup('escalate', { role: 'ADMIN' });
    expect(user.role).toBe('DEVELOPER');
    const r = await request(app).get('/api/admin/funnel').set('Cookie', cookie);
    expect(r.status).toBe(403); expect(r.body.error.code).toBe('FORBIDDEN');
  });
  it('rejects client-spoofed first_call_success events', async () => {
    const { cookie } = await signup('spoof');
    const r = await request(app).post('/api/events').set('Cookie', cookie).send({ type: 'first_call_success' });
    expect(r.status).toBe(400);
  });
});

describe('gateway', () => {
  it('rejects a missing key', async () => {
    const r = await request(app).post('/v1/echo').send({ message: 'hi' });
    expect(r.status).toBe(401);
  });
  it('echoes with a valid key and computes text stats', async () => {
    const { cookie } = await signup('echo');
    const { key } = await createKey(cookie);
    const r1 = await request(app).post('/v1/echo').set('x-api-key', key).send({ message: 'hello' });
    expect(r1.status).toBe(200); expect(r1.body.echo).toBe('hello');
    const r2 = await request(app).post('/v1/text-stats').set('x-api-key', key).send({ text: 'hello world' });
    expect(r2.status).toBe(200); expect(r2.body.words).toBe(2); expect(r2.body.chars).toBe(11);
  });
  it('revoked key returns 401 and the 401 is logged', async () => {
    const { cookie } = await signup('revoke');
    const { id, key } = await createKey(cookie);
    const rev = await request(app).post(`/api/keys/${id}/revoke`).set('Cookie', cookie);
    expect(rev.status).toBe(200);
    const r = await request(app).post('/v1/echo').set('x-api-key', key).send({ message: 'hi' });
    expect(r.status).toBe(401);
    const calls = await prisma.apiCall.findMany({ where: { keyId: id, status: 401 } });
    expect(calls.length).toBeGreaterThanOrEqual(1);
    expect(calls[0].latencyMs).toBeGreaterThanOrEqual(0);
  });
  it('61st call in a minute returns 429 and the 429 is logged', async () => {
    const { cookie } = await signup('ratelimit');
    const { id, key } = await createKey(cookie);
    for (let i = 0; i < 60; i++) {
      const r = await request(app).post('/v1/echo').set('x-api-key', key).send({ message: `n${i}` });
      expect(r.status).toBe(200);
    }
    const r = await request(app).post('/v1/echo').set('x-api-key', key).send({ message: 'over' });
    expect(r.status).toBe(429); expect(r.body.error.code).toBe('RATE_LIMITED');
    const calls = await prisma.apiCall.findMany({ where: { keyId: id, status: 429 } });
    expect(calls.length).toBe(1);
  });
  it('gateway marks first_call_success exactly once', async () => {
    const { cookie, user } = await signup('firstcall');
    const { id, key } = await createKey(cookie);
    for (let i = 0; i < 2; i++) {
      const r = await request(app).post('/v1/echo').set('x-api-key', key).send({ message: 'hi' });
      expect(r.status).toBe(200);
    }
    await waitFor(async () => (await prisma.apiCall.count({ where: { keyId: id, status: 200 } })) === 2, '2 logged 200 calls');
    const events = await prisma.event.findMany({ where: { userId: user.id, type: 'first_call_success' } });
    expect(events).toHaveLength(1);
  });
});
