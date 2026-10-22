/**
 * Exact money arithmetic. Amounts are rupees stored as JS numbers; every operation
 * converts to integer paise, operates on integers, and converts back. This avoids
 * floating point drift such as 0.1 + 0.2 !== 0.3.
 */

export const toPaise = (rupees: number): number => {
  if (!Number.isFinite(rupees)) return 0;
  return Math.round(rupees * 100);
};

export const fromPaise = (paise: number): number => paise / 100;

/** Round a rupee value to exactly 2 decimals. */
export const roundMoney = (value: number): number => fromPaise(toPaise(value));

export const addMoney = (...values: number[]): number =>
  fromPaise(values.reduce((acc, v) => acc + toPaise(v), 0));

export const subMoney = (a: number, b: number): number => fromPaise(toPaise(a) - toPaise(b));

export const sumMoney = (values: Iterable<number>): number => {
  let total = 0;
  for (const v of values) total += toPaise(v);
  return fromPaise(total);
};

export const compareMoney = (a: number, b: number): -1 | 0 | 1 => {
  const pa = toPaise(a);
  const pb = toPaise(b);
  return pa < pb ? -1 : pa > pb ? 1 : 0;
};

export const isZeroMoney = (a: number): boolean => toPaise(a) === 0;
export const isPositiveMoney = (a: number): boolean => toPaise(a) > 0;
export const isNegativeMoney = (a: number): boolean => toPaise(a) < 0;

/** Percentage (0..100+) rounded to 1 decimal, computed on integer paise. */
export const percentOf = (part: number, whole: number): number => {
  const w = toPaise(whole);
  if (w <= 0) return 0;
  return Math.round((toPaise(part) / w) * 1000) / 10;
};

/** Parse user/Excel input into a rupee number. Accepts "₹1,00,000.50", "Rs 100000", 100000. */
export const parseMoney = (input: unknown): number | null => {
  if (typeof input === 'number') return Number.isFinite(input) ? roundMoney(input) : null;
  if (typeof input !== 'string') return null;
  const cleaned = input
    .replace(/^\s*(rs\.?|inr)\s*/i, '')
    .replace(/[₹,\s]/g, '');
  if (cleaned === '') return null;
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? roundMoney(n) : null;
};
