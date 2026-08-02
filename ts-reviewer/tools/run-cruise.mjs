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
const PROJECT_DECLARATIONS = [".dependency-cruiser.cjs", ".dependency-cruiser.js", ".dependency-cruiser.json"];

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i === -1 ? d : process.argv[i + 1]; };
const repo = path.resolve(arg("repo", process.cwd()));
const projectsFile = path.resolve(repo, arg("projects", "code-smells/projects.json"));
const outDir = path.resolve(repo, arg("out", "code-smells"));
const base = arg("base", "");
const declarations = [
  ...PROJECT_DECLARATIONS.map((name) => path.join(repo, name)),
  path.join(outDir, "suggested.dependency-cruiser.cjs"),
];

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

const declaration = declarations.find((candidate) => existsSync(candidate));
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
const localCruise = path.join(projectModules, ".bin", process.platform === "win32" ? "depcruise.cmd" : "depcruise");

// `--ts-config` is absolute on purpose, and a relative path here is not equivalent even though the
// cwd is the repository: TypeScript resolves the config's own `include` globs against the cwd when
// the path is relative, so a nested `templates/x/tsconfig.json` with `include: ["src"]` looks for
// `<repo>/src` and exits TS18003, no inputs found. Every nested project on the first real run failed
// this way, and every project that passed sat at the repository root.
function cruise(label, extraArgs, project) {
  const toolArgs = ["--config", ruleset, "--ts-config", path.resolve(repo, project.config), ...extraArgs, ...project.sourceRoots];
  const args = existsSync(localCruise) ? toolArgs : ["-y", TOOL, ...toolArgs];
  const shell = process.platform === "win32";
  const started = Date.now();
  const r = spawnSync(existsSync(localCruise) ? localCruise : "npx", shell ? args.map((a) => JSON.stringify(a)) : args, {
    cwd: repo, encoding: "utf8", shell, maxBuffer: 256 * 1024 * 1024,
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
  const graph = metrics.output === "valid JSON" ? JSON.parse(metrics.stdout) : null;
  if (graph) writeFileSync(path.join(outDir, "graphs", `${id}.json`), metrics.stdout, "utf8");

  const err = cruise(`depcruise err ${project.config}`, ["--output-type", "err"], project);

  const collapse = `^${project.sourceRoots[0]}/[^/]+/`;
  const diagram = cruise(`depcruise mermaid ${project.config}`, ["--output-type", "mermaid", "--collapse", collapse], project);
  if (diagram.stdout.trim()) writeFileSync(path.join(outDir, "diagrams", `${id}.mmd`), diagram.stdout, "utf8");

  const affected = base
    ? cruise(`depcruise affected ${project.config}`, ["--affected", base, "--output-type", "text"], project)
    : null;

  results.push({ project, graph, runs: [metrics, err, diagram, ...(affected ? [affected] : [])] });
}

// Derived, bounded tables are the semantic pass input. The raw graphs stay on disk.
const table = (headers, rows) => [
  `| ${headers.join(" | ")} |`,
  `|${headers.map(() => "---").join("|")}|`,
  ...rows.map((row) => `| ${row.map((cell) => String(cell).replaceAll("|", "\\|")).join(" | ")} |`),
];
const moduleRows = new Map();
const folderRows = new Map();
const cycles = new Set();
const orphans = new Set();
const crossDirectory = new Set();
const violations = new Set();
const projectRows = [];
// A project counts as covered when it produced a graph, and nothing else: the graph is what the
// semantic pass reads, while a failed mermaid or affected step costs a diagram and not an analysis.
// One predicate, so metrics.md, cruise-summary.md, and the report's coverage cannot disagree.
for (const { project, graph } of results) {
  const modules = graph?.modules ?? [];
  projectRows.push([project.config, graph ? "ok" : "failed", modules.length,
    graph?.summary?.totalDependenciesCruised ?? 0, modules.filter((m) => m.orphan).length]);
  if (!graph) continue;
  const roots = [...project.sourceRoots].sort((a, b) => b.length - a.length);
  const area = (source) => {
    const root = roots.find((candidate) => source === candidate || source.startsWith(`${candidate}/`));
    const rest = root ? source.slice(root.length).replace(/^\//, "") : source;
    return `${root ? `${root}/` : ""}${rest.split("/")[0]}`;
  };
  for (const module of modules) {
    const fanIn = module.dependents?.length ?? 0;
    const previous = moduleRows.get(module.source);
    if (!previous || previous[1] < fanIn) moduleRows.set(module.source, [module.source, fanIn, module.dependencies?.length ?? 0, module.instability ?? ""]);
    if (module.orphan) orphans.add(module.source);
    for (const dependency of module.dependencies ?? []) {
      if (!dependency.resolved) continue;
      if (dependency.circular) cycles.add(`${module.source} → ${dependency.resolved}`);
      if (area(module.source) !== area(dependency.resolved)) crossDirectory.add(`${module.source} → ${dependency.resolved}`);
    }
  }
  for (const folder of graph.folders ?? []) {
    const previous = folderRows.get(folder.name);
    if (!previous || previous[2] < folder.afferentCouplings) {
      folderRows.set(folder.name, [folder.name, folder.moduleCount, folder.afferentCouplings, folder.efferentCouplings, folder.instability]);
    }
  }
  for (const violation of graph.summary?.violations ?? []) {
    violations.add(`${violation.rule?.name ?? "unnamed"} | ${violation.from ?? ""} | ${violation.to ?? ""}`);
  }
}
const topModules = [...moduleRows.values()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 20);
const topFolders = [...folderRows.values()].sort((a, b) => b[2] - a[2] || a[0].localeCompare(b[0])).slice(0, 20);
const metricsLines = [
  "# Architecture metrics", "",
  "## Projects", "", ...table(["Project", "Status", "Modules", "Edges", "Orphans"], projectRows), "",
  "## Top modules by fan-in", "", ...table(["Module", "Fan-in", "Fan-out", "Instability"], topModules), "",
  "## Top folders by fan-in", "", ...table(["Folder", "Modules", "Afferent", "Efferent", "Instability"], topFolders), "",
  "## Cycles", "", ...(cycles.size ? [...cycles].slice(0, 20).map((edge) => `- ${edge}`) : ["- none"]), "",
  "## Orphans", "", ...(orphans.size ? [...orphans].slice(0, 20).map((source) => `- ${source}`) : ["- none"]), "",
  "## Declared rule violations", "", ...(violations.size ? [...violations].slice(0, 50).map((item) => `- ${item}`) : ["- none"]), "",
  "## Cross-directory edges", "", ...(crossDirectory.size ? [...crossDirectory].slice(0, 50).map((edge) => `- ${edge}`) : ["- none"]), "",
];
writeFileSync(path.join(outDir, "metrics.md"), metricsLines.join("\n"), "utf8");

// ── summary ─────────────────────────────────────────────────────────────────
const summaryRows = [];
let successful = 0;
for (const { project, graph, runs } of results) {
  if (graph) successful++;
  const failed = runs.filter((run) => run.reading.startsWith("failed"));
  const diagnostics = [...new Set(failed.flatMap((run) => `${run.stderr}\n${run.stdout}`.split(/\r?\n/))
    .map((line) => line.trim()).filter(Boolean))].slice(0, 3).join(" / ").slice(0, 500);
  summaryRows.push([project.config, project.sourceRoots.join(", "), graph ? "ok" : "failed",
    failed.map((run) => run.label.split(" ")[1]).join(", ") || "none", diagnostics || "none"]);
}
const failures = results.length - successful;
const lines = [`# Cruise summary`, ``, `Ruleset: ${rulesFrom}`, ``,
  `Coverage: ${successful}/${results.length} projects`, ``,
  ...table(["Project", "Source roots", "Status", "Failed steps", "Diagnostics"], summaryRows), ``, failures
    ? `**${failures} project(s) failed.** Record them as skipped and do not read their empty graphs as an absence of coupling.`
    : `All projects produced graphs. Zero findings from these runs are reportable as mechanical zeros.`];

writeFileSync(path.join(outDir, "cruise-summary.md"), lines.join("\n") + "\n", "utf8");
console.log(lines.join("\n"));
process.exitCode = 0; // a failed step is reported in the summary, never by this script's exit code
