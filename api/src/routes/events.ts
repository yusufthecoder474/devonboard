import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { auth, type AuthedReq } from '../auth.js';
const router = Router();
router.use(auth);
router.post('/', async (req: AuthedReq, res) => {
  const p = z.object({ type: z.enum(['signup', 'key_created', 'snippet_copied', 'first_call_success']) }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: { code: 'VALIDATION', message: 'Invalid event type' } });
  if (p.data.type === 'first_call_success') {
    const existing = await prisma.event.findFirst({ where: { userId: req.user!.id, type: 'first_call_success' } });
    if (existing) return res.json({ ok: true, deduped: true });
  }
  await prisma.event.create({ data: { userId: req.user!.id, type: p.data.type } });
  res.status(201).json({ ok: true });
});
export default router;
