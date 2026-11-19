import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { auth, type AuthedReq } from '../auth.js';
import { genKey, hashKey } from '../apikey.js';
const router = Router();
router.use(auth);
function page(req: any) { const p = Math.max(1, Number(req.query.page || 1)); const l = Math.min(100, Math.max(1, Number(req.query.limit || 20))); return { page: p, limit: l, skip: (p - 1) * l }; }
router.get('/', async (req: AuthedReq, res) => {
  const { page, limit, skip } = page(req);
  const [items, total] = await Promise.all([
    prisma.apiKey.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: 'desc' }, skip, take: limit, select: { id: true, prefix: true, name: true, revokedAt: true, lastUsedAt: true, createdAt: true } }),
    prisma.apiKey.count({ where: { userId: req.user!.id } }),
  ]);
  res.json({ items, page, limit, total });
});
router.post('/', async (req: AuthedReq, res) => {
  const name = z.object({ name: z.string().min(1).max(50).optional() }).safeParse(req.body).data?.name || 'default';
  const full = genKey();
  const key = await prisma.apiKey.create({ data: { userId: req.user!.id, prefix: full.slice(0, 12), hash: hashKey(full), name } });
  await prisma.event.create({ data: { userId: req.user!.id, type: 'key_created' } });
  res.status(201).json({ id: key.id, key: full, prefix: key.prefix, name: key.name, createdAt: key.createdAt });
});
router.post('/:id/revoke', async (req: AuthedReq, res) => {
  const key = await prisma.apiKey.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
  if (!key) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Key not found' } });
  await prisma.apiKey.update({ where: { id: key.id }, data: { revokedAt: new Date() } });
  res.json({ ok: true });
});
router.post('/:id/rotate', async (req: AuthedReq, res) => {
  const old = await prisma.apiKey.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
  if (!old) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Key not found' } });
  await prisma.apiKey.update({ where: { id: old.id }, data: { revokedAt: new Date() } });
  const full = genKey();
  const key = await prisma.apiKey.create({ data: { userId: req.user!.id, prefix: full.slice(0, 12), hash: hashKey(full), name: old.name } });
  await prisma.event.create({ data: { userId: req.user!.id, type: 'key_created' } });
  res.status(201).json({ id: key.id, key: full, prefix: key.prefix, name: key.name });
});
export default router;
