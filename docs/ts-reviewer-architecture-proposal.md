# Proposal — make `ts-reviewer` architecture review executable

**Audience:** the agent maintaining the `ts-reviewer` skill repository.
**Status:** proposal. The rules here have not been applied to `SKILL.md` or `references/`.
**Revision:** every design question is decided — the metric-to-finding model and the co-change
definition (§4), Knip's role under `--arch` (§4), the finding shape (Hole 5), the entry-point policy
(Hole 2), declaration-vs-graph (§6), partial failures (§7), the migration cost (§8), `speculative`
and `--affected` (§12). Every `dependency-cruiser` and Knip claim here was measured on the pinned
versions, and no row of the §10 checklist is open.

**The pre-pass already exists in this repository.** `ts-reviewer/tools/` holds
`discover-projects.mjs`, `co-change.mjs`, `run-cruise.mjs` and `classify-run.mjs`; `tools.test.mjs`
at the root is their eight-test self-check and runs inside `npm test`. They have been run against a
313-commit project with twelve tsconfigs and a real layer declaration. Nothing in §4 is a sketch.

**What implementation still owns:** translating these rules into CNL-P inside `SKILL.md` and
`references/architecture.md` — the line limits, the lexicon and `check_line_form` are enforced by
`npm test` and nothing here has been through them — and deciding which block takes which rule.
**Evidence base:** real `--arch` runs against outside TypeScript projects, plus live verification of
the `dependency-cruiser` and Knip CLIs. Every tool claim below was executed, not recalled.

**How to read the evidence — and what never travels into the skill.** Measurements come from real
codebases, because a rule derived from a fixture is a rule that has met nothing. But the *finding* is
always the generic behaviour, never the project it was seen in. Repository names are omitted;
repository paths appear only as **illustration** and are marked as such.

`ts-reviewer` is a general-purpose skill, so the implementing agent copies **only the rule** into
`SKILL.md` and `references/*.md` — never an example path, never a project's own rule names, never a
measured number. Everything under `docs/` is working material for that agent: it is not shipped
(`package.json` `files` lists `dist/**` and `ts-reviewer/**` only) and never reaches a user.

---

## 1. Diagnosis

A full `--arch` run over a 1,518-file codebase produced **5 findings, zero bugs**. All five were
structural (dependency direction, test seams, type ownership). They were correct — and they were
also everything the run found.

The cause is not the rule set. `references/architecture.md` is content-strong: depth as a property
of the interface, the deletion test, "a cycle is unclear ownership and not a bad graph", "1 adapter
is a hypothetical seam and 2 adapters are a real seam", and a real evidence discipline
(`confidence_scale`, "state the observation apart from the inference"). Those rules do not need
rewriting.

The cause is **executability**. Architecture is the only one of the 10 domains with no mechanical
pre-pass:

```
Type Safety / Quality / Config / Security / …        Architecture
────────────────────────────────────────────         ─────────────────────────
SKILL.md:17  npx tsc --noEmit                        (nothing)
SKILL.md:18  npx eslint --format json                (nothing)
SKILL.md:20  triage through severity_mapping         (nothing)
SKILL.md:21  → semantic pass over the reference      SKILL.md:21 → semantic pass
```

For nine domains the shape is **tool produces facts → model produces judgement**. For architecture
the model is asked to produce both. It produces facts badly, and the budget that should have gone
into judgement is spent on file discovery instead.

### The demonstration

One command on the reviewed repository *(illustration)*:

```bash
npx depcruise --metrics --output-type json --exclude '^(node_modules|node:)' src
```

Folder-level coupling, top of the list:

| Folder *(illustration)* | fan-in | fan-out | instability |
|---|---|---|---|
| `src/mcp/handlers/shared` | **162** | 4 | 0.02 |
| `src/utils` | 74 | 1 | 0.01 |
| `src/mcp/handlers` | 65 | 213 | 0.77 |
| `src/mcp` | 10 | 236 | 0.96 |

The top entry is 4 files and 23 exports carrying 162 incoming edges, and it mixes three unrelated
concepts: error handling, response presentation, and a service accessor.

`references/architecture.md` **already has the rule** for exactly this:

> `locality — a shared utility module mixing unrelated domain concepts: Medium`
> `workflow:5 — check whether the exports of a utility file imported by most modules share 1 domain concept`

The rule fired for nobody. Not because the rule is weak, but because `workflow:5` presupposes
knowing *which* utility file is "imported by most modules" — and nothing in the skill computes that.

**The tool found the candidate. The rule would have delivered the verdict.**

---

## 2. Five structural holes in `references/architecture.md`

### Hole 1 — the architecture `workflow:` carries no commands

`SKILL.md` has a `scope_commands` block with exact shell commands for building the file list. The
architecture workflow has no equivalent, and four of its eight steps require aggregates that cannot
be produced by reading:

| Step | What it asks for | How it is currently obtainable |
|---|---|---|
| `workflow:3` | list the importers of each module | nothing — an importer index is not built by hand |
| `workflow:4` | a type re-exported unchanged through 3+ files | the same index |
| `workflow:5` | do the exports of a widely-imported utility share 1 domain | needs fan-in to know which file to open |
| `workflow:6` | `git log --name-only`, commits touching 4+ directories | no command, no threshold, no output shape |

`workflow:6` is the sharpest case: it asks for co-change analysis and supplies neither a command nor
a threshold. On a repository of any size an agent will skim or skip it. In the observed run its
evidence appears anecdotally ("changed together in three July commits") rather than as a ranked list.

This is an internal inconsistency: everywhere else the skill is command-precise; here it says
"read git log".

**Where the commands go — not into a new block.** `cnlp/profiles/reference.md` declares every
section a `references/` file may use, and `arch_commands` is not among them, so inventing that block
means editing the profile first (`AGENTS.md` workflow:8). No profile edit is needed:
`AGENTS.md:94` already allows a fenced code block inside `workflow:`, which is exactly how
`SKILL.md` carries `scope_commands`. §4 is therefore a fenced block attached to the architecture
`workflow:`, and the hole is the missing commands, not a missing section.

### Hole 2 — one traced scenario regardless of project size

`workflow:1` — "trace 1 typical scenario end to end before naming a finding". `SKILL.md:12` already
identifies **all** entry points (`index.ts`, `main.ts`, `package.json#exports`). Nothing connects
the two. A project with an MCP server, a CLI, an ingestion pipeline, and a browser-automation
surface gets one scenario covering roughly a quarter of the system.

**Fix direction:** scenario count follows entry-point count, capped at `min(entryPoints, 3)`, over
entry points the project itself declares — not every file called `main.ts`.

What counts as declared: `package.json#exports`, `#main`, `#bin`, and the commands in
`scripts.start`, `scripts.dev`, and `scripts.serve`. A `main.ts` nothing points at is not an entry
point; a file named from a start script is one whatever it is called.

Which three, when more than three are declared: rank them by the number of modules in the subtree
each one reaches — the graph from §4 already carries that count — and take the top three. The rule
exists for determinism as much as for coverage: without an ordering, two runs of the same review
trace different scenarios and produce different reports.

The cap is deliberate and low. §1 diagnoses a budget spent on discovery instead of judgement, and an
end-to-end trace is the most expensive item in this whole proposal. Four traces plus three new
pre-passes spend the budget the diagnosis was trying to reclaim.

### Hole 3 — no aggregate checks

All ~30 checks are local: *this* module, *this* import, *this* type. None is distributional:

- fan-in / fan-out per module and per folder
- instability (`efferent / (afferent + efferent)`) against position in the layer stack
- one directory holding a disproportionate share of modules
- a god-module by importer count

Architecture problems are frequently distributional. A checklist made only of local predicates
cannot see them, no matter how good each predicate is.

