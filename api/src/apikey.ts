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
export async function apiKeyAuth(req: KeyReq, res: Response, next: NextFunction) {
  const start = Date.now();
  const raw = req.header('x-api-key');
  if (!raw) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing x-api-key header' } });
  const key = await prisma.apiKey.findUnique({ where: { hash: hashKey(raw) } });
  if (!key || key.revokedAt) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid or revoked key' } });
  const now = Date.now();
  const window = (hits.get(key.id) || []).filter(t => now - t < 60000);
  if (window.length >= 60) return res.status(429).json({ error: { code: 'RATE_LIMITED', message: '60 requests/min per key' } });
  window.push(now); hits.set(key.id, window);
  req.keyId = key.id; req.keyUserId = key.userId;
  prisma.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
  res.on('finish', async () => {
    const latency = Date.now() - start;
    await prisma.apiCall.create({ data: { keyId: key.id, endpoint: req.path, status: res.statusCode, latencyMs: latency } }).catch(() => {});
    if (res.statusCode < 300) {
      const existing = await prisma.event.findFirst({ where: { userId: key.userId, type: 'first_call_success' } }).catch(() => null);
      if (!existing) await prisma.event.create({ data: { userId: key.userId, type: 'first_call_success' } }).catch(() => {});
    }
  });
  next();
}
