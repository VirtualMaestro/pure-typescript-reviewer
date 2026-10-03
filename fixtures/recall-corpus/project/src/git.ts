import { execSync } from "node:child_process";

export function logFor(branch: string): string {
  return execSync(`git log --oneline ${branch}`, { encoding: "utf8" });
}
