import type { OrderRow } from "./db.js";

const TAX_RATE = 0.2;

export function totalWithTax(row: OrderRow): number {
  return (row.total_cents ?? 0) * (1 + TAX_RATE);
}

export function isLargeOrder(row: OrderRow): boolean {
  return (row.total_cents ?? 0) > 50_000;
}
