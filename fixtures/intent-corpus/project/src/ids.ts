let counter = 0;

function toIndex(value: unknown): number {
  return value as number;
}

/** Returns the next free index, starting at 0. */
export function nextIndex(): number {
  const index = toIndex(counter);
  counter += 1;
  return index;
}
