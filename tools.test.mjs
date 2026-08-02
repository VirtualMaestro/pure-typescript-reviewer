// Self-check for the architecture pre-pass scripts. Builds both fixtures itself, asserts the gates.
import test from "node:test";
import assert from "node:assert/strict";
import { classifyRun } from "./ts-reviewer/tools/classify-run.mjs";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const repoRoot = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const tools = path.join(repoRoot, "ts-reviewer", "tools");
const CO_CHANGE = path.join(tools, "co-change.mjs");
const DISCOVER = path.join(tools, "discover-projects.mjs");
const RUN_CRUISE = path.join(tools, "run-cruise.mjs");

// The fixtures have no node_modules of their own; lend them this repository's compiler, both as the
// tsc binary discovery runs and as the NODE_PATH dependency-cruiser resolves `typescript` from.
const NODE_PATH = path.join(repoRoot, "node_modules");
const TSC_BIN = process.env.TSC_BIN || path.join(NODE_PATH, "typescript", "bin", "tsc");

// One test drives dependency-cruiser through `npx`, which needs the network on a cold cache.
// `npm test` stays offline; set ARCH_TOOLS_NETWORK=1 to run it.
const NETWORK = process.env.ARCH_TOOLS_NETWORK
  ? {}
  : { skip: "needs the network for `npx dependency-cruiser`; set ARCH_TOOLS_NETWORK=1" };

const run = (script, args, cwd) =>
  execFileSync(process.execPath, [script, ...args], {
    cwd, encoding: "utf8", maxBuffer: 32 * 1024 * 1024,
    env: { ...process.env, TSC_BIN, NODE_PATH },
  });

function newRepo() {
  const dir = mkdtempSync(path.join(tmpdir(), "arch-fixture-"));
  const git = (...args) => execFileSync("git", args, { cwd: dir, encoding: "utf8" });
  git("init", "-q");
  git("config", "user.email", "fixture@example.com");
  git("config", "user.name", "Fixture");
  git("config", "commit.gpgsign", "false");
  return { dir, git };
}

function write(dir, rel, content = "export const x = 1;\n") {
  const abs = path.join(dir, rel);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, content, "utf8");
}

test("a run is read by its output, not by its exit code", () => {
  // The failure that looks like a success: a green tick over a graph nothing walked.
  assert.equal(classifyRun({
    label: "depcruise: err",
    exitCode: 0,
    stdout: "\n✔ no dependency violations found (0 modules, 0 dependencies cruised)\n",
  }).reading, "failed: 0 modules cruised");

  assert.equal(classifyRun({
    label: "depcruise: metrics json",
    exitCode: 0,
    stdout: JSON.stringify({ modules: [], summary: { totalCruised: 0 } }),
  }).reading, "failed: 0 modules cruised", "the JSON form of the same emptiness reads the same");

  // Knip's normal result: non-zero exit, findings in valid JSON.
  assert.equal(classifyRun({
    label: "knip", exitCode: 1, stdout: JSON.stringify({ issues: [{ file: "a.ts" }] }),
  }).reading, "findings, not a failure");

  // dependency-cruiser reporting warn-severity violations still exits 0.
  assert.equal(classifyRun({
    label: "depcruise: err", exitCode: 0,
    stdout: "  warn no-orphans: src/x.ts\n\nx 1 dependency violations (0 errors, 1 warnings). 291 modules, 960 dependencies cruised.\n",
  }).reading, "ok");

  // No config flag and no default config: nothing on stdout at all.
  assert.equal(classifyRun({ label: "depcruise: metrics json", exitCode: 1, stdout: "" }).reading, "failed");
});

test("run-cruise passes several source roots as separate arguments and keeps the graph local", NETWORK, () => {
  const { dir, git } = newRepo();

  write(dir, "tsconfig.json", JSON.stringify({
    compilerOptions: { target: "ES2024", module: "nodenext", moduleResolution: "nodenext" },
    include: ["src", "scripts"],
  }, null, 2));
  // Both roots must be cruised: the earlier bash form joined them with a space inside one quoted
  // argument, so the tool saw a single path called "scripts src" and found nothing.
  write(dir, "src/index.ts", 'import path from "node:path";\nexport const a = path.sep;\n');
  write(dir, "scripts/build.ts", 'import fs from "node:fs/promises";\nexport const b = fs.readFile;\n');
  git("add", "-A");
  git("commit", "-q", "-m", "fixture");

  run(DISCOVER, [], dir);
  const projects = run(DISCOVER, [], dir);
  writeFileSync(path.join(dir, "projects.json"), projects, "utf8");
  write(dir, "out/suggested.dependency-cruiser.cjs", "module.exports = { forbidden: [{ name: 'no-circular', severity: 'warn', from: {}, to: { circular: true } }] };\n");
  run(RUN_CRUISE, ["--projects", "projects.json", "--out", "out"], dir);

  const graph = JSON.parse(readFileSync(path.join(dir, "out", "graphs", "tsconfig_json.json"), "utf8"));
  const sources = graph.modules.map((m) => m.source).sort();
  assert.deepEqual(sources, ["scripts/build.ts", "src/index.ts"], "both roots were cruised");
  assert.equal(graph.modules.filter((m) => m.coreModule).length, 0,
    "core modules stay out: `node:` never appears in a source, so only includeOnly removes them");

  const diagram = readFileSync(path.join(dir, "out", "diagrams", "tsconfig_json.mmd"), "utf8");
  assert.match(diagram, /flowchart/, "the collapse regex survived the shell");

  const summary = readFileSync(path.join(dir, "out", "cruise-summary.md"), "utf8");
  assert.doesNotMatch(summary, /failed/, "a real graph is not reported as a failed pre-pass");
  assert.match(summary, /suggested\.dependency-cruiser\.cjs/, "prose-derived rules feed the cruise without changing the project config");

  const metrics = readFileSync(path.join(dir, "out", "metrics.md"), "utf8");
  assert.match(metrics, /Top modules by fan-in/, "the semantic pass gets derived tables instead of a raw graph");
  assert.match(metrics, /scripts\/build\.ts|src\/index\.ts/, "the derived table names cruised modules");

  rmSync(dir, { recursive: true, force: true });
});

