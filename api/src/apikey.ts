import crypto from 'crypto';
import { createHash } from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { prisma } from './db.js';
export const hashKey = (k: string) => createHash('sha256').update(k).digest('hex');
export function genKey(): string {
  const bytes = [...crypto.getRandomValues(new Uint8Array(24))].map(b => b.toString(16).padStart(2, '0')).join('');
  return `dv_live_${bytes}`;
}
const hits = new Map<string, number[]>();
export interface KeyReq extends Request { keyId?: string; keyUserId?: string }
async function logCall(keyId: string, endpoint: string, status: number, latencyMs: number) {
  await prisma.apiCall.create({ data: { keyId, endpoint, status, latencyMs } }).catch(() => {});
}
export async function apiKeyAuth(req: KeyReq, res: Response, next: NextFunction) {
  const start = Date.now();
  const raw = req.header('x-api-key');
  // No key (or an unknown key) has no key id, so it cannot be logged
  // against a key. Only calls attributable to a real key are logged.
  if (!raw) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing x-api-key header' } });
  const key = await prisma.apiKey.findUnique({ where: { hash: hashKey(raw) } });
  if (!key) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid or revoked key' } });
  if (key.revokedAt) {
    await logCall(key.id, req.path, 401, Date.now() - start);
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid or revoked key' } });
  }
  const now = Date.now();
  const window = (hits.get(key.id) || []).filter(t => now - t < 60000);
  if (window.length >= 60) {
    await logCall(key.id, req.path, 429, Date.now() - start);
    return res.status(429).json({ error: { code: 'RATE_LIMITED', message: '60 requests/min per key' } });
  }
  window.push(now); hits.set(key.id, window);
  req.keyId = key.id; req.keyUserId = key.userId;
  prisma.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
  res.on('finish', async () => {
    const latency = Date.now() - start;
    await logCall(key.id, req.path, res.statusCode, latency);
    if (res.statusCode < 300) {
      const existing = await prisma.event.findFirst({ where: { userId: key.userId, type: 'first_call_success' } }).catch(() => null);
      if (!existing) await prisma.event.create({ data: { userId: key.userId, type: 'first_call_success' } }).catch(() => {});
    }
  });
  next();
}
