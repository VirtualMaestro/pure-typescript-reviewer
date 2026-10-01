import type { Comparator, Row } from './types.js';

const byName: Comparator<Row> = (a, b) => a.name.localeCompare(b.name);

/** Renders the rows as 1 line each, sorted by name. */
export function buildReport(rows: Row[]): string {
  rows.sort(byName);
  const lines = rows.map((row) => `${row.name}: ${row.total}`);
  return lines.join('\n');
}
