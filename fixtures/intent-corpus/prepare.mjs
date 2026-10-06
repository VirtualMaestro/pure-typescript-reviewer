#!/usr/bin/env node
// Prepares 1 run of the intent corpus: a fresh copy of project/ in a temp directory, its history
// replayed commit by commit from history.mjs, installed, with the ts-reviewer skill of this
// checkout copied where Claude Code loads it. Prints the directory.
//
//   node fixtures/intent-corpus/prepare.mjs
import { execFileSync, execSync } from "node:child_process";
import { cpSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { history } from "./history.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");
const run = mkdtempSync(path.join(tmpdir(), "intent-corpus-"));
const git = (...args) => execFileSync("git", args, { cwd: run, stdio: ["ignore", "ignore", "inherit"] });

const generated = new Set(["node_modules", "dist", "code-smells", ".claude"]); // what a local build leaves in project/
cpSync(path.join(here, "project"), run, { recursive: true, filter: (source) => !generated.has(path.basename(source)) });
cpSync(path.join(repoRoot, "assets", "skills", "ts-reviewer"), path.join(run, ".claude", "skills", "ts-reviewer"), { recursive: true });
git("init", "-q");
git("config", "user.email", "corpus@example.com");
git("config", "user.name", "intent-corpus");
for (const { message, files } of history) {
  git("add", "--", ...files);
  git("commit", "-q", "-m", message);
}
const left = execFileSync("git", ["status", "--porcelain"], { cwd: run, encoding: "utf8" });
if (left.trim()) throw new Error(`history.mjs leaves files out of every commit:\n${left}`);
// A command string through the shell: `npm` is `npm.cmd` on Windows, which only a shell resolves.
execSync("npm install --no-audit --no-fund", { cwd: run, stdio: ["ignore", "ignore", "inherit"] });
console.log(run);
