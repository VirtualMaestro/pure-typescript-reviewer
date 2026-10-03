import type { Item } from "./types.js";

export function byName(rows: Item[]): Item[] {
  // Sorted in place on purpose: the caller hands the array over and reads it sorted.
  rows.sort((a, b) => a.name.localeCompare(b.name));
  return rows;
}