test("co-change honours every gate", () => {
  const { dir, git } = newRepo();
  const commit = (files, msg) => {
    for (const f of files) write(dir, f, `export const x = ${Math.random()};\n`);
    git("add", "-A");
    git("commit", "-q", "-m", msg);
  };

  // passes: 6 co-changes, different top-level directories under src
  for (let i = 0; i < 6; i++) commit(["src/a/one.ts", "src/b/two.ts"], `pair ${i}`);
  // rejected: same top-level directory
  for (let i = 0; i < 6; i++) commit(["src/a/three.ts", "src/a/four.ts"], `same dir ${i}`);
  // rejected: only 3 co-changes, below the floor of 5
  for (let i = 0; i < 3; i++) commit(["src/a/five.ts", "src/b/six.ts"], `too few ${i}`);
  // rejected: the second file no longer exists
  for (let i = 0; i < 6; i++) commit(["src/a/one.ts", "src/b/gone.ts"], `with doomed ${i}`);
  rmSync(path.join(dir, "src/b/gone.ts"));
  git("add", "-A");
  git("commit", "-q", "-m", "delete gone.ts");
  // rejected: a mechanical commit of 30 files
  commit(Array.from({ length: 30 }, (_, i) => `src/c/mass${i}.ts`), "format sweep");

  const out = run(CO_CHANGE, ["--src", "src"], dir);

  assert.match(out, /src\/a\/one\.ts/, "the qualifying pair is reported");
  assert.match(out, /src\/b\/two\.ts/, "the qualifying pair is reported");
  assert.doesNotMatch(out, /three\.ts|four\.ts/, "a pair inside one directory is not a candidate");
  assert.doesNotMatch(out, /five\.ts|six\.ts/, "a pair below the co-change floor is dropped");
  assert.doesNotMatch(out, /gone\.ts/, "a deleted file is history, not structure");
  assert.doesNotMatch(out, /mass\d/, "a mechanical commit contributes no pairs");
  assert.match(out, /Dropped as mechanical \(> 25 files\): 1/, "the mechanical commit is counted and reported");

  rmSync(dir, { recursive: true, force: true });
});

test("co-change writes the artefact and honours the report-time scope filter", () => {
  const { dir, git } = newRepo();
  for (let i = 0; i < 6; i++) {
    write(dir, "src/a/one.ts", `export const x = ${i};\n`);
    write(dir, "src/b/two.ts", `export const y = ${i};\n`);
    git("add", "-A");
    git("commit", "-q", "-m", `pair ${i}`);
  }

  run(CO_CHANGE, ["--src", "src", "--out", "code-smells/co-change.md"], dir);
  const artefact = execFileSync(process.execPath, ["-p", "require('fs').readFileSync('code-smells/co-change.md','utf8')"], {
    cwd: dir, encoding: "utf8",
  });
  assert.match(artefact, /src\/a\/one\.ts/, "the artefact carries the pair");

  write(dir, "scope.txt", "src/z/unrelated.ts\n");
  const scoped = run(CO_CHANGE, ["--src", "src", "--scope", "scope.txt"], dir);
  assert.match(scoped, /No pair passed the gates/, "a pair touching nothing in scope is not reported");

  rmSync(dir, { recursive: true, force: true });
});