### Hole 4 — whole-tree duplication is not addressed

The closest existing check is `under-engineering — 1 business rule … implemented in 2+ modules`.
Formally it covers duplication; practically it does not scale to "these four directories are copies
of each other". No check invites the reviewer to look for duplicated *trees*.

**Critical caveat, learned from the reviewed repository:** the duplication found there was
**deliberate** — four scaffold template variants kept physically independent on purpose, because
they are exported to end users and each may diverge with its own tricks. A naive duplication
detector would have produced a large, confident, wrong finding. See §11.

**Decision:** defer `jscpd` until its expected output, ignore policy, and triage contract are defined.
Keep §11 as the acceptance guard for that later addition.

### Hole 5 — `report_format` forces one finding shape

Every entry must fill **Proposed deepening** and **Interface shape**. But a real fraction of
architecture findings involve no interface change at all:

- "these two files should be one file"
- "this directory should be deleted"
- "this convention should become a lint rule"
- "this type belongs to the other module" (a pure ownership move)

Observed consequence: for a type-ownership move the report wrote *"Proposed deepening: Move the
type"* — which is not deepening. The template made the report slightly untrue.

**Fix direction.** `report_format` gains one always-present field and loses three unconditional
ones. `Proposed deepening` is renamed `Proposed change`, and a new `Change type` names the shape:

```
- **Change type:** deepening | ownership move | merge | delete | enforce
```

Which fields that shape then requires:

| Change type | `Interface shape` | `Dependency category` | `Migration` | Typical fixability |
|---|---|---|---|---|
| deepening | required | required | required | `needs-confirm` |
| merge | required — the merged interface | omitted | required | `needs-confirm` |
| ownership move | omitted | omitted | required, expand-contract | `needs-confirm` |
| delete | omitted | omitted | required — it is the deletion step | `auto` when nothing imports it |
| enforce | omitted | omitted | omitted | `report-only` |

Every other field stays mandatory for every shape: `Confidence`, `Files`, `Problem`, `Evidence`,
`Test strategy`, `Benefits`, `Trade-offs`, `Fixability`, and `Top recommendation` on exactly one
entry. `enforce` additionally carries the rule text and the file it would live in — and stays
`report-only` because `scan` does not write a config into the project (§6).

An omitted field is left out, not filled with "n/a": the observed failure was a template forcing a
sentence that was not true.

---

## 3. A self-contradiction worth removing

`references/architecture.md`, last line of `forbidden_behaviors`:

> do not add an import-linting dependency for 1 rule: use `package.json#exports`, the linter the
> project already runs, or the workspace layout

Sound in spirit — do not drag in a dependency to satisfy one rule. But read literally it **forbids
the reviewer from ever proposing `dependency-cruiser`**, which in the observed run was the single
highest-value recommendation: two "upward dependency" findings that had survived months of review
are precisely what a layer-rule file catches for free and permanently.

**Proposed rewording,** separating the two cases:

- Do not add a dependency **as the fix** for one finding — prefer `package.json#exports`, the
  project's existing linter (`import/no-restricted-paths`), or workspace layout.
- Using a graph tool **as an analysis instrument** during review is not adding a dependency: see the
  acquisition policy in §5 (it never touches `package.json`).

---

## 4. Proposed command block inside the architecture `workflow:`

Modelled on the existing `scope_commands`, and carried as a fenced block inside `workflow:` for the
reason given in Hole 1. Four commands, no variables the block does not itself produce.

```bash
# SKILL is the directory this skill was installed into: the agent already resolves it to load
# references/*.md, and it differs per host (.claude/skills/, .agents/skills/, .agent/skills/ —
# src/paths.ts:12-18). KNIP is the project's own copy when it has one, per the policy in §5.
SKILL=<the directory this file was loaded from>
KNIP=$([ -x node_modules/.bin/knip ] && echo node_modules/.bin/knip || echo "npx -y knip@6.31.0")

mkdir -p code-smells

# ── 0. once per repository ──────────────────────────────────────────────────
node "$SKILL/tools/discover-projects.mjs" > code-smells/projects.json
$KNIP --reporter json > code-smells/knip.json
node "$SKILL/tools/co-change.mjs" --projects code-smells/projects.json --out code-smells/co-change.md

# ── 1. every architecture project, graph + metrics + diagram in one pass ────
node "$SKILL/tools/run-cruise.mjs" --projects code-smells/projects.json --out code-smells

# ── 2. in a scoped mode only, add the modules reaching the changed ones ─────
# BASE is the value scope_commands already computes for the branch scope
node "$SKILL/tools/run-cruise.mjs" --projects code-smells/projects.json --out code-smells --base "$BASE"
```

`run-cruise.mjs` creates `code-smells/graphs/` and `code-smells/diagrams/` itself; the `mkdir` above
is for the two redirects that precede it. Substituting `$KNIP` follows the acquisition policy in §5
without a branch in the prose: the project's own binary when it exists, `npx` only when it does not —
and `npx` still runs only after the operator has approved it at discovery.

**Why a script and not a longer shell block.** The previous draft of this section was a bash block,
and it carried three defects that only a shell can have:

| Defect | What actually happened |
|---|---|
| several source roots joined with a space inside `"$SRC"` | the tool received **one** argument named `scripts src` and cruised nothing |
| the command kept in a string, `CRUISE="npx … --exclude '^(…)'"`, then expanded | the single quotes survive expansion, and the regex reaches the tool **with the quotes in it**, matching nothing |
| `projects[0]` with the prose promising a loop | every project after the first was silently never cruised |

Both quoting defects were reproduced in a shell before being removed. Neither is visible in the
output: the run stays green and the graph comes back empty or unfiltered. Moving the loop, the
ruleset, the argument list and the regexes into `run-cruise.mjs` deletes the whole class — a
`spawnSync` argument array has no quoting to get wrong — and makes them testable, which a fenced
block is not.

`run-cruise.mjs` writes the scratch ruleset itself, iterates every project in `projects.json`, and
per project produces `graphs/<id>.json`, the `err` pass, `diagrams/<id>.mmd`, and the `--affected`
pass when a base is given. It writes `code-smells/cruise-summary.md`: one row per step with its exit
code and its reading, and a closing line stating whether the zeros in this run are reportable.

### Why the project's own config is never passed verbatim

A project declaration is a source of **rules**. Its `options` — `exclude`, `includeOnly`,
`doNotFollow` — are written for the area that project chose to cover, and the danger is
path-dependent: harmless when the cruise happens to target that same area, total when it does not.

Both cases were measured on a project whose declaration excludes its template and example trees
*(illustration)*:

| Cruise target | `--config <the project's file>` | `--config <their rules + our options>` |
|---|---|---|
| the area the config was written for | 7 violations, 291 modules | **identical**: 7 violations, 291 modules |
| a tree that config excludes | `✔ no dependency violations found (0 modules cruised)`, exit 0 | the intended graph |

The project chose which area its config covers. **Discovery chooses which project the review
cruises**, and the two need not agree — so the merged form is correct in both rows while the verbatim
file is correct only in the first. The pre-pass therefore always writes **one scratch config**: the
`forbidden` array read from the declaration when there is one, plus its own `options`. That keeps
the project's agreed rules — the whole point of §6 — without inheriting a scope written to answer a
different question.

For completeness, `--no-config` on the same example cruised 502 modules and 1438 dependencies: it
drops the project's `doNotFollow` too and walks into `node_modules`.

The scratch ruleset — the `forbidden` array from the declaration when there is one, the minimum set
below when there is not, and in both cases these options:

