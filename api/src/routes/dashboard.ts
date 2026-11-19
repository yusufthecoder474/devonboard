import { Router } from 'express';
import { prisma } from '../db.js';
import { auth, type AuthedReq } from '../auth.js';
import { p95 } from '../stats.js';
const router = Router();
router.use(auth);
router.get('/', async (req: AuthedReq, res) => {
  const days = Math.min(30, Math.max(1, Number(req.query.days || 14)));
  const keys = await prisma.apiKey.findMany({ where: { userId: req.user!.id }, select: { id: true, prefix: true, name: true, revokedAt: true, lastUsedAt: true, createdAt: true } });
  const calls = await prisma.apiCall.findMany({ where: { keyId: { in: keys.map(k => k.id) }, createdAt: { gte: new Date(Date.now() - days * 86400000) } }, orderBy: { createdAt: 'asc' } });
  const perDay: Record<string, number> = {};
  for (let i = days - 1; i >= 0; i--) { const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10); perDay[d] = 0; }
  for (const c of calls) perDay[c.createdAt.toISOString().slice(0, 10)] = (perDay[c.createdAt.toISOString().slice(0, 10)] || 0) + 1;
  const errors = calls.filter(c => c.status >= 400).length;
  res.json({
    totalCalls: calls.length,
    errorRate: calls.length ? errors / calls.length : 0,
    p95LatencyMs: p95(calls.map(c => c.latencyMs)),
    callsPerDay: Object.entries(perDay).map(([date, count]) => ({ date, count })),
    keys,
  });
});
export default router;
