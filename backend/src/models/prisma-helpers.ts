import { Prisma } from '@prisma/client';

export function stripUndefined<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined)
  ) as Partial<T>;
}

export function toNullableDate(value?: string | Date | null): Date | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value === 'string' && value.trim() === '') {
    return null;
  }

  return value instanceof Date ? value : new Date(value);
}

export function decimalToNumber(
  value: Prisma.Decimal | number | string | null | undefined
): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    return Number(value);
  }

  return value.toNumber();
}
