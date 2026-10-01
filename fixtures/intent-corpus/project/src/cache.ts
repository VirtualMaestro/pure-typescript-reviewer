export type Entry = { key: string; age: number };

const byAge = (a: Entry, b: Entry): number => a.age - b.age;

/** Returns the keys of the oldest entries beyond max, oldest first. */
export function evictOldest(entries: Entry[], max: number): string[] {
  // Sorted in place on purpose: callers keep the order for the next eviction.
  entries.sort(byAge);
  return entries.slice(0, Math.max(0, entries.length - max)).map((entry) => entry.key);
}
