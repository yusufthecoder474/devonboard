import { Router } from 'express';
import { prisma } from '../db.js';
import { auth, requireAdmin } from '../auth.js';
import { median, twoPropZTest } from '../stats.js';
const router = Router();
router.use(auth, requireAdmin);
router.get('/funnel', async (_req, res) => {
  const assignments = await prisma.experimentAssignment.findMany();
  const events = await prisma.event.findMany({ orderBy: { createdAt: 'asc' } });
  const byUser = new Map<string, Record<string, Date>>();
  for (const e of events) { const m = byUser.get(e.userId) || {}; m[e.type] = m[e.type] || e.createdAt; byUser.set(e.userId, m); }
  const variants = ['A', 'B'] as const;
  const rows = variants.map(v => {
    const users = assignments.filter(a => a.variant === v).map(a => a.userId);
    const count = (t: string) => users.filter(u => byUser.get(u)?.[t]).length;
    const key = count('key_created'), snip = count('snippet_copied'), first = count('first_call_success');
    const times = users.map(u => { const m = byUser.get(u); return m?.signup && m?.first_call_success ? m.first_call_success.getTime() - m.signup.getTime() : null; }).filter((x): x is number => x !== null);
    return { variant: v, users: users.length, keyCreated: key, snippetCopied: snip, firstCallSuccess: first, conversionToFirstCall: users.length ? first / users.length : 0, medianMsToFirstCall: median(times) };
  });
  const test = twoPropZTest(rows[0].firstCallSuccess, rows[0].users, rows[1].firstCallSuccess, rows[1].users);
  res.json({ variants: rows, zTest: test });
});
export default router;
