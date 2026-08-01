#!/usr/bin/env node
// Runs dependency-cruiser over every architecture project discover-projects.mjs found.
//
//   node run-cruise.mjs --projects code-smells/projects.json --out code-smells [--base <ref>]
//
// It exists so that no shell has to hold a ruleset path, a regex, a list of source roots, or a
// loop: every one of those was a quoting bug waiting in a bash block.
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { classifyRun } from "./classify-run.mjs";

const TOOL = "dependency-cruiser@18.1.0";
const EXCLUDE = "^(node_modules|node:)";
const DECLARATIONS = [".dependency-cruiser.cjs", ".dependency-cruiser.js", ".dependency-cruiser.json"];

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i === -1 ? d : process.argv[i + 1]; };
const repo = path.resolve(arg("repo", process.cwd()));
const projectsFile = path.resolve(repo, arg("projects", "code-smells/projects.json"));
const outDir = path.resolve(repo, arg("out", "code-smells"));
const base = arg("base", "");

const { projects } = JSON.parse(readFileSync(projectsFile, "utf8"));
mkdirSync(path.join(outDir, "graphs"), { recursive: true });
mkdirSync(path.join(outDir, "diagrams"), { recursive: true });

// ── the ruleset ─────────────────────────────────────────────────────────────
// A project declaration supplies rules. Its `options` describe the area that project chose to
// cover, and on any other path they cruise nothing — so only `forbidden` is carried over.
const MINIMUM = [
  { name: "no-circular", severity: "warn", from: {}, to: { circular: true } },
  { name: "no-orphans", severity: "warn", from: { orphan: true }, to: {} },
  { name: "not-to-unresolvable", severity: "error", from: {}, to: { couldNotResolve: true } },
];

const declaration = DECLARATIONS.map((d) => path.join(repo, d)).find((p) => existsSync(p));
let forbidden = MINIMUM;
let rulesFrom = "the minimum ruleset";
if (declaration) {
  try {
    const theirs = createRequire(path.join(repo, "noop.cjs"))(declaration);
    if (Array.isArray(theirs.forbidden) && theirs.forbidden.length) {
      forbidden = theirs.forbidden;
      rulesFrom = `${path.basename(declaration)} (${theirs.forbidden.length} rules), options from the pre-pass`;
    }
  } catch (e) {
    rulesFrom = `${path.basename(declaration)} could not be read (${e.message}); fell back to the minimum ruleset`;
  }
}

// `exclude: "^(node_modules|node:)"` does NOT drop Node builtins: dependency-cruiser normalises
// `node:fs/promises` to the source `fs/promises` and flags it `coreModule`, so nothing starting
// with `node:` is ever in the graph to match. Scoping the graph to the project's own source roots
// is exact and drops builtins, node_modules and every external package in one rule.
const includeOnly = `^(${[...new Set(projects.flatMap((p) => p.sourceRoots))].map((r) => r.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})/`;

const ruleset = path.join(tmpdir(), `arch-ruleset-${process.pid}.cjs`);
writeFileSync(ruleset, `module.exports = ${JSON.stringify({
  forbidden,
  options: {
    doNotFollow: { path: "node_modules" },
    exclude: EXCLUDE,
    includeOnly,
    tsPreCompilationDeps: true,
  },
}, null, 2)};\n`, "utf8");

// ── running the tool ────────────────────────────────────────────────────────
// `npx` is a .cmd on Windows and needs a shell, which is why every argument is quoted here rather
// than being handed to the shell bare. The exclude pattern is not passed on the command line at
// all: it lives in the ruleset above, so no regex ever meets a shell.
// dependency-cruiser reads a tsconfig with the TypeScript compiler, and resolves `typescript` from
// its own install location — which, run from the npx cache, is not the project. NODE_PATH is what
// makes the project's copy visible; without it the cruise silently returns zero modules.
const projectModules = path.join(repo, "node_modules");
const nodePath = existsSync(path.join(projectModules, "typescript"))
  ? projectModules
  : process.env.NODE_PATH || projectModules;

function cruise(label, extraArgs, project) {
  const args = ["-y", TOOL, "--config", ruleset, "--ts-config", project.config, ...extraArgs, ...project.sourceRoots];
  const started = Date.now();
  const r = spawnSync("npx", args.map((a) => JSON.stringify(a)), {
    cwd: repo, encoding: "utf8", shell: true, maxBuffer: 256 * 1024 * 1024,
    env: { ...process.env, NODE_PATH: nodePath },
  });
  const run = { label, exitCode: r.status, stdout: r.stdout ?? "", stderr: r.stderr ?? "", ms: Date.now() - started };
  return { ...run, ...classifyRun(run) };
}

// --focus is the post-triage mode: one diagram of one finding's neighbourhood, and nothing else.
// It runs after the semantic pass, because until a finding exists there is no module to focus on.
const focus = arg("focus", "");
if (focus) {
  const name = arg("name", "focus");
  for (const project of projects) {
    const run = cruise(`depcruise focus ${project.config}`,
      ["--output-type", "mermaid", "--focus", focus, "--focus-depth", arg("depth", "1")], project);
    if (run.stdout.trim().split("\n").length > 2) {
      writeFileSync(path.join(outDir, "diagrams", `${name}.mmd`), run.stdout, "utf8");
      console.log(`Wrote ${path.join(outDir, "diagrams", `${name}.mmd`)} from ${project.config}`);
      process.exit(0);
    }
  }
  console.log(`No project matched ${focus}: no diagram written.`);
  process.exit(0);
}

const results = [];
for (const project of projects) {
  const id = project.config.replace(/[/.]/g, "_");

  const metrics = cruise(`depcruise metrics ${project.config}`, ["--metrics", "--output-type", "json"], project);
  if (metrics.output === "valid JSON") writeFileSync(path.join(outDir, "graphs", `${id}.json`), metrics.stdout, "utf8");

  const err = cruise(`depcruise err ${project.config}`, ["--output-type", "err"], project);

  const collapse = `^${project.sourceRoots[0]}/[^/]+/`;
  const diagram = cruise(`depcruise mermaid ${project.config}`, ["--output-type", "mermaid", "--collapse", collapse], project);
  if (diagram.stdout.trim()) writeFileSync(path.join(outDir, "diagrams", `${id}.mmd`), diagram.stdout, "utf8");

  const affected = base
    ? cruise(`depcruise affected ${project.config}`, ["--affected", base, "--output-type", "text"], project)
    : null;

  results.push({ project, runs: [metrics, err, diagram, ...(affected ? [affected] : [])] });
}

// ── summary ─────────────────────────────────────────────────────────────────
const lines = [`# Cruise summary`, ``, `Ruleset: ${rulesFrom}`, ``,
  `| Project | Source roots | Step | Exit | Reading |`, `|---|---|---|---|---|`];
let failures = 0;
for (const { project, runs } of results) {
  for (const run of runs) {
    if (run.reading.startsWith("failed")) failures++;
    lines.push(`| ${project.config} | ${project.sourceRoots.join(", ")} | ${run.label.split(" ")[1]} | ${run.exitCode} | ${run.reading} |`);
  }
}
lines.push(``, failures
  ? `**${failures} step(s) failed.** A cruise of zero modules is a failed pre-pass, not a clean result: record it as skipped and do not read the empty graph as an absence of coupling.`
  : `All steps produced a graph. Zero findings from these runs are reportable as mechanical zeros.`);

writeFileSync(path.join(outDir, "cruise-summary.md"), lines.join("\n") + "\n", "utf8");
console.log(lines.join("\n"));
process.exitCode = 0; // a failed step is reported in the summary, never by this script's exit code
