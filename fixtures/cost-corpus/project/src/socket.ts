import type { SocketMessage } from './types.js';

/**
 * Handles one raw socket frame and returns the distance the message moves its target.
 * @hotpath
 */
export function onMessage(data: string): number {
  const message = JSON.parse(data) as SocketMessage;
  if (message.type === 'stop') return 0;
  return Math.hypot(message.position.x, message.position.y);
}
