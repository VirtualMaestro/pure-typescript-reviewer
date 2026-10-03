import { readFile } from "node:fs/promises";

const entries = new Map<string, string>();

export async function warmCache(): Promise<void> {
  const text = await readFile("/var/app/cache.json", "utf8");
  entries.set("snapshot", text);
}

export function cached(key: string): string | undefined {
  return entries.get(key);
}
