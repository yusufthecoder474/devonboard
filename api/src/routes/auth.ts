import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { hashPw, checkPw, signToken, setCookie, auth, type AuthedReq } from '../auth.js';
import { assignVariant } from '../stats.js';
const router = Router();
const schema = z.object({ email: z.string().email(), password: z.string().min(8), role: z.enum(['DEVELOPER', 'ADMIN']).optional() });
router.post('/signup', async (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: { code: 'VALIDATION', message: parsed.error.issues.map(i => i.message).join(', ') } });
  const { email, password, role } = parsed.data;
  if (await prisma.user.findUnique({ where: { email } })) return res.status(409).json({ error: { code: 'CONFLICT', message: 'Email already registered' } });
  const user = await prisma.user.create({ data: { email, passwordHash: await hashPw(password), role: role || 'DEVELOPER' } });
  const variant = assignVariant(user.id);
  await prisma.experimentAssignment.create({ data: { userId: user.id, variant } });
  await prisma.event.create({ data: { userId: user.id, type: 'signup' } });
  setCookie(res, signToken(user));
  res.status(201).json({ user: { id: user.id, email: user.email, role: user.role, variant } });
});
router.post('/login', async (req, res) => {
  const parsed = z.object({ email: z.string().email(), password: z.string() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: { code: 'VALIDATION', message: 'Invalid input' } });
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !(await checkPw(parsed.data.password, user.passwordHash))) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' } });
  const a = await prisma.experimentAssignment.findUnique({ where: { userId: user.id } });
  setCookie(res, signToken(user));
  res.json({ user: { id: user.id, email: user.email, role: user.role, variant: a?.variant || assignVariant(user.id) } });
});
router.post('/logout', (_req, res) => { res.clearCookie('token'); res.json({ ok: true }); });
router.get('/me', auth, async (req: AuthedReq, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
  const a = await prisma.experimentAssignment.findUnique({ where: { userId: user.id } });
  res.json({ user: { id: user.id, email: user.email, role: user.role, variant: a?.variant || assignVariant(user.id) } });
});
export default router;
