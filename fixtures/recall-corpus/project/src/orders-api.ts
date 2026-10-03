import type { Order } from "./types.js";

export function parseOrder(body: string): Order {
  return JSON.parse(body) as Order;
}
