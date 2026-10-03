export interface OrderLine {
  readonly sku: string;
  readonly quantity: number;
}

export interface Order {
  readonly id: string;
  readonly lines: readonly OrderLine[];
  readonly total: number;
}

export type Status = "new" | "paid" | "shipped" | "cancelled";

export interface Settings {
  readonly region: string;
  readonly retries: number;
}

export interface Item {
  readonly name: string;
  readonly addedAt: number;
}
