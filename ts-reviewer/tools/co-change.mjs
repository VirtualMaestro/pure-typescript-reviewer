#!/usr/bin/env node
// Co-change hotspots for the architecture pre-pass. No dependency: git plus this file.
// Usage: node co-change.mjs [--repo <dir>] [--src <dir>] [--out <file>] [--scope <list-file>]
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const WINDOW = "12.months";
const MAX_COMMITS = 500;
const MAX_FILES_PER_COMMIT = 25; // above this a commit is mechanical: a lockfile bump, a format sweep, a mass rename
const MIN_CO_CHANGES = 5;
const MIN_RATIO = 0.5;
const TOP_N = 15;
const EXTENSIONS = ["*.ts", "*.mts", "*.cts"];

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}

const repo = path.resolve(arg("repo", process.cwd()));
// One or more source roots, comma-separated — the `sourceRoot` values discover-projects.mjs returns.
// A monorepo needs all of them: measured from the repository root every file in `packages/*` shares
// one top-level directory, and the cross-directory gate would reject every pair.
// Deduplicated: two configs commonly resolve the same root, and a repeated root would count a file
// once per copy.
const projectsFile = arg("projects", "");
const rootsArg = projectsFile
  ? JSON.parse(readFileSync(path.resolve(repo, projectsFile), "utf8")).projects.flatMap((p) => p.sourceRoots).join(",")
  : arg("src", "");
const roots = [...new Set(rootsArg.split(",").map((r) => r.trim().replace(/\/*$/, "")).filter(Boolean))];
const out = arg("out", "");
const scopeFile = arg("scope", "");

const git = (args) => execFileSync("git", args, { cwd: repo, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });

// Files that exist right now. A pair naming a deleted file is history, not structure.
const existing = new Set(git(["ls-files", "--", ...EXTENSIONS]).split("\n").filter(Boolean));

// Optional: the analysis scope of a scoped run, one path per line. Used at output time only —
// intersecting during counting would erase every pair in a mode whose scope is three files.
const scope = scopeFile
  ? new Set(readFileSync(scopeFile, "utf8").split("\n").map((l) => l.trim()).filter(Boolean))
  : null;

const rootOf = (f) => (roots.length ? roots.find((r) => f.startsWith(r + "/")) ?? null : "");
const inSrc = (f) => rootOf(f) !== null;
const topDir = (f) => {
  const root = rootOf(f);
  const rest = root ? f.slice(root.length + 1) : f;
  const parts = rest.split("/");
  // The root itself is part of the identity: `packages/a/src/x` and `packages/b/src/x` are not
  // the same directory just because both are called `src`.
  return parts.length > 1 ? `${root}/${parts[0]}` : `${root}/.`;
};

const log = git([
  "log", "--no-merges", `--since=${WINDOW}`, `-n${MAX_COMMITS}`,
  "--format=%H", "--name-only", "--", ...EXTENSIONS,
]);

const commits = [];
let current = null;
for (const line of log.split("\n")) {
  if (!line.trim()) continue;
  if (/^[0-9a-f]{40}$/.test(line)) { current = []; commits.push(current); continue; }
  if (current) current.push(line);
}

const changes = new Map();
const pairs = new Map();
let mechanical = 0;

for (const commit of commits) {
  const touched = [...new Set(commit)];
  // The size gate reads the commit as it was, before the existence and src filters —
  // otherwise a mass rename shrinks into eligibility once its deleted paths drop out.
  if (touched.length > MAX_FILES_PER_COMMIT) { mechanical++; continue; }
  const files = touched.filter((f) => existing.has(f) && inSrc(f)).sort();
  if (files.length < 2) continue;
  for (const f of files) changes.set(f, (changes.get(f) ?? 0) + 1);
  for (let i = 0; i < files.length; i++) {
    for (let j = i + 1; j < files.length; j++) {
      const key = `${files[i]}\t${files[j]}`;
      pairs.set(key, (pairs.get(key) ?? 0) + 1);
    }
  }
}

const ranked = [...pairs]
  .map(([key, co]) => {
    const [a, b] = key.split("\t");
    return { a, b, co, ratio: co / Math.min(changes.get(a), changes.get(b)) };
  })
  .filter((p) => p.co >= MIN_CO_CHANGES && p.ratio >= MIN_RATIO && topDir(p.a) !== topDir(p.b))
  .filter((p) => !scope || scope.has(p.a) || scope.has(p.b))
  .sort((x, y) => y.co - x.co || y.ratio - x.ratio || x.a.localeCompare(y.a))
  .slice(0, TOP_N);

const report = [
  `# Co-change pairs`,
  ``,
  `Window: last ${WINDOW.replace(".", " ")}, at most ${MAX_COMMITS} commits, merges excluded.`,
  `Commits read: ${commits.length}. Dropped as mechanical (> ${MAX_FILES_PER_COMMIT} files): ${mechanical}.`,
  `Gates: co-changes >= ${MIN_CO_CHANGES}, ratio >= ${MIN_RATIO}, different top-level directory.`,
  ``,
  ranked.length ? `| Co-changes | Ratio | File A | File B |` : `No pair passed the gates.`,
  ranked.length ? `|---|---|---|---|` : ``,
  ...ranked.map((p) => `| ${p.co} | ${p.ratio.toFixed(2)} | \`${p.a}\` | \`${p.b}\` |`),
].filter((l) => l !== "").join("\n");

if (out) {
  mkdirSync(path.dirname(path.resolve(repo, out)), { recursive: true });
  writeFileSync(path.resolve(repo, out), report + "\n", "utf8");
}
console.log(report);
