import type { Comparator, Entity } from './types.js';

export type FrameOptions = { cmp?: Comparator<Entity> };

const byDepth: Comparator<Entity> = (a, b) => a.depth - b.depth;

/**
 * Walks every entity back to front and returns how many share a depth with the one drawn before it.
 * @hotpath
 */
export function updateFrame(entities: Entity[], opts: FrameOptions): number {
  const cmp = opts.cmp || byDepth;
  entities.sort(cmp);
  let fights = 0;
  let previous = Number.NEGATIVE_INFINITY;
  for (const entity of entities) {
    if (entity.depth === previous) fights += 1;
    previous = entity.depth;
  }
  return fights;
}
