import type { Item } from "./types.js";

const items: Item[] = [
  { name: "lamp", addedAt: 1 },
  { name: "desk", addedAt: 2 },
  { name: "chair", addedAt: 3 },
];

export function allItems(): Item[] {
  return items;
}
