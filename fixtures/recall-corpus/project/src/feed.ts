import { allItems } from "./catalog.js";
import type { Item } from "./types.js";

export function newestFirst(): Item[] {
  return allItems().reverse();
}
