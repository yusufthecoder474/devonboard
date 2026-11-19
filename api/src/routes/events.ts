import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { auth, type AuthedReq } from '../auth.js';
const router = Router();
router.use(auth);
router.post('/', async (req: AuthedReq, res) => {
  // `first_call_success` is NOT client-settable: only the gateway in
  // apikey.ts creates it, after a real successful sandbox call.
  const p = z.object({ type: z.enum(['signup', 'key_created', 'snippet_copied']) }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: { code: 'VALIDATION', message: 'Invalid event type' } });
  await prisma.event.create({ data: { userId: req.user!.id, type: p.data.type } });
  res.status(201).json({ ok: true });
});
export default router;
