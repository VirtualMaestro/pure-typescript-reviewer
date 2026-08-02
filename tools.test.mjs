// Self-check for the architecture pre-pass scripts. Builds both fixtures itself, asserts the gates.
import test from "node:test";
import assert from "node:assert/strict";
import { classifyRun } from "./ts-reviewer/tools/classify-run.mjs";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const repoRoot = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const tools = path.join(repoRoot, "ts-reviewer", "tools");
const CO_CHANGE = path.join(tools, "co-change.mjs");
const DISCOVER = path.join(tools, "discover-projects.mjs");
const RUN_CRUISE = path.join(tools, "run-cruise.mjs");
const VALIDATE_REPORT = path.join(tools, "validate-report.mjs");

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

// The shape a real run produced, not the minimum the checker tolerates: the optional sections, both
// table kinds, and a snippet whose first line sits above the line the finding names.
function writeReportFixture(dir) {
  write(dir, "src/a.ts", [
    "export function compute(input: unknown): number {",
    "  const raw = input as { value: number };",
    "  const scale = 2;",
    "  return raw.value * scale;",
    "}",
    "",
  ].join("\n"));
  write(dir, "code-smells/projects.json", JSON.stringify({ projects: [{ config: "tsconfig.json", sourceRoots: ["src"] }] }));
  write(dir, "code-smells/co-change.md", "# Co-change\n\n- none\n");
  write(dir, "code-smells/cruise-summary.md", "# Cruise summary\n\nCoverage: 1/1 projects\n");
  write(dir, "code-smells/metrics.md", "# Architecture metrics\n");
  write(dir, "code-smells/graphs/tsconfig_json.json", JSON.stringify({ modules: [{ source: "src/a.ts" }] }));
  write(dir, "code-smells/diagrams/tsconfig_json.mmd", "flowchart LR\n  a[src/a.ts]\n");
  write(dir, "code-smells/report.md", `# TypeScript Code Review Report

**Project:** fixture
**Reviewed:** 2026-08-02
**Stack:** TypeScript 5.9.x / ES2024 / Node 24 — matches
**Scope:** Full
**Files analyzed:** 1 (+ 0 context)
**Architecture coverage:** 1/1
**Total issues:** 6 (0 highest, 1 high, 4 medium, 1 low)

## Summary

The fixture carries one of every element the format declares.

## Discovery

Project: fixture
Scope: full

## Highest + High Issues

### Unsafe cast reaches the return — High

**Category:** Type Safety & Security | **File:** \`src/a.ts\` | **Line:** 4 | **Auto-fixable:** Yes | **New code:** No

\`\`\`typescript
export function compute(input: unknown): number {
  const raw = input as { value: number };
  const scale = 2;
  return raw.value * scale;
\`\`\`

**Problem:** the cast is never validated before the value is read
**Fix:** parse the input and return the parsed value

---

## Medium Issues

### The scale is a bare literal — Medium

**Category:** Code Quality | **File:** \`src/a.ts\` | **Line:** 3 | **Auto-fixable:** Yes | **New code:** No

\`\`\`typescript
  const scale = 2;
\`\`\`

**Problem:** the constant carries no name for its unit
**Fix:** name it at the module boundary

| Issue | Category | Location | Fix |
|---|---|---|---|
| The return type is inferred | Type Safety | \`src/a.ts:1\` | annotate the exported boundary |
| The parameter is unvalidated | Boundary Validation | \`src/a.ts:1\` | parse it at the seam |

## Low Issues

| Issue | Category | Location | Fix |
|---|---|---|---|
| The function is not marked pure | Code Quality | \`src/a.ts:1\` | note the intent where it is called |

## Recurring Patterns

| Pattern | Occurrences | Severity treatment |
|---|---|---|
| unvalidated casts | 3 | consolidated into the High finding above |
| bare numeric literals | 5 | left at Medium and reported once |

## Config Issues

No config finding: the fixture carries no tsconfig deviation.

## Architecture Opportunities

### Declare the boundary — Medium

- **Confidence:** strong
- **Files:** src/a.ts
- **Problem:** the boundary is implicit
- **Evidence:** [overview](diagrams/tsconfig_json.mmd)
- **Change type:** enforce
- **Proposed change:** declare the existing boundary
- **Rule:** src may import only src
- **Test strategy:** keep the current tests and add one rule check
- **Benefits:** the dependency direction becomes executable
- **Trade-offs:** the declaration needs maintenance
- **Fixability:** report-only
- **Top recommendation:** it prevents the confirmed drift first

## Verification

| Check | Result |
|---|---|
| \`npx tsc --noEmit\` | passed |

## Generated artifacts

- \`metrics.md\` — structural metrics
`);
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

test("run-cruise resolves nested tsconfig paths and retains one bounded failure diagnostic", NETWORK, () => {
  const { dir } = newRepo();
  write(dir, "tsconfig.base.json", JSON.stringify({
    compilerOptions: { target: "ES2024", module: "nodenext", moduleResolution: "nodenext" },
  }, null, 2));
  write(dir, "packages/app/tsconfig.json", JSON.stringify({ extends: "../../tsconfig.base.json", include: ["src"] }, null, 2));
  write(dir, "packages/app/src/index.ts", "export const nested = true;\n");
  write(dir, "packages/bad/src/index.ts", "export const broken = true;\n");
  write(dir, "projects.json", JSON.stringify({ projects: [
    { config: "packages/app/tsconfig.json", sourceRoots: ["packages/app/src"] },
    { config: "packages/bad/missing-tsconfig.json", sourceRoots: ["packages/bad/src"] },
  ] }));

  run(RUN_CRUISE, ["--projects", "projects.json", "--out", "out"], dir);

  const graph = JSON.parse(readFileSync(path.join(dir, "out", "graphs", "packages_app_tsconfig_json.json"), "utf8"));
  assert.deepEqual(graph.modules.map((module) => module.source), ["packages/app/src/index.ts"]);
  const summary = readFileSync(path.join(dir, "out", "cruise-summary.md"), "utf8");
  assert.match(summary, /Coverage: 1\/2 projects/);
  assert.match(summary, /ENOENT.*missing-tsconfig\.json/);
  assert.doesNotMatch(summary, /TS18003|TS5083/);
  assert.equal(summary.split("\n").filter((line) => line.startsWith("| packages/bad/missing-tsconfig.json |")).length, 1);
  const metrics = readFileSync(path.join(dir, "out", "metrics.md"), "utf8");
  assert.match(metrics, /\| packages\/app\/tsconfig.json \| ok \|/);
  assert.match(metrics, /\| packages\/bad\/missing-tsconfig.json \| failed \|/);
  // One predicate behind all three: a project is covered when it produced a graph, so metrics.md,
  // cruise-summary.md, and the coverage the report copies out cannot contradict each other.
  const graphs = readdirSync(path.join(dir, "out", "graphs")).filter((file) => file.endsWith(".json"));
  assert.equal(graphs.length, 1);
  assert.equal((summary.match(/\| ok \|/g) ?? []).length, graphs.length);

  rmSync(dir, { recursive: true, force: true });
});

const validate = (dir) =>
  spawnSync(process.execPath, [VALIDATE_REPORT, "--repo", dir, "--report", "code-smells/report.md"], { encoding: "utf8" });
const editReport = (dir, edit) => {
  const report = path.join(dir, "code-smells", "report.md");
  writeFileSync(report, edit(readFileSync(report, "utf8")), "utf8");
};

test("validate-report accepts the canonical report contract", () => {
  const { dir } = newRepo();
  writeReportFixture(dir);
  const result = validate(dir);
  assert.equal(result.status, 0, result.stderr);
  // 1 High heading + 1 Medium heading + 3 summary-table rows + 1 architecture entry.
  // The 2 Recurring Patterns rows are patterns, not issues, and the Verification table is not counted.
  assert.match(result.stdout, /Validated code-smells[\\/]report.md: 6 issue\(s\), 0 warning\(s\)/);
  rmSync(dir, { recursive: true, force: true });
});

test("validate-report rejects report drift before fix mode can parse it", () => {
  const { dir } = newRepo();
  writeReportFixture(dir);
  editReport(dir, (report) => report
    .replace("**Total issues:** 6", "**Total issues:** 7")
    .replace("## Medium Issues", "## Medium findings")
    .replace("**Category:** Type Safety & Security", "**Category:** Async & Security")
    .replace("`src/a.ts` | **Line:** 4", "`src/missing.ts` | **Line:** 4")
    .replace("| Pattern | Occurrences | Severity treatment |", "| Thing | Count | Note |")
    .replace("```typescript\nexport function compute", "export function compute")
    .replace("**Confidence:** strong", "**Confidence:** Medium")
    .replace("**Change type:** enforce", "**Change type:** deepening")
    .replace("diagrams/tsconfig_json.mmd)", "diagrams/missing.mmd)"));

  const result = validate(dir);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /unknown section: Medium findings/);
  assert.match(result.stderr, /missing section: Medium Issues/);
  assert.match(result.stderr, /unknown category: Async/);
  assert.match(result.stderr, /path does not exist: src\/missing.ts/);
  assert.match(result.stderr, /table header must carry Category and Location/);
  assert.match(result.stderr, /finding has no fenced snippet/);
  assert.match(result.stderr, /invalid Confidence: Medium/);
  assert.match(result.stderr, /missing architecture field: Interface shape/);
  assert.match(result.stderr, /linked artifact does not exist/);
  assert.match(result.stderr, /Total issues says 7/);
  rmSync(dir, { recursive: true, force: true });
});

