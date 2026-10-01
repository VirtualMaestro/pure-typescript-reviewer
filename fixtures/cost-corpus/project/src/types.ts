export type Vec2 = { x: number; y: number };

export type Entity = { id: number; depth: number; position: Vec2 };

export type Particle = { position: Vec2; velocity: Vec2; life: number };

export type Body = { position: Vec2; velocity: Vec2 };

export type SocketMessage = { type: 'move' | 'stop'; id: number; position: Vec2 };

export type Row = { name: string; total: number };

export type Batch = { id: number; items: number[] };

export type Comparator<T> = (a: T, b: T) => number;
