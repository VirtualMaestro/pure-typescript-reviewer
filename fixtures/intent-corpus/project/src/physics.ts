export type Vec2 = { x: number; y: number };
export type Body = { position: Vec2; velocity: Vec2 };

const GRAVITY = -9.81;

/**
 * Returns the speed of the body dt seconds later.
 * @hotpath
 */
export function integrate(body: Body, dt: number): number {
  body.velocity.y += GRAVITY * dt;
  body.position.x += body.velocity.x * dt;
  body.position.y += body.velocity.y * dt;
  return Math.hypot(body.velocity.x, body.velocity.y);
}