test("validate-report keeps the optional sections and a snippet opening above its line", () => {
  const { dir } = newRepo();
  writeReportFixture(dir);
  const report = readFileSync(path.join(dir, "code-smells", "report.md"), "utf8");
  // The guards this asserts are the ones a strict reading would have failed the real report on.
  assert.match(report, /## Discovery\n/);
  assert.match(report, /## Verification\n/);
  assert.match(report, /## Generated artifacts\n/);
  assert.match(report, /\*\*Line:\*\* 4 \|/);
  assert.equal(validate(dir).status, 0);
  rmSync(dir, { recursive: true, force: true });
});

test("a missing diagram warns, and an overclaimed coverage fails", () => {
  const { dir } = newRepo();
  writeReportFixture(dir);
  rmSync(path.join(dir, "code-smells", "diagrams", "tsconfig_json.mmd"));
  editReport(dir, (report) => report.replace("[overview](diagrams/tsconfig_json.mmd)", "the import edges"));

  // A pre-pass that produced no diagram is not a defect of the report, and the report cannot fix it.
  const warned = validate(dir);
  assert.equal(warned.status, 0, warned.stderr);
  assert.match(warned.stderr, /warning: successful graph has no overview diagram: tsconfig_json.mmd/);
  assert.match(warned.stdout, /1 warning\(s\)/);

  // Claiming more analysed projects than there are graphs is the lie the coverage line exists to stop.
  editReport(dir, (report) => report.replace("**Architecture coverage:** 1/1", "**Architecture coverage:** 2/1"));
  const failed = validate(dir);
  assert.equal(failed.status, 1);
  assert.match(failed.stderr, /Architecture coverage claims 2 analysed project\(s\) over 1 graph\(s\)/);
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
