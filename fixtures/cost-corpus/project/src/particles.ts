import type { Particle } from './types.js';

/**
 * Sums the kinetic energy of every live particle in the raw buffer over one step.
 * @hotpath
 */
export function step(raw: unknown[], dt: number): number {
  let energy = 0;
  for (const item of raw) {
    const p = item as Particle;
    if (p.life <= 0) continue;
    energy += (p.velocity.x * p.velocity.x + p.velocity.y * p.velocity.y) * dt;
  }
  return energy;
}
