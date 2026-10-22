import { CATEGORIES, PAYMENT_METHODS, type Category, type PaymentMethod } from '../types/models';
import { isValidISODate } from './dates';
import { isPositiveMoney, parseMoney, toPaise } from './money';

export type FieldErrors<T extends string> = Partial<Record<T, string>>;

export const requiredText = (value: string | undefined, label: string, max = 200): string | undefined => {
  const v = (value ?? '').trim();
  if (!v) return `${label} is required`;
  if (v.length > max) return `${label} must be ${max} characters or less`;
  return undefined;
};

export const optionalText = (value: string | undefined, label: string, max = 1000): string | undefined => {
  const v = (value ?? '').trim();
  if (v.length > max) return `${label} must be ${max} characters or less`;
  return undefined;
};

export const validatePhone = (value: string | undefined): string | undefined => {
  const v = (value ?? '').trim();
  if (!v) return undefined;
  if (!/^[+\d][\d\s-]{5,19}$/.test(v)) return 'Enter a valid phone number';
  return undefined;
};

export const validateAmount = (
  value: string | number | undefined,
  label = 'Amount',
  options?: { allowZero?: boolean; max?: number },
): string | undefined => {
  const parsed = typeof value === 'number' ? value : parseMoney(value ?? '');
  if (parsed === null) return `${label} must be a number`;
  if (toPaise(parsed) < 0) return `${label} cannot be negative`;
  if (!options?.allowZero && !isPositiveMoney(parsed)) return `${label} must be greater than zero`;
  if (options?.max !== undefined && toPaise(parsed) > toPaise(options.max))
    return `${label} cannot exceed ${options.max}`;
  if (toPaise(parsed) > toPaise(1_00_00_00_000)) return `${label} is unrealistically large`;
  return undefined;
};

export const validateDate = (value: string | undefined, label = 'Date', required = true): string | undefined => {
  if (!value) return required ? `${label} is required` : undefined;
  if (!isValidISODate(value)) return `${label} must be a valid date`;
  return undefined;
};

export const isCategory = (v: unknown): v is Category =>
  typeof v === 'string' && (CATEGORIES as readonly string[]).includes(v);

export const isPaymentMethod = (v: unknown): v is PaymentMethod =>
  typeof v === 'string' && (PAYMENT_METHODS as readonly string[]).includes(v);

/** Case/whitespace-insensitive category lookup so "credit card" imports correctly. */
export const normalizeCategory = (v: unknown): Category | null => {
  if (typeof v !== 'string') return null;
  const key = v.trim().toLowerCase();
  return CATEGORIES.find((c) => c.toLowerCase() === key) ?? null;
};

export const normalizePaymentMethod = (v: unknown): PaymentMethod | null => {
  if (typeof v !== 'string') return null;
  const key = v.trim().toLowerCase();
  return PAYMENT_METHODS.find((c) => c.toLowerCase() === key) ?? null;
};

export const normalizeName = (name: string): string => name.trim().replace(/\s+/g, ' ').toLowerCase();

export const parseBoolean = (v: unknown): boolean => {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (typeof v !== 'string') return false;
  return ['yes', 'y', 'true', '1', 'applied'].includes(v.trim().toLowerCase());
};

export const hasErrors = (errors: Record<string, string | undefined>): boolean =>
  Object.values(errors).some(Boolean);
