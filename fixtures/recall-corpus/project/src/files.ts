import { readFileSync } from "node:fs";
import path from "node:path";

const UPLOAD_DIR = "/var/app/uploads";

export function readUpload(query: string): string {
  const name = new URLSearchParams(query).get("name") ?? "";
  return readFileSync(path.join(UPLOAD_DIR, name), "utf8");
}
