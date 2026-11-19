import { Router } from 'express';
import { z } from 'zod';
import { apiKeyAuth } from '../apikey.js';
const router = Router();
router.use(apiKeyAuth);
router.post('/echo', (req, res) => {
  const p = z.object({ message: z.string().min(1).max(1000) }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: { code: 'VALIDATION', message: 'message is required' } });
  res.json({ echo: p.data.message });
});
router.post('/text-stats', (req, res) => {
  const p = z.object({ text: z.string().min(1).max(10000) }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: { code: 'VALIDATION', message: 'text is required' } });
  const text = p.data.text;
  res.json({ chars: text.length, words: text.trim().split(/\s+/).filter(Boolean).length, lines: text.split('\n').length });
});
export default router;
