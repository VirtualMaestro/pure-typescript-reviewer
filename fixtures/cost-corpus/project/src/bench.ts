import { updateFrame, type FrameOptions } from './frame.js';
import { step } from './particles.js';
import { integrate } from './physics.js';
import { buildReport } from './report.js';
import { onMessage } from './socket.js';
import type { Batch, Body, Comparator, Entity, Particle, Row } from './types.js';
import { processBatches } from './unmarked.js';

const ROUNDS = 2_000;
const SIZE = 1_000;
const BATCHES = 20;
const LAYERS = 250;
const DT = 1 / 60;
const STRIDE = 7_919;

const entities: Entity[] = Array.from({ length: SIZE }, (_, i) => ({
  id: i,
  depth: (i * STRIDE) % LAYERS,
  position: { x: i, y: SIZE - i },
}));
const particles: Particle[] = Array.from({ length: SIZE }, (_, i) => ({
  position: { x: i, y: 0 },
  velocity: { x: 1, y: -1 },
  life: i % 2,
}));
const byId: Comparator<Entity> = (a, b) => a.id - b.id;
const frameOptions: FrameOptions[] = [{}, { cmp: byId }];
let frameNo = 0;
const bodies: Body[] = Array.from({ length: SIZE }, () => ({ position: { x: 0, y: 0 }, velocity: { x: 1, y: 0 } }));
const frame = JSON.stringify({ type: 'move', id: 1, position: { x: 3, y: 4 } });
const rows: Row[] = Array.from({ length: SIZE }, (_, i) => ({ name: `row-${(i * STRIDE) % SIZE}`, total: i }));
const batches: Batch[] = Array.from({ length: BATCHES }, (_, b) => ({
  id: b,
  items: Array.from({ length: SIZE / BATCHES }, (_, i) => (i * STRIDE + b) % SIZE),
}));

function time(name: string, run: () => unknown): void {
  const start = Date.now();
  for (let round = 0; round < ROUNDS; round += 1) run();
  console.log(`${name}: ${Date.now() - start} ms`);
}

time('updateFrame', () => {
  frameNo += 1;
  return updateFrame(entities, frameOptions[frameNo % frameOptions.length] ?? {});
});
time('step', () => step(particles, DT));
time('integrate', () => {
  let speed = 0;
  for (const body of bodies) speed += integrate(body, DT);
  return speed;
});
time('onMessage', () => onMessage(frame));
time('buildReport', () => buildReport(rows));
time('processBatches', () => processBatches(batches));
