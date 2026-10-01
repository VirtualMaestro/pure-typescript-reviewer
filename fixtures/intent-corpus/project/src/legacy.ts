/** Returns the last n items, newest first. */
export function lastN(items: number[], n: number): number[] {
  return items.reverse().slice(0, n);
}
