import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import type { Request, Response, NextFunction } from 'express';
export const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
export const hashPw = (p: string) => bcrypt.hash(p, 10);
export const checkPw = (p: string, h: string) => bcrypt.compare(p, h);
export const signToken = (u: { id: string; role: string }) => jwt.sign({ id: u.id, role: u.role }, JWT_SECRET, { expiresIn: '7d' });
export interface AuthedReq extends Request { user?: { id: string; role: string } }
export function auth(req: AuthedReq, res: Response, next: NextFunction) {
  const t = (req as any).cookies?.token;
  if (!t) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Login required' } });
  try { req.user = jwt.verify(t, JWT_SECRET) as any; next(); }
  catch { return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid token' } }); }
}
export function requireAdmin(req: AuthedReq, res: Response, next: NextFunction) {
  if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Admin only' } });
  next();
}
export function setCookie(res: Response, token: string) {
  res.cookie('token', token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 7 * 24 * 3600 * 1000 });
}
