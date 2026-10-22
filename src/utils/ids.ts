/** Stable, human-readable IDs: PER-0001, REC-0001, PAY-0001, CB-0001. */
export type IdPrefix = 'PER' | 'REC' | 'PAY' | 'CB';

const parseSuffix = (id: string, prefix: IdPrefix): number => {
  const m = new RegExp(`^${prefix}-(\\d+)$`, 'i').exec(id.trim());
  return m ? Number(m[1]) : 0;
};

const format = (prefix: IdPrefix, n: number): string => `${prefix}-${String(n).padStart(4, '0')}`;

export const nextId = (prefix: IdPrefix, existing: Iterable<string>): string => {
  let max = 0;
  for (const id of existing) max = Math.max(max, parseSuffix(id, prefix));
  return format(prefix, max + 1);
};

/** Hands out consecutive unique IDs while remembering what it issued. */
export const idAllocator = (prefix: IdPrefix, existing: Iterable<string>) => {
  const seen = new Set<string>();
  let max = 0;
  for (const id of existing) {
    seen.add(id);
    max = Math.max(max, parseSuffix(id, prefix));
  }
  return {
    has: (id: string) => seen.has(id),
    next: (): string => {
      let candidate: string;
      do {
        max += 1;
        candidate = format(prefix, max);
      } while (seen.has(candidate));
      seen.add(candidate);
      return candidate;
    },
    register: (id: string) => {
      seen.add(id);
      max = Math.max(max, parseSuffix(id, prefix));
    },
  };
};
