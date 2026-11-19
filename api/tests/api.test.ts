import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { prisma } from '../src/db.js';
const email = `test-${Date.now()}@example.test`;
let cookie = '', key = '';
beforeAll(async () => { await prisma.event.deleteMany({ where: { user: { email } } }); });
afterAll(async () => { await prisma.$disconnect(); });
describe('auth and keys', () => {
  it('signs up and returns a variant', async () => {
    const r = await request(app).post('/api/auth/signup').send({ email, password: 'Password123!' });
    expect(r.status).toBe(201); expect(['A', 'B']).toContain(r.body.user.variant);
    cookie = r.headers['set-cookie'][0];
  });
  it('rejects bad login', async () => {
    const r = await request(app).post('/api/auth/login').send({ email, password: 'wrong-password' });
    expect(r.status).toBe(401); expect(r.body.error.code).toBe('UNAUTHORIZED');
  });
  it('creates a key and shows it once', async () => {
    const r = await request(app).post('/api/keys').set('Cookie', cookie).send({ name: 'test' });
    expect(r.status).toBe(201); expect(r.body.key.startsWith('dv_live_')).toBe(true); key = r.body.key;
  });
  it('lists keys with prefix only, no full key', async () => {
    const r = await request(app).get('/api/keys?page=1&limit=20').set('Cookie', cookie);
    expect(r.status).toBe(200); expect(r.body.items[0].key).toBeUndefined(); expect(r.body.items[0].prefix).toBeTruthy();
  });
});
describe('gateway', () => {
  it('rejects a missing key', async () => {
    const r = await request(app).post('/v1/echo').send({ message: 'hi' });
    expect(r.status).toBe(401);
  });
  it('echoes with a valid key', async () => {
    const r = await request(app).post('/v1/echo').set('x-api-key', key).send({ message: 'hello' });
    expect(r.status).toBe(200); expect(r.body.echo).toBe('hello');
  });
  it('computes text stats', async () => {
    const r = await request(app).post('/v1/text-stats').set('x-api-key', key).send({ text: 'hello world' });
    expect(r.status).toBe(200); expect(r.body.words).toBe(2); expect(r.body.chars).toBe(11);
  });
});
