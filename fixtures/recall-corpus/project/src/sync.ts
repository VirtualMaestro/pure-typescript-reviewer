import { writeFile } from "node:fs/promises";

let snapshot = "";

async function save(text: string): Promise<void> {
  await writeFile("/var/app/draft.txt", text);
}

function reload(): void {
  snapshot = "";
}

export function saveThenReload(text: string): void {
  void save(text).catch(() => undefined);
  setTimeout(() => reload(), 100);
}

export function currentSnapshot(): string {
  return snapshot;
}