test("co-change measures top-level directories per source root, not per repository", () => {
  const { dir, git } = newRepo();
  const commit = (files, msg) => {
    for (const f of files) write(dir, f, `export const x = ${Math.random()};\n`);
    git("add", "-A");
    git("commit", "-q", "-m", msg);
  };

  // crosses two packages: measured from the repository root both live under `packages`
  for (let i = 0; i < 6; i++) commit(["packages/a/src/core/one.ts", "packages/b/src/core/two.ts"], `cross ${i}`);
  // inside one package and one directory: still not a candidate
  for (let i = 0; i < 6; i++) commit(["packages/a/src/core/three.ts", "packages/a/src/core/four.ts"], `inside ${i}`);

  const out = run(CO_CHANGE, ["--src", "packages/a/src,packages/b/src"], dir);
  assert.match(out, /packages\/a\/src\/core\/one\.ts/, "a pair crossing two packages survives");
  assert.doesNotMatch(out, /three\.ts|four\.ts/, "a pair inside one directory is still rejected");

  rmSync(dir, { recursive: true, force: true });
});

test("discovery separates projects from solution and base configs", () => {
  const { dir, git } = newRepo();

  write(dir, "tsconfig.base.json", JSON.stringify({ compilerOptions: { strict: true, target: "ES2024", module: "nodenext", moduleResolution: "nodenext" } }, null, 2));
  write(dir, "tsconfig.json", JSON.stringify({ files: [], references: [{ path: "packages/a" }, { path: "packages/b" }] }, null, 2));
  write(dir, "packages/a/tsconfig.json", JSON.stringify({ extends: "../../tsconfig.base.json", compilerOptions: { rootDir: "src" }, include: ["src"] }, null, 2));
  // no rootDir and no include: tsc computes the common directory itself
  write(dir, "packages/b/tsconfig.json", JSON.stringify({ extends: "../../tsconfig.base.json" }, null, 2));
  write(dir, "packages/a/src/index.ts");
  write(dir, "packages/a/src/deep/helper.ts");
  write(dir, "packages/b/lib/main.ts");
  write(dir, "packages/b/lib/util.ts");
  git("add", "-A");
  git("commit", "-q", "-m", "fixture");

  const result = JSON.parse(run(DISCOVER, [], dir));
  const roots = Object.fromEntries(result.projects.map((p) => [p.config, p.sourceRoots]));

  assert.deepEqual(Object.keys(roots).sort(), ["packages/a/tsconfig.json", "packages/b/tsconfig.json"]);
  assert.deepEqual(roots["packages/a/tsconfig.json"], ["packages/a/src"]);
  assert.deepEqual(roots["packages/b/tsconfig.json"], ["packages/b/lib"], "the root is computed, not read from rootDir");
  for (const p of result.projects) for (const r of p.absoluteSourceRoots) assert.ok(path.isAbsolute(r), "roots are absolute");

  const meta = result.metadata.map((m) => m.config).sort();
  assert.deepEqual(meta, ["tsconfig.base.json", "tsconfig.json"], "the base and the solution config get no analysis run");

  rmSync(dir, { recursive: true, force: true });
});

test("a config that is extended but declares its own sources is still a project", () => {
  const { dir, git } = newRepo();

  // The shape that made the real run skip the product: a root config other configs extend,
  // which nonetheless owns `src/`.
  write(dir, "tsconfig.json", JSON.stringify({
    compilerOptions: { target: "ES2024", module: "nodenext", moduleResolution: "nodenext", rootDir: "src" },
    include: ["src/**/*"],
  }, null, 2));
  write(dir, "templates/variant/tsconfig.json", JSON.stringify({
    extends: "../../tsconfig.json",
    compilerOptions: { rootDir: "src" },
    include: ["src"],
  }, null, 2));
  write(dir, "src/index.ts");
  write(dir, "src/domain/rule.ts");
  write(dir, "templates/variant/src/main.ts");
  git("add", "-A");
  git("commit", "-q", "-m", "fixture");

  const result = JSON.parse(run(DISCOVER, [], dir));
  const configs = result.projects.map((p) => p.config).sort();
  assert.ok(configs.includes("tsconfig.json"), "the extended root config owns src and stays a project");
  assert.deepEqual(result.projects.find((p) => p.config === "tsconfig.json").sourceRoots, ["src"]);

  rmSync(dir, { recursive: true, force: true });
});

test("configs resolving the same file set collapse to one, and a repository-wide set yields top-level roots", () => {
  const { dir, git } = newRepo();

  const shared = { compilerOptions: { target: "ES2024", module: "nodenext", moduleResolution: "nodenext" }, include: ["src", "scripts"] };
  write(dir, "tsconfig.json", JSON.stringify(shared, null, 2));
  write(dir, "tsconfig.scripts.json", JSON.stringify(shared, null, 2));
  write(dir, "src/index.ts");
  write(dir, "scripts/build.ts");
  git("add", "-A");
  git("commit", "-q", "-m", "fixture");

  const result = JSON.parse(run(DISCOVER, [], dir));
  assert.equal(result.projects.length, 1, "two configs over one file set are one project");
  assert.equal(result.variants.length, 1, "the loser is recorded as a variant, not dropped silently");
  assert.equal(result.projects[0].config, "tsconfig.json", "the tie breaks deterministically");
  assert.deepEqual(result.projects[0].sourceRoots, ["scripts", "src"],
    "a set spanning the repository root yields its top-level directories, not '.'");

  rmSync(dir, { recursive: true, force: true });
});
