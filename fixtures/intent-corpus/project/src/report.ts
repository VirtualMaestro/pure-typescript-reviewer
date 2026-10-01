export type Row = { name: string; total: number };

const byName = (a: Row, b: Row): number => a.name.localeCompare(b.name);

/** Renders the rows as 1 line each, sorted by name. */
export function buildReport(rows: Row[]): string {
  rows.sort(byName);
  return rows.map((row) => `${row.name}: ${row.total}`).join('\n');
}
