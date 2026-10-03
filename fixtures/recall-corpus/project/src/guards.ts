import type { Order } from "./types.js";

export function isOrder(value: unknown): value is Order {
  return typeof value === "object" && value !== null && "id" in value;
}
