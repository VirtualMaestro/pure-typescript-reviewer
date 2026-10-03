export interface Entry {
  readonly id: string;
  readonly cents: number;
}

const posted = new Set<string>();
let closed = false;

export function closeBooks(): void {
  closed = true;
}

export function append(entry: Entry): void {
  if (closed) {
    throw new Error("books are closed");
  }
  if (posted.has(entry.id)) {
    throw new Error(`duplicate entry ${entry.id}`);
  }
  posted.add(entry.id);
}