```js
module.exports = {
  forbidden: [
    { name: "no-circular", severity: "warn", from: {}, to: { circular: true } },
    { name: "no-orphans", severity: "warn", from: { orphan: true }, to: {} },
    { name: "not-to-unresolvable", severity: "error", from: {}, to: { couldNotResolve: true } },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    exclude: "^(node_modules|node:)",
    includeOnly: "^(src|scripts)/",   // ← the discovered source roots, built by run-cruise.mjs
    tsPreCompilationDeps: true,
  },
};
```

**`exclude: "^(node_modules|node:)"` does not drop Node builtins**, which this document asserted
three times before it was measured. `dependency-cruiser` normalises `node:fs/promises` to the source
`fs/promises` and flags it `coreModule`, so nothing in the graph ever starts with `node:` for the
pattern to match. Cruising this repository with that exclude in place returned ten modules, five of
them `fs`, `fs/promises`, `path`, `process` and `readline`, and the folder diagram was half builtins.

`includeOnly`, scoped to the source roots discovery already computed, is exact: it drops builtins,
`node_modules` and every external package in one rule. The same run then returned **five modules,
zero core modules**, and a diagram collapsed to the project's own folders. The `exclude` line stays
as a second belt, not as the mechanism.

**Why `--no-config` is banned rather than merely discouraged.** Measured on a three-module fixture
containing one import cycle and one orphan:

| Command | Result |
|---|---|
| `--output-type err --no-config` | `✔ no dependency violations found (3 modules, 2 dependencies cruised)`, exit 0 |
| `--output-type err --config <the ruleset above>` | `warn no-orphans`, `warn no-circular` with the full chain, exit 0 |

The first line is the failure mode §7 asks the reviewer to report as a mechanical zero. Under
`--no-config` no rule is loaded, so `err` has nothing to violate and prints a clean tree for any tree
at all. A "no cycles" line produced that way is a fabricated result.

**The guard that catches all of these at once.** Three separate causes of a green empty result are
now measured: `typescript` not resolvable (§5), a foreign `exclude` inherited from the project's
config (above), and an empty ruleset (the table above). They share one symptom, so they share one
check: **`totalCruised == 0` over a non-empty source root is a failed pre-pass, never a clean
result.** It is recorded as skipped under the rule in §7, and nothing downstream reads the empty
graph as "this project has no coupling worth reporting".

### The three scripts ship as files — and already do

`ts-reviewer/tools/` holds them, rather than fenced blocks the agent retypes into `node -e` each run.
Lines reproduced from a checklist are exactly the fragile pre-pass §7 is written against, and a file
can be tested where a snippet cannot — which is how all three defects listed above were found and are
now guarded.

This cost nothing in the installer and one row in a guide:

| Fact | Where it is already true |
|---|---|
| the installer copies files of any extension, not only `.md` | `src/paths.ts:40`, `walkAssetFiles` |
| the published package already includes them | `package.json` `files: ["dist/**", "ts-reviewer/**"]` |
| the CNL-P format check ignores them | `cnlp/skill-format.test.js:37` reads only `*.md` under `ts-reviewer/references` |
| the test does not ship | `tools.test.mjs` sits at the repository root, outside both `files` globs |
| **what was paid** | two rows in `file_map` and one in `verification` in `AGENTS.md`, plus `tools.test.mjs` added to `scripts.test` |

The self-check that comes with them is `tools.test.mjs` at the repository root, eight tests: the
output-classifier including a green tick over an empty graph, the four co-change gates plus a deleted
file plus a monorepo, discovery separating a solution config and a base config from two leaves, an
extended config that owns its own sources, two configs collapsing onto one file set, and
`run-cruise` cruising two source roots as two arguments with the graph staying local.

That last one drives `dependency-cruiser` through `npx`, so it is **skipped unless
`ARCH_TOOLS_NETWORK=1`** is set: `npm test` has to pass on a machine with no network and a cold npx
cache. The other seven build their own Git and TypeScript fixtures and need nothing but the
repository's own `typescript`.

`discover-projects.mjs` replaces the prose discovery policy with the algorithm: find the workspaces,
take every tracked `tsconfig*.json`, and classify each one.

- a config is a **base** only when another config extends it **and** it declares no `include`,
  `files`, or `references` of its own. Being extended is not disqualifying by itself — the first
  version of this rule dropped the root `tsconfig.json` of the first real project it met, a config
  that owned the product's source tree and was merely *also* the options other configs inherited.
  The pre-pass then analysed that project's examples, templates and test fixtures, and skipped the
  product itself;
- a config resolving no source files is a **solution config**, and one `tsc` cannot read carries its
  exit code and diagnostic rather than the word "unreadable";
- two configs resolving the **same** file set are one project: the tie breaks on shortest path then
  lexicographically, so two runs of one review agree;
- the source root is **computed** from `tsc --listFilesOnly` as the common directory of the resolved
  files — not read from `rootDir`, which is relative to its own config file and absent from most
  configs. When that common directory is the repository root, the project carries its **top-level
  directories** instead: the repository root is useless as a `--collapse` base and, as §4's
  co-change note explains, collapses every cross-directory pair.

Known ceiling: one `tsc` invocation per config, which took 19.6 seconds over twelve configs on the
measured project. It is linear and it runs once per review, so it stays until a repository large
enough to make it hurt shows up — at which point the configs are independent and can run in
parallel.

`co-change.mjs` runs Git itself rather than reading a pipe, which is what makes "once per
repository" enforceable. It is `node` rather than `awk` not because `awk` is missing — Git Bash
ships it — but because pair counting with a ratio gate is twenty lines of logic, and a fragile
one-liner is a pre-pass that returns nothing without saying so.

Three contract details the earlier draft got wrong:

- **it reads `*.ts`, `*.mts`, and `*.cts`.** `scope:` in `SKILL.md` treats the three alike, and the
  earlier pathspec silently reviewed a third of a `.mts` codebase;
- **a pair naming a file that no longer exists is dropped**, by intersecting with `git ls-files`
  before counting. History is not structure;
- **the scoped file set filters the output, never the counting.** Intersecting during counting
  would erase every pair in `uncommitted` mode, whose scope is three files. A pair is reported when
  either end is in scope.

The cross-directory gate measures the top-level directory **relative to each project's source
root**, which is why the script takes every root at once. Measured from the repository root, every
file in a monorepo shares the directory `packages`, and the gate would reject every pair there is.

### Co-change parameters

`workflow:6` asks for co-change and defines nothing. These are the values, each with the reason it
is not a matter of taste:

| Parameter | Value | Why |
|---|---|---|
| window | 12 months, and at most 500 commits | architecture from four years ago is dead evidence; the review is about the current shape |
| merges | excluded, `--no-merges` | a merge repeats every file of the branch and doubles the count |
| renames | not followed | a renamed file starts a new identity, which undercounts — and undercounting is the safe direction of error |
| mechanical commits | drop any commit touching > 25 files | removes lockfile bumps, format sweeps, mass renames, and the initial import, and caps the O(n²) pair expansion at the same time |
| pair gate | `co >= 5` **and** `co / min(changes_a, changes_b) >= 0.5` | a raw count favours hot files; a ratio alone explodes on a small denominator. Two gates close both |
| directories | only pairs whose top-level directories under the source root differ | co-change inside one directory is expected and is not evidence of a broken boundary |
| into the model | top 15 pairs | the same cap the report already applies at `SKILL.md:31` |

**Cross the pairs with the graph.** Both artefacts are already computed, so the intersection is
free, and it is the strongest filter here:

- a pair **with** an import edge between its files — weak signal, the coupling is declared in code
  and is frequently by design;
- a pair **with no** edge, in different directories — duplicated knowledge or an implicit contract.
  This is the case `locality — feature logic split by technical layer` was written for.

