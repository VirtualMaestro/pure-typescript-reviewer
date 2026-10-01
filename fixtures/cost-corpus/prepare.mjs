#!/usr/bin/env node
// Prepares 1 run of the cost corpus: a fresh copy of project/ in a temp directory, committed and
// installed, with the ts-reviewer skill of this checkout copied where Claude Code loads it —
// the same files `src/index.ts` scaffoldTsReviewerSkill writes. Prints the directory.
//
//   node fixtures/cost-corpus/prepare.mjs
import { execSync } from "node:child_process";
import { cpSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");
const run = mkdtempSync(path.join(tmpdir(), "cost-corpus-"));
// A command string through the shell: `npm` is `npm.cmd` on Windows, which only a shell resolves.
const sh = (cmd) => execSync(cmd, { cwd: run, stdio: ["ignore", "ignore", "inherit"] });

const generated = new Set(["node_modules", "dist", "code-smells", ".claude"]); // what a local build leaves in project/
cpSync(path.join(here, "project"), run, { recursive: true, filter: (source) => !generated.has(path.basename(source)) });
cpSync(path.join(repoRoot, "ts-reviewer"), path.join(run, ".claude", "skills", "ts-reviewer"), { recursive: true });
sh("git init -q");
sh("git config user.email corpus@example.com");
sh("git config user.name cost-corpus");
sh("git add -A");
sh("git commit -q -m cost-corpus");
sh("npm install --no-audit --no-fund");
console.log(run);
