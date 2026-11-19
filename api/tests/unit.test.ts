import { describe, it, expect } from 'vitest';
import { assignVariant, twoPropZTest, p95, median } from '../src/stats.js';
describe('assignVariant', () => {
  it('is deterministic', () => { expect(assignVariant('user-1')).toBe(assignVariant('user-1')); });
  it('splits users across A and B', () => {
    const vs = Array.from({ length: 100 }, (_, i) => assignVariant(`u-${i}`));
    expect(vs.includes('A')).toBe(true); expect(vs.includes('B')).toBe(true);
  });
});
describe('twoPropZTest', () => {
  it('detects a large difference', () => { const r = twoPropZTest(50, 100, 30, 100); expect(r.p).toBeLessThan(0.05); });
  it('does not flag identical rates', () => { const r = twoPropZTest(30, 100, 30, 100); expect(r.p).toBeCloseTo(1, 1); });
  it('handles empty groups', () => { expect(twoPropZTest(0, 0, 0, 0).p).toBe(1); });
});
describe('p95 and median', () => {
  it('p95', () => { expect(p95([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20])).toBe(19); });
  it('median odd/even', () => { expect(median([3, 1, 2])).toBe(2); expect(median([1, 2, 3, 4])).toBe(2.5); expect(median([])).toBeNull(); });
});