Without this step the top 15 is half "a module and its own test" and half "a handler and its schema".

**Measured, and the prediction held.** Over a 313-commit history — 36 commits dropped as mechanical —
the gates returned five pairs, of three distinct shapes:

| Co-changes | Ratio | Shape of the pair |
|---|---|---|
| 11 | 0.79 | a type module in a layer the declaration marks pure, against a loader in the presentation layer |
| 10 | 0.91 | a second module of that same pure layer, against the same loader |
| 5 | 1.00 | a build script, against the module whose output format it depends on — twice, for two different scripts |
| 5 | 1.00 | the entry points of two scaffold template variants |

The top two are the case this whole subsection was written for. That project's own declaration
**forbids** an edge between those two layers, so no import explains why the files move together
eleven and ten times. A pair that co-changes with no edge between it is an implicit contract:
knowledge duplicated in two modules with nothing in the type system holding them in step. Neither
the graph nor the checklist alone would have raised it; the intersection did.

The last row is the deliberate template duplication §11 exists to protect, and it arrives as one
candidate among five rather than as the only thing the pass found — which is what a working gate
looks like.

**A bias to state rather than filter:** a pair whose two files were both created inside the window
co-changes because it is new, not because the boundary is wrong.

**Derived inputs the model should receive** (not the raw graph — see §7):

| Derived artefact | Feeds which existing check |
|---|---|
| unused files, exports, and dependencies | dead structure candidates, handed to Dependency Hygiene |
| top-20 modules and folders by fan-in | `workflow:5`, `locality — shared utility mixing concepts` |
| modules whose whole export set has 1 importer **and** that wrap or re-export another module | `workflow:3`, the deletion test |
| cycle list with participating files | `import and module structure — barrel-file cycle: High` |
| orphan / unreachable modules | dead structure, hands off to Dependency Hygiene |
| cross-layer edge list | `dependency direction — shared or leaf module importing a feature: High` |
| co-change pairs crossing directory boundaries | `workflow:6`, `locality — feature split by technical layer` |
| instability per folder, ordered | ranking only — it names the layer stack to test in §6, and produces no finding by itself |

Three constraints on this table, each closing a hole the earlier draft left open.

**The one-importer row is narrowed on purpose.** In a healthy repository most modules have exactly
one importer, so the unnarrowed row is a candidate flood, and `non_findings` already states that one
importer is not a finding by itself. Only a module that wraps or re-exports another one is worth the
deletion test.

**Knip candidates need a `file:line` anchor.** Deduplication at `SKILL.md:28` and `:29` keys on file
and line. A dead export arriving from Knip without one is not deduplicated against the same export
found by Code Quality, and the report carries it twice.

**Metrics rank; they do not judge.** No threshold appears anywhere in this table. A fixed number —
`fan-in > 50` — means different things in a 200-file and a 5,000-file repository, so it needs a
calibration nobody will maintain, and it is wrong in both directions: a logger with 74 importers is
a logger, and a three-importer module mixing error handling with a service accessor is a real
finding the threshold never sees. A rank is self-normalising and carries no constant.

This adds **exactly 1 check line** to the checklist — the declaration-conformance line in §6, which
is not a metric and needs no threshold. Every other input here feeds a rule that already exists.

### What Knip does under `--arch`

`--arch` loads Architecture and nothing else, and that stays true: the flag does not quietly pull in
Dependency Hygiene, because an operator who narrowed the scope on purpose should get what they asked
for. So under `--arch` **Knip produces no findings at all.** It contributes two inputs and one file:

- **unused exports narrow the real interface of a module.** This is the architecturally interesting
  half: depth is a property of the interface, so a module exporting 23 symbols of which 6 are
  reached has an interface a third of its apparent size, and both the deletion test and the
  shallow-module checks read differently once that is known.
- **unused files confirm a module nothing reaches** — useful, but largely the same signal
  `dependency-cruiser` already emits as `orphan`. The non-redundant half of Knip is the exports.
- **`code-smells/knip.json` is written either way**, so the operator can run Dependency Hygiene over
  the same inventory later without a second scan.

Under `--full` both domains are active, the dead-code findings belong to Dependency Hygiene, and the
two views of the same export are deduplicated on the `file:line` anchor above.

### Project discovery policy

Workspaces define package boundaries; TypeScript project references define compilation units.
Discover npm, Yarn, Bun, and pnpm workspaces first, then follow `references` transitively inside
each package.

- A solution config that only aggregates `references`, and a base config that only supplies inherited
  options, are metadata and do not receive their own analysis run.
- A referenced leaf or standalone config with its own resolved source set is an architecture project.
- Two configs resolving the **same** set are one project, and the tie breaks on shortest path then
  lexicographically. This replaces an earlier draft's "prefer the config named by a `build` or
  `typecheck` script": that rule is unavailable when neither script names a config, and it disagreed
  with what `discover-projects.mjs` actually does.
- A test, browser, or tooling variant whose set is **contained** in another's is a variant of it and
  receives no aggregate metrics run. Sets that merely **overlap** stay separate projects, and the
  modules they share are deduplicated by repository-relative path before triage — the same merge the
  last bullet of this list already performs.
- Run dependency-cruiser once per selected architecture project. Keep its raw graph separate, then
  merge derived tables by repository-relative module path before ranking candidates.

---

## 5. Tool acquisition policy

`npx` does not install into the project. The package lands in the npm cache (`~/.npm/_npx`);
`package.json` and the lockfile are untouched; `git status` stays clean. The reviewer asks the
operator before downloading and executing a missing tool.

```
tool present in node_modules?
├── yes → use it (faster, version pinned by the project)
└── no  → ask the operator
          ├── approved → npx -y <tool>@<major>   (cache, not the project)
          └── declined or unavailable → record the skipped pre-pass and continue
          never npm install or npm uninstall
```

**Ask once, in the main agent, at discovery.** `SKILL.md:22` runs the analysis passes as sub-agents,
and a sub-agent cannot prompt the operator. A tool question raised lazily, at the moment a pass
needs the tool, is a question nobody can answer. The decision is taken before the passes start, and
the answer is passed down with the file list.

**Say plainly what `npx -y` does.** It downloads a package from the network and executes it. The
Dependency Hygiene domain would flag exactly this in someone else's code, so the skill states it
rather than hiding it behind "it does not touch `package.json`": the major is pinned, the operator
is asked once, and a declined answer is recorded, not worked around.

Why *install-then-uninstall* is **worse** than `npx`:

- `npm install` mutates `package.json` and the lockfile. The skill already forbids committing and
  staging, so it would hand the operator an unexplained diff.
- `npm uninstall` rewrites the lockfile and can reorder or alter unrelated entries. A read-only
  analysis must not risk leaving the repository in a worse state than it found it.

Three traps that belong in the skill text, all three measured:

- **`-y` is mandatory.** Without it `npx` prompts on first use and the agent hangs.
- **`--ts-config tsconfig.json` is mandatory in any project with path aliases.** Measured on a
  three-module fixture whose `tsconfig` maps `@utils/*` and `@domain/*` onto `src/`:

| Invocation | Result |
|---|---|
| with `--ts-config` | 3 modules, 2 dependencies, **0 violations**, exit 0 |
| without it | **4 phantom violations** — 2 `not-to-unresolvable` for the two aliased imports, 2 `no-orphans` for the files those imports point at — and the module count inflates to 5, because each unresolved specifier is counted as a module of its own. Exit 2 |

  Every one of those four is indistinguishable from a real finding by shape. A first run without this
  flag produces confident garbage, and the aliased modules are reported as dead code.
