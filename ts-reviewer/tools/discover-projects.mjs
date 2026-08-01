#!/usr/bin/env node
// Architecture projects for the pre-pass: which tsconfig owns a source set, and where that set lives.
// Usage: node discover-projects.mjs [--repo <dir>]   → JSON on stdout
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}

const repo = path.resolve(arg("repo", process.cwd()));

// ponytail: every tsconfig tracked by git is found by the glob, which is a superset of what a
// transitive `references` walk reaches. Walk the references only if untracked configs ever matter.
const configs = execFileSync("git", ["ls-files", "tsconfig*.json", "*/tsconfig*.json", "**/tsconfig*.json"], {
  cwd: repo, encoding: "utf8",
}).split("\n").filter(Boolean).sort();

// TSC_BIN lets a caller point at an already-installed compiler; otherwise the project's own
// typescript is used, and only a project without one reaches for the network.
const localTsc = process.env.TSC_BIN || path.join(repo, "node_modules", "typescript", "bin", "tsc");
const runTsc = (args) => {
  const r = existsSync(localTsc)
    ? spawnSync(process.execPath, [localTsc, ...args], { cwd: repo, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
    // `-p typescript` names the package; `tsc` names the binary inside it. `npx -y tsc` resolves
    // to an unrelated package of that name.
    : spawnSync("npx", ["-y", "-p", "typescript", "tsc", ...args], { cwd: repo, encoding: "utf8", shell: true, maxBuffer: 64 * 1024 * 1024 });
  // A non-zero status with usable output is a result, not a failure: tsc reports type errors
  // while still listing the files it resolved.
  return { status: r.status, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
};

const isSource = (f) =>
  !f.startsWith("node_modules/") && !f.includes("/node_modules/") &&
  !f.startsWith("../") && !/(^|\/)lib\.[^/]*\.d\.ts$/.test(f) && /\.(ts|mts|cts|tsx)$/.test(f);

const commonDir = (files) => {
  const dirs = files.map((f) => path.posix.dirname(f).split("/"));
  const first = dirs[0] ?? [];
  let i = 0;
  outer: for (; i < first.length; i++) {
    for (const d of dirs) if (d[i] !== first[i]) break outer;
  }
  return first.slice(0, i).join("/") || ".";
};

// A config whose files share no directory above the repository root spans several areas. The
// repository root is useless as a `--collapse` base and as a co-change boundary, so the project
// carries its top-level directories instead of one meaningless root.
const sourceRootsOf = (files) => {
  const common = commonDir(files);
  if (common !== ".") return [common];
  return [...new Set(files.map((f) => f.split("/")[0]))].sort();
};

const workspaces = () => {
  const out = [];
  const pkg = path.join(repo, "package.json");
  if (existsSync(pkg)) {
    const w = JSON.parse(readFileSync(pkg, "utf8")).workspaces;
    if (Array.isArray(w)) out.push(...w);
    else if (w?.packages) out.push(...w.packages);
  }
  const pnpm = path.join(repo, "pnpm-workspace.yaml");
  if (existsSync(pnpm)) {
    for (const line of readFileSync(pnpm, "utf8").split("\n")) {
      const m = line.match(/^\s*-\s*['"]?([^'"#]+?)['"]?\s*$/);
      if (m) out.push(m[1]);
    }
  }
  return out;
};

// ponytail: regex over the raw text, because `--showConfig` resolves `extends` away and a
// tsconfig is JSONC, which JSON.parse will not read.
const rawOf = new Map(configs.map((c) => [c, readFileSync(path.join(repo, c), "utf8")]));
const declaresOwnSources = (config) => /"(include|files|references)"\s*:/.test(rawOf.get(config) ?? "");

// A config is a base only when another config extends it AND it declares no source set of its own.
// Being extended is not disqualifying by itself: a root tsconfig can be both the production
// project and the options other configs inherit, and dropping it skips the product.
const extended = new Set();
for (const config of configs) {
  for (const m of (rawOf.get(config) ?? "").matchAll(/"extends"\s*:\s*"([^"]+)"/g)) {
    if (m[1].startsWith(".")) {
      extended.add(path.posix.normalize(path.posix.join(path.posix.dirname(config), m[1])));
    }
  }
}
const bases = new Set([...extended].filter((c) => !declaresOwnSources(c)));

const projects = [];
const metadata = [];

for (const config of configs) {
  if (bases.has(config) || bases.has(config.replace(/\.json$/, ""))) {
    metadata.push({ config, reason: "extended by another config: it supplies options, not sources" });
    continue;
  }
  const listed = runTsc(["-p", config, "--listFilesOnly"]);
  const files = listed.stdout.split("\n").map((l) => l.trim().replace(/\\/g, "/")).filter(Boolean)
    .map((f) => (path.isAbsolute(f) ? path.posix.relative(repo.replace(/\\/g, "/"), f) : f))
    .filter(isSource)
    .sort();

  if (files.length === 0) {
    metadata.push({
      config,
      // A solution config aggregating `references` resolves nothing and exits clean; anything else
      // is a config tsc could not read, and the reason belongs in the report rather than one word.
      reason: listed.status === 0
        ? "resolves no source files: a solution config aggregating references"
        : `tsc could not read it: ${(listed.stderr || listed.stdout).split("\n").filter(Boolean).slice(0, 2).join(" / ") || "no diagnostic"}`,
      exitCode: listed.status,
    });
    continue;
  }

  const roots = sourceRootsOf(files);
  projects.push({
    config,
    sourceRoots: roots,
    absoluteSourceRoots: roots.map((r) => path.resolve(repo, r)),
    fileCount: files.length,
    files,
  });
}

// A test, browser, or tooling config whose file set is contained in another project's is a variant:
// it contributes unique files only, and gets no aggregate metrics run of its own. Two configs
// resolving the *same* set are duplicates of each other, and the tie is broken deterministically —
// shortest path, then lexicographic — so that two runs of one review agree.
const rank = (c) => [c.split("/").length, c.length, c];
const beats = (a, b) => {
  const [x, y] = [rank(a), rank(b)];
  return x[0] !== y[0] ? x[0] < y[0] : x[1] !== y[1] ? x[1] < y[1] : x[2] < y[2];
};
for (const p of projects) {
  const key = p.files.join("\n");
  p.variantOf = projects
    .filter((o) => {
      if (o === p) return false;
      const same = o.files.join("\n") === key;
      if (same) return beats(o.config, p.config);
      return o.files.length > p.files.length && p.files.every((f) => o.files.includes(f));
    })
    .map((o) => o.config)[0] ?? null;
}

const result = {
  repo,
  workspaces: workspaces(),
  projects: projects.filter((p) => !p.variantOf).map(({ files, ...rest }) => rest),
  variants: projects.filter((p) => p.variantOf).map(({ files, ...rest }) => rest),
  metadata,
};
console.log(JSON.stringify(result, null, 2));
