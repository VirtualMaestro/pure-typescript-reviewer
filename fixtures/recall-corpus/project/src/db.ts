export interface OrderRow {
  readonly order_id: string;
  readonly total_cents: number | null;
  readonly created_at: string;
}

const rows: OrderRow[] = [{ order_id: "o-1", total_cents: 1250, created_at: "2026-01-01" }];

export function findRow(orderId: string): OrderRow | undefined {
  return rows.find((row) => row.order_id === orderId);
}