- **`NODE_PATH` is mandatory whenever `--ts-config` is used.** `dependency-cruiser` needs the
  TypeScript compiler to read a `tsconfig`, and it resolves `typescript` from its own install
  location. Run from the `npx` cache it does not find the project's copy, reports
  `missing-typescript-transpiler`, cruises **zero modules**, and exits **0** with a green
  `✔ no dependency violations found`. Measured on this repository, which has `typescript@5.9.3`
  installed:

| Invocation | Modules cruised |
|---|---|
| `npx -y dependency-cruiser --ts-config tsconfig.json src` | **0** |
| `npx -y -p dependency-cruiser -p typescript depcruise --ts-config tsconfig.json src` | **0** — co-installing does not help |
| `NODE_PATH=$PWD/node_modules npx -y dependency-cruiser --ts-config tsconfig.json src` | 10 |
| `npx -y dependency-cruiser src/cli.ts src/index.ts` (no `--ts-config`) | 9 |

  This is the most dangerous failure in the whole pre-pass, because it does not look like one: a
  clean exit code, a green tick, and an empty graph that every downstream table reads as "this
  project has no coupling worth reporting".
- **Omitting the config flag does not reliably fail.** Without `--config` or `--no-config`,
  `dependency-cruiser` exits 1 with `Can't open a config file` — but **only when no default config
  exists**. In a project holding a `.dependency-cruiser.cjs` it silently picks that file up and
  cruises under rules and scope the review never chose. The silent case is the dangerous one, which
  is why §4 always passes an explicit `--config` pointing at a scratch file.

---

## 6. The strongest single addition — declaration-vs-graph conformance

This is the mechanism that produced the most value in the observed run, and nothing in the skill
does it today.

```
1. locate the declaration     a machine-readable one first, then prose
2. extract the layer rules    prose bullets like "❌ Services → handlers (no upward dependency)"
3. test them against the graph
4. report the delta           "the document states X; the graph contains N violations"
```

Why this beats a taste-based finding:

- **Anchored to the project's own intent**, not the reviewer's preference. It cannot be dismissed
  as opinion.
- **Ships an artefact.** The extracted rules *are* a config file the project can adopt, turning a
  one-off review into a permanent gate.

### A machine-readable declaration skips step 2 entirely

Check for one before reading any prose: `.dependency-cruiser.{js,cjs,json}`, an
`import/no-restricted-paths` entry in the ESLint config, or `eslint-plugin-boundaries`. If one
exists there is nothing to interpret — the rules are already agreed by the project, so the semantic
pass has only to confirm the edge is not a declared exception and to consolidate. Prose extraction
is the fallback, not the main path.

Two things that follow, and both were got wrong in an earlier draft of this section:

- **the declaration is not run verbatim.** Its `forbidden` array is merged into the scratch ruleset,
  its `options` are not — §4 has the measurement. A run under the project's own file is a run under
  a scope the review did not choose;
- **a violation is still a candidate, not a finding.** §7 admits no exception, and this branch needs
  none: the pass here is short, but it exists. What the declaration removes is the *interpretation*
  step, not the triage step.

**An ESLint-hosted declaration is read from the linter, not converted.** `import/no-restricted-paths`
and `eslint-plugin-boundaries` state their rules in ESLint's own vocabulary, and `SKILL.md:18`
already runs the linter and collects its JSON. Their violations therefore arrive with the other lint
diagnostics and triage through `severity_mapping`. Translating those rules into
`dependency-cruiser` syntax would build a two-format transpiler to re-derive output the review is
already holding.

`package.json#imports` is **not** on that list. Subpath imports are a mapping from `#specifier` to a
file, not a prohibition on a direction, so their presence never makes an edge a violation. Both
`#imports` and `#exports` are useful in the neighbouring job of mapping a layer name onto a
directory, and `#exports` additionally bounds what another package may reach — which is the case the
existing `import and module structure` check already owns.

**What such a declaration looks like in practice** *(illustration, from a measured project)*. Its
`.dependency-cruiser.cjs` opens by naming itself the executable form of the layer boundaries written
in its `ARCHITECTURE.md` — "the prose is the rationale, this file is the gate" — and carries six
named rules, each with its own `comment` and a severity the project chose. The shapes that matter:

| Shape of rule | Severity chosen |
|---|---|
| no import cycles | error |
| a lower layer must not depend on the presentation layer | error |
| a designated pure layer reaches no service, storage, or database | error |
| sibling feature domains talk through services, not to each other | error |
| production code does not import test escape hatches | error |
| a known contract leak, **tolerated for now**, with the move that would clear it named in the comment | warn |

Nothing here needs extracting or interpreting: the rules are executable, the severities are the
project's own, and the `comment` fields carry the rationale a finding would otherwise have to
reconstruct. This is the branch working exactly as designed — and it is also where the trap in §4
lives, because taking the file whole would import its `options` along with its rules.

### The declaration's severity is the project's own triage — inherit it

Run against that project's own source root, its ruleset produced **7 violations, all of the single
`warn`-severity rule** — the one whose comment says the leak is tolerated for now and names the move
that would clear it.

That is declared debt, not a discovery. A review that reports it as a fresh High finding is telling
the project something it wrote down itself, and burning the operator's attention doing it. So:

| Declared severity | Finding severity |
|---|---|
| `error` | High |
| `warn` | Medium |
| `info` | Low |

and the rule's `comment` goes into `Evidence` verbatim, because it is the project's own statement of
what the rule protects and what would clear it. Where the earlier bullet on exceptions covered prose
caveats and legacy paths, this covers the machine-readable case: a severity in the declaration is an
exception the project already graded.

### The edge is a fact; the extracted rule is an interpretation

"Irrefutable, no confidence scale needed" is too strong and is removed. The edge is objective; the
reading of a prose bullet is not. **Confidence attaches to the rule, not to the edge:**

| Situation | Confidence |
|---|---|
| the rule is quoted verbatim and its layer names map 1:1 onto directories | `strong` |
| the rule is inferred from surrounding prose, or a layer name is ambiguous | `worth-exploring` |
| the layer names cannot be mapped onto directories at all | not reported — ask instead |

### Which document counts

A machine-readable declaration outranks all prose. Among prose sources:
`docs/adr/` and `docs/decisions/` → `ARCHITECTURE.md` → a README section → `CONTRIBUTING.md`. No new
discovery step is needed: `SKILL.md:15` already scans the ADR directories.

**Two ADRs in conflict are resolved by an explicit supersede, never by date.** An ADR that states it
supersedes another wins; without that statement the two are reported to the operator as a conflict
and neither is used as a rule. A date is not a decision: the newer document may be a draft, a
narrower amendment, or a proposal nobody accepted, and picking it silently would let the review
enforce a rule the project never adopted.

The extracted rules are shown before any finding is raised, as a table of
`rule | source file:line | directories it maps to` in `discovery_summary`, so the operator can
refute a misreading. Showing them does not block the scan. A blocking question is raised only when
the mapping is ambiguous *and* the finding would land at High.

### Exceptions and reporting shape

- an exception stated in the same document is part of the rule: edges matching only the exception
  produce no finding;
- paths the declaration itself marks legacy or deprecated cap the finding at Low;
- the extracted `dependency-cruiser` config is written to `code-smells/suggested.dependency-cruiser.cjs`
  and **never** into the project. `scan` is read-only, which is the entire argument of §5;
- the semantic pass is not skipped, but its job is narrow: is the rule real, is this edge an
  exception, does the entry consolidate. Its output is **one finding per rule with its violating
  edges listed**, never one finding per edge — a single broken rule with 40 edges would otherwise
  blow through the caps at `SKILL.md:30` and `:31` and bury every other finding.

The check line this needs, in the form `check_line_form` requires:

