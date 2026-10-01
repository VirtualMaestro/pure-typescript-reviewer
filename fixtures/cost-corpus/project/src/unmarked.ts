import type { Batch, Comparator } from './types.js';

const ascending: Comparator<number> = (a, b) => a - b;

/** Sums the median item of every batch. */
export function processBatches(batches: Batch[]): number {
  let total = 0;
  for (const batch of batches) {
    batch.items.sort(ascending);
    total += batch.items[Math.floor(batch.items.length / 2)] ?? 0;
  }
  return total;
}
