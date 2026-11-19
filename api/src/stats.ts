import { createHash } from 'crypto';
export function assignVariant(userId: string): 'A' | 'B' {
  const h = createHash('sha256').update(userId).digest('hex');
  return parseInt(h.slice(0, 8), 16) % 2 === 0 ? 'A' : 'B';
}
export function median(a: number[]): number | null {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y); const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
export function p95(a: number[]): number {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y);
  return s[Math.min(s.length - 1, Math.ceil(0.95 * s.length) - 1)];
}
function erf(x: number): number {
  const s = x < 0 ? -1 : 1; x = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * x);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return s * y;
}
export function normCdf(z: number) { return 0.5 * (1 + erf(z / Math.SQRT2)); }
export function twoPropZTest(x1: number, n1: number, x2: number, n2: number) {
  if (!n1 || !n2) return { z: 0, p: 1 };
  const p1 = x1 / n1, p2 = x2 / n2, p = (x1 + x2) / (n1 + n2);
  const se = Math.sqrt(p * (1 - p) * (1 / n1 + 1 / n2));
  if (se === 0) return { z: 0, p: 1 };
  const z = (p1 - p2) / se;
  return { z, p: 2 * (1 - normCdf(Math.abs(z))) };
}