```
- dependency direction — an import edge contradicting a layer rule the project declares in an ADR or ARCHITECTURE.md: High, quote the rule with its source line and list the violating edges
```

This is the one new rule the proposal adds. The existing
`dependency direction — a shared or leaf module … importing from a feature module: High` covers a
single hard-coded shape, and a declared rule can run in any direction — "domain does not import
transport", "package A does not import package B" — so stretching the existing line to carry it
would make that line describe something it does not do.

Currently `forbidden_behaviors` uses ADRs only as a **constraint** ("do not propose a change
contradicting a decision under `docs/adr/` silently"). This proposal makes them a **source of
checkable rules** as well.

Behaviour when no declaration exists: do not invent layers. Instead, report the observed structure
(folder instability ordering, cross-directory edges) and offer the declaration as the missing
artefact — "there is no stated dependency direction; here is what the graph currently implies".

---

## 7. Protocol — tool output is triage input, never a finding

The single biggest risk of adding tooling is that the report degenerates into a tool dump. The skill
already has the correct instinct for this: `severity_mapping` triages compiler and linter output
rather than pasting it. Extend the same discipline:

```
tool output  →  candidate list  →  semantic pass over the shortlist  →  finding
                     ▲                                                     ▲
              ranked, bounded                                  the existing checks decide
```

Rules to state explicitly:

- Run Knip, dependency-cruiser, and Git co-change against the same unchanged tree. `scan` never
  invokes `knip --fix` or removes a reported file, export, or dependency.
- In `fix`, change only confirmed findings, then rerun all three pre-passes. Filter historical
  co-change paths against the files that still exist in the current scope.
- A cycle, a hub, an orphan, or a co-change pair is a **candidate**, not a finding. It enters the
  report only after a check in `checks:` produces a verdict on it.
- **Never feed the model the raw graph.** A mid-sized project is ~300 modules and ~1,100 edges;
  that is a context flood with a poor signal ratio. Feed the derived tables from §4.
- Keep the existing consolidation caps (`SKILL.md:26`, `:30`, `:31`) applied to tool-derived
  candidates too, otherwise a single cycle cluster produces 15 near-identical entries.
- If a tool reports zero of something (no cycles, no orphans), say so in the discovery summary. A
  clean mechanical result is information, and it is currently invisible. **A zero counts only when
  the check actually ran**: the rule that would have caught it was loaded, and the module count is
  greater than zero. A zero from an empty graph or an empty ruleset is not reported at all — see the
  two measured cases in §4 and §5.
- **Classify by output, not by exit code.** Measured: Knip exits `1` while writing valid JSON full
  of findings; `dependency-cruiser` exits `0` while reporting two `warn`-severity violations, and
  exits `1` when no config flag is passed at all. Neither direction of the exit code means what it
  looks like:

| Exit | Output | Reading |
|---|---|---|
| `0` | parseable, empty | clean — reportable as a mechanical zero, if the ruleset was non-empty |
| `0` | parseable, non-empty | candidates found |
| non-zero | parseable | candidates found — this is Knip's normal result, not a failure |
| any | absent or unparseable | failed pre-pass: record it as skipped, and do not guess around it |

  Knip's JSON carries `file`, `line`, and `col` per export, so the `file:line` anchor the
  deduplication in §4 depends on comes from the tool and does not have to be reconstructed.
- **A cruise of zero modules is a failure, whatever it printed.** `totalCruised == 0` over a
  non-empty source root is recorded as a skipped pre-pass. Three distinct causes are measured in §4
  and §5, and all three end in the same green tick over an empty graph. This rule is what keeps the
  "report mechanical zeros" instruction above from becoming a generator of fabricated clean results.
- **A failed pre-pass is recorded, never worked around.** It is listed in `discovery_summary` as
  skipped, and the checks that depend on it are reported as not run. The model does not substitute a
  hand-built importer index for a failed `dependency-cruiser` run: that is the original problem
  returning, now wearing the appearance of completed work. A partial result is usable — one project
  of three cruised, one pre-pass of three run — as long as what is missing is named.

---

## 8. Output contract — a directory, not a single file

`code-smells.md` alone can no longer carry the output once diagrams and tool exports exist.

```
code-smells/
├── report.md                          the report in the current report_format
├── knip.json                          raw unused-file, export, and dependency candidates
├── metrics.md                         the derived tables from §4
├── co-change.md                       the ranked pairs, with co-count, ratio, and both paths
├── projects.json                      the architecture projects and their source roots
├── cruise-summary.md                  one row per cruise step: exit code, reading, and whether this run's zeros are reportable
├── suggested.dependency-cruiser.cjs   the extracted layer rules from §6, never written to the project
├── graphs/
│   └── <project>.json                 raw depcruise export for each selected TS project
└── diagrams/
    ├── folders.mmd                    folder-level overview
    └── <finding>.mmd                  one focused diagram per top finding
```

Preserved from the current contract: the directory lives in the **project root**, not under
`.claude/` (the existing `forbidden_behaviors` reason still applies — it must stay visible when no
Claude tooling is present), and the skill still recommends adding it to `.gitignore` as a review
artefact.

Implementation replaces every repository-owned reference to `code-smells.md` in `SKILL.md`,
`references/fix-workflow.md`, and the README with `code-smells/report.md`. Fix mode reads only the
new path; it neither accepts nor migrates the legacy flat file, and no other project is migrated.

**This is a breaking change, and its full cost is:**

| Touchpoint | What changes |
|---|---|
| `SKILL.md` | `preconditions:`, `outputs:` (2 lines), `workflow:32`, `:35`, `:42`, `:45` |
| `references/fix-workflow.md` | lines 10, 16, 30, 31, 87 |
| `README.md` | lines 13, 84, 117, 127, 244, 248, 259, 263 |
| `SKILL.md:31` | the missing-report precondition is a hard error, so a run mid-workflow against the old path stops rather than degrading |
| `dist/` | committed to the repository, so it is rebuilt |
| `package.json` | a major version bump: the output path is a contract with existing users. `npm version` rewrites the lockfile's own `version` fields, so it needs no separate migration step |

An operator holding a `code-smells.md` from a previous scan gets the "No scan report found" error
from `fix-workflow.md:10`. That message names only the missing file; it is worth extending to say
the path moved.

After a successful fix, keep `code-smells/` because its graphs, diagrams, and metrics can remain
useful. Tell the operator what the directory contains and ask whether to remove it; delete it only
after explicit confirmation.

### The report is a parsed contract, and `report_format` owns it

Fix mode reads `report.md` as a work plan, so a drifting report is not a cosmetic problem: it is an
unparseable input. The first real run produced `## Medium findings` for `## Medium Issues`, placed
`## Architecture opportunities` above `## Low findings`, wrote `(6 Highest, 18 High, …)` where the
format says lowercase, and invented an eight-field architecture entry
(`Evidence/Intent/Evolution/Impact/Recommendation/Confidence/Trend/Status`) in place of the twelve
the format declares. `ts-reviewer/tools/validate-report.mjs` is the gate; the settled rules it
enforces, all of them stated in `report_format` first:

| Rule | Why it is in the contract |
|---|---|
| the `##` set is closed and ordered, with `Discovery`, `Pre-existing Issues`, `Architecture Opportunities`, `Verification`, and `Generated artifacts` optional | a renamed section is the drift; the five optional ones carry the real run's most useful output and had to become legal rather than forbidden |
| `Total issues` counts `###` findings, summary-table rows, and Architecture entries | the count was checkable only against a rule that lived nowhere, so the agent could not hit it |
| a `Recurring Patterns` row is a pattern, never an issue | its members are already counted where they sit |
| a summary table is read by its `Category` and `Location` columns, a pattern table by `Pattern` and `Occurrences` | the two tables sit in the same sections and only the header tells them apart |
| a snippet matches the file within its own length of the stated line | the anchor that catches an invented snippet, without failing one that opens on a signature above the finding |
| `**Architecture coverage:** N/M` in the metadata header | one place, bold like its neighbours |

**Errors against warnings.** An error is a defect of the report text that rewriting it corrects, and
it stops fix mode. A warning names an outcome of the mechanical pre-pass — a graph with no diagram,
a missing artefact — which no rewrite can fix; failing on those would spend both validation attempts
of `SKILL.md` on something the agent cannot change, and lose an otherwise sound review.

The one coverage claim that stays an error is the overclaim: `successful` above the number of graphs
on disk. That is the failure this whole section exists to stop — 27 of 36 cruise steps failed and
the report still said the architecture was "generally acyclic". `run-cruise.mjs` now decides
coverage with a single predicate, *a project produced a graph*, so `metrics.md`, `cruise-summary.md`
and the report's own number cannot disagree.

---

## 9. Diagrams — what works without system dependencies

Verified against `dependency-cruiser` 17.4.3 `--help`:

| `--output-type` | Needs Graphviz? | Use |
|---|---|---|
| `mermaid` | **no** | renders natively in GitHub and in markdown — embeddable directly in the report |
| `err-html` | **no** | standalone HTML violation report |
| `json` | no | source for every derived metric |
| `text` / `flat` | no | plain edge list |
| `dot` / `ddot` / `archi` | **yes** | SVG via `dot -Tsvg` |
| `d2` | needs `d2` | alternative renderer |

**Therefore:** `mermaid` is the default and SVG is a conditional branch guarded by an actual
capability probe (`dot -V`), never assumed. In the reviewed environment Graphviz was installed and
`dot` was still absent from `PATH` in both shells — a probe is not paranoia.

**Scale is the real problem, not rendering.** Measured on the reviewed repository *(illustration)*:

```
depcruise --output-type mermaid --collapse '^src/[^/]+/' src
  → 401 lines, including node_modules, external packages, and node: builtins
```

An uncurated graph is unreadable spaghetti and adds nothing to a report. Curation flags that make it
useful:

| Flag | Effect |
|---|---|
| `--collapse '^src/[^/]+/'` | folder-level view (~20 nodes instead of ~300) |
| `includeOnly` scoped to the source roots | drop externals — and unlike `--exclude '^(node_modules\|node:)'`, it also drops Node builtins, which never carry the `node:` prefix in the graph. See §4 |
| `--focus <regex>` `--focus-depth N` | the neighbourhood of one suspect module |
| `--reaches <regex>` | everything that can reach a module |
| `--highlight <regex>` | mark the violating modules |

**Guidance to encode:** generate **2–3 narrow diagrams tied to findings**, never "the project
graph". A diagram that does not support a specific claim should not be produced.

That splits the diagram work across the semantic pass, and the ordering matters:

- **before triage**, `run-cruise.mjs` writes one collapsed folder overview per project. It depends on
  nothing but the graph, and it is what the reviewer reads while forming candidates;
- **after triage**, one focused diagram per top finding — and not before, because until a finding
  exists there is no module to focus on:

```bash
node "$SKILL/tools/run-cruise.mjs" --projects code-smells/projects.json --out code-smells \
  --focus '^src/mcp/handlers/shared' --name shared-hub
```

---

## 10. Tool catalogue

Ranked by signal per unit of setup cost, constrained by "must work in any TypeScript project with
zero project configuration".

### Tier 1 — always, no config, high signal

| Tool | What it contributes | Hole it closes |
|---|---|---|
| `dependency-cruiser` | graph, cycles, orphans, `--metrics` (fan-in/out/instability), `--affected` | 1 and 3 |
| `knip` | dead files, exports, dependencies | orthogonal to the graph; hands off to Dependency Hygiene |
| git co-change | file pairs that always change together | 1 (`workflow:6`) — and it needs **no dependency at all** |

The last row deserves emphasis: `workflow:6` already asks for co-change analysis. No npm package is
required — `git log --format='%H' --name-only` plus pair counting yields the coupling matrix. Files
in different layers that always land in the same commit indicate a boundary that exists on paper
only.

### Tier 2 — when cheap in the target project

- **`type-coverage`** — percentage of the codebase not typed as `any`. A cheap signal about
  boundary hygiene.
- **`eslint-plugin-sonarjs`** — cognitive complexity and duplicated blocks, inside the linter the
  project already runs.
- **`import/no-restricted-paths`** or **`eslint-plugin-boundaries`** — layer rules inside the
  existing linter. Note the division of labour this creates, which resolves the contradiction in §3:
  **`dependency-cruiser` for analysis, the project's own linter for the fix.**

### Tier 3 — situational or redundant

- **`jscpd`** — deferred until the review defines its expected output, ignore policy, and semantic
  triage. Section 11 is the required guard before enabling whole-tree duplication analysis.
- **`madge`** — almost entirely subsumed by `dependency-cruiser`, which detects cycles via
  `to: { circular: true }`. Residual value: `--summary`, `--orphans`, `--leaves`, `-d`. Projects
  running both are usually doing so for historical reasons.
- **`dpdm`** — cycles only; markets itself against `madge`, not against `dependency-cruiser`. Its
  niche is speed on very large repositories. Below roughly a thousand modules the difference is not
  observable.
- **`skott`** — a more modern `madge` alternative with a built-in web UI.
- **`arkit`** — zero-config diagrams; maintenance activity should be checked before recommending.
- **`api-extractor`** — makes the public API surface explicit and diffable, which is architectural
  in the interface sense, but the setup cost is too high for a general-purpose reviewer.

**Recommendation:** `dependency-cruiser` alone covers the graph axis. Do not recommend `madge`
alongside it.

**No acceptance fixtures — a run checklist instead.** `npm test` is a typecheck plus the CNL-P
format check, and the content added here is prose rules, which a committed fixture repository cannot
assert without a harness costing more than the rules it guards. What replaces it is six runs the
author performs once, before the command block goes into the skill. Each one covers exactly what a
fixture would have covered:

| Run | Passes when |
|---|---|
| a workspace using TypeScript `references` | the discovery policy selects one architecture project per leaf config, and no run is launched for a solution or base config |
| a project with `paths` aliases | `--ts-config` resolves every alias and the run reports zero phantom `unresolvable` and `orphan` entries |
| a project with no Knip configuration | Knip either produces a usable inventory or fails cleanly, and the failure is recorded as a skipped pre-pass rather than guessed around |
| a repository with real history | the co-change gates return between 0 and 15 pairs, mechanical commits are absent from the result, and no pair sits inside one directory |
| a repository with a declaration carrying an exception | the rule is extracted with its source line, and edges matching only the exception produce no finding |
| an operator declining `npx` | the architecture pass still completes, and the discovery summary names every pre-pass that did not run |

**Three of the six are already closed**, and not by hand: the three scripts carry the eight-test
self-check listed in §4, which builds its own Git and TypeScript fixtures. It runs in `npm test`, so
it stays green rather than being green once.

**Three more closed by real runs.** An outside project supplied twelve tsconfigs including a solution
config and a base config, a machine-readable declaration, and a Knip configuration — and it broke two
things no fixture had: the base-config rule that dropped the product, and the assumption that a
project's own `dependency-cruiser` config can be passed verbatim. Both are fixed, both now have
regression tests, and both are documented above with the numbers.

**The last row is now closed by a fixture.** A three-module project mapping `@utils/*` and
`@domain/*` onto `src/` was cruised with and without `--ts-config`: with the flag, 3 modules and zero
violations; without it, four phantom violations and an inflated module count. The numbers are in §5.
No row of this checklist is open.

---

## 11. Required guard — deliberate duplication is not a finding

Direct consequence of a false positive this analysis nearly produced.

The reviewed repository contains four scaffold template variants with physically duplicated source
trees. Changing one shared type required eight synchronised file edits. Every duplication heuristic
flags this loudly.

**It is deliberate.** The variants are exported to end users and are kept independent on purpose so
each can diverge with its own specifics. The duplication is the design, and the synchronised-edit
cost is the accepted price.

`SKILL.md` already carries the governing principle — *"do not flag a consistent project convention
unless it is harmful"* — but no architecture check operationalises it. Before a duplication finding
is reported, the reviewer must resolve intent:

1. Does a project document (`ARCHITECTURE.md`, an ADR, a README section, a CHANGELOG convention)
   state that the copies are intentional?
2. Does an ignore file scope the tool away from them (`.jscpdignore`, a `depcruise` `exclude`)?
3. Does the git history show the copies being maintained **in lockstep** (deliberate parallel
   maintenance) rather than **drifting** (accidental copies)?

If any answer is yes, the finding is dropped — or, at most, reported as a **Low** observation about
the *cost* of the decision (the synchronised-edit tax), never about the decision itself. If a
project has no such declaration and the reviewer judges the duplication unintentional, the most
useful recommendation is often "declare the intent", not "deduplicate".

**This is no longer hypothetical.** Over a 313-commit history the co-change pass returned five pairs,
and one of them is this exact case: the entry points of two scaffold template variants, co-changed
five times with a ratio of 1.00. The mechanical pass did its job by raising it as a candidate; this
section is what stops it from becoming a confident, wrong finding about scaffolds that are copies on
purpose. The other four pairs, listed in §4, are genuine candidates — so the guard is doing triage,
not suppressing a pass that found nothing else.

This generalises: **a structural fact plus an unknown intent is not a defect.** The same reasoning
applies to layered directories, repeated adapters, and parallel test trees.

---

## 12. Smaller adjustments

- **`speculative` is not reported as a finding.** It does not enter `## Architecture Opportunities`
  at any severity. `forbidden_behaviors` in `SKILL.md` already forbids reporting what cannot be
  defended from the code in front of you, and `read_first` in `architecture.md` already says to mark
  an evidence-free candidate speculative *instead of* reporting it as a defect — the two together
  leave no room for a Low entry. Capping at Low was the other option and it is rejected: a Low entry
  with no evidence is exactly the noise the caps at `SKILL.md:30` and `:31` exist to remove.
  The candidate does not vanish silently either: `discovery_summary` carries a single line listing
  the speculative candidates by name, so the operator can ask about one without the report claiming
  it is a defect. This also settles `speculative` + `High`, which is now unreachable.
- **Scenario count follows entry points** (§ Hole 2).
- **Report mechanical zeros.** "No cycles, no orphans, 292 modules, 1,100 edges" belongs in
  `discovery_summary`. Currently a clean structural result is indistinguishable from an unperformed
  check.
- **Add the mechanical pre-pass to `workflow`** between the existing `SKILL.md:20` triage step and
  the semantic passes, so the architecture domain gains the same shape as the other nine.
- **`--affected` widens the evidence, not the scope.** The skill's scoped analysis is the diff file
  list; `--affected` adds every module reaching a changed one, which is what makes an architecture
  finding legible. The rule that keeps `in_diff` coherent: a finding is anchored to one file, and
  `in_diff: true` is set only when *that* file is in the diff list. A module pulled in as a reacher
  never carries the flag and never takes the boost at `workflow:27`, even when the edge that proves
  the finding starts in a changed file. A finding anchored outside the diff goes to
  `Pre-existing Issues` — which is what it is: the reviewer only noticed it because something
  nearby changed.
- **Name what the added budget displaces.** §1 diagnoses a budget spent on discovery, and §4 then
  adds Knip, one `dependency-cruiser` run per project, a Git pass, and diagram generation. The trace
  cap in Hole 2 is part of the answer; the rest is that the pre-pass replaces manual file discovery
  rather than preceding it.

---

## Appendix — verification log

Every capability claim in this document was executed during the analysis, not recalled:

| Claim | How it was verified |
|---|---|
| output types include `mermaid`, `err-html`, `d2` | `npx depcruise --help` on v17.4.3 |
| `--collapse`, `--focus`, `--reaches`, `--affected`, `--metrics`, `--ignore-known` exist | same |
| `--metrics` yields folder-level afferent/efferent/instability | `--metrics --output-type json`, folder table extracted |
| an uncurated collapsed mermaid graph is unusable | 401 lines including externals |
| Graphviz can be installed and `dot` still absent from `PATH` | `which dot` in Git Bash, `Get-Command dot` in PowerShell, both negative |
| latest `dependency-cruiser` is 18.1.0, latest `madge` is 8.0.0 | `npm view <pkg> version` |
| `co-change.mjs` honours every gate, drops deleted files, and measures directories per source root | `node --test`, 8 tests over self-built Git and workspace fixtures, all green |
| `discover-projects.mjs` separates a solution config and a base config from two leaf projects, and computes a source root with no `rootDir` present | same self-check; on this repository it returns 1 project with root `src` |
| any `dependency-cruiser` command without `--config` or `--no-config` exits 1 | run on 18.1.0: `ERROR: Can't open a config file` for both `--metrics` and `--affected` |
| `--no-config` reports a clean tree on a tree with a cycle and an orphan | 3-module fixture: `✔ no dependency violations found`, exit 0. With the minimum ruleset: both violations reported |
| `--ts-config` cruises 0 modules unless `typescript` is resolvable from `NODE_PATH` | four invocations compared in §5; only the `NODE_PATH` one cruised the project |
| Knip 6.31.0 exits 1 with valid JSON when it finds issues, and carries `file`, `line`, `col` | run on this repository, JSON parsed and inspected |
| a real project with 12 tsconfigs, a declaration, a Knip config and 313 commits | two full pre-pass runs against an outside project, reported in §4, §5, §6 and §11 |
| the first discovery rule dropped the product | that project's root `tsconfig.json` owns `src/` and is extended by the templates; the corrected rule keeps it — second run: 268 files, root `src` — and a regression test covers the shape |
| two configs over one file set collapse, and a repository-wide set yields top-level roots | second run: `scripts/tsconfig.json` became a variant of `tsconfig.scripts.json`, whose roots are `scripts, src` |
| an unreadable config reports its diagnostic | second run: `error TS18003: No inputs were found` with the `include` globs that matched nothing |
| a project declaration applied verbatim is path-dependent, not universally wrong | on a tree that declaration excludes it cruised 0 modules; on the area it covers it matched the merged form exactly at 7 violations and 291 modules |
| the full graph pass produces a real result | 291 modules, 960 dependencies, 90 folders, 7 violations of the project's own `warn`-severity rule |
| co-change on a real history returns candidates, not noise | 313 commits, 36 dropped as mechanical, 5 pairs — two of them across a boundary the project's own rules forbid |
| `--ts-config` is what makes a `paths` alias resolve | 3-module alias fixture: with the flag 3 modules and 0 violations; without it 4 phantom violations and 5 modules, exit 2 |
| `exclude: "^(node_modules|node:)"` does not drop Node builtins | the graph normalises `node:fs` to `fs`; `includeOnly` over the source roots took this repository from 10 modules with 5 builtins to 5 modules with none |
| a shell block joined source roots into one argument and kept a regex quoted | both reproduced in bash, both deleted by moving the loop into `run-cruise.mjs` |
| a fan-in hub can hide mixed concerns invisible to a semantic-only pass | metrics run, then reading the 4 files and 23 exports of the top hub |
