# Pure TypeScript Reviewer

An AI skill for deep code review and auto-fix of pure TypeScript codebases. Finds bugs, type safety holes, security vulnerabilities, async anti-patterns, outdated practices, and code smells — then fixes them with regression tests and verification.

Built for one fixed stack — **TypeScript 5.9.x, ES2024, Node 24** — without any framework-specific checks (no React, Vue, Angular, etc.). Anything below the stack is a finding, anything above it is never recommended.

## What It Does

Four modes, one skill:

| Mode | What happens |
|---|---|
| **scan** | Analyzes the codebase and writes a prioritized report to `code-smells/report.md` |
| **investigate** | Reads the report and decides, from tests, git history, decision records, and callers, whether each finding is a real defect or deliberate. Changes no code |
| **fix** | Reads the report and applies fixes file-by-file with tsc/lint/test verification |
| **auto** | Runs scan, investigates, asks you to confirm, fixes everything, deletes the report if clean |

## What's New

**3.5.0 — pick what runs, and sturdier large runs.** `--domains security,boundary-validation` runs only those domains, and `--pick` asks you in a multi-select. The skill lint drops findings outside the pick, and skips itself when no picked domain owns a lint line. A new module, such as a future framework checklist, joins the menu through its `pass_groups` row. From a run on a 98-file monorepo: a database row typed by a generic and an untyped `JSON.parse` now grade High, a Next.js package is out of scope, `tools/check-passes.mjs` repairs and checks the pass files before the merge, every pass gets a fresh agent, and every Recurring Pattern row lists its sites.

**3.4.0 — a cheaper scan.** A pinned ESLint + typescript-eslint config now runs inside the scan (1 approval, through `npx`), and the 49 checklist lines it decides by rule leave the AI passes. A default scan runs 5 pass groups instead of 9 domain passes, the async and error group reads only the files that can hold its patterns, and the config and dependency group reads no `.ts` file. The pass model is yours to choose once per project. The report format is unchanged. Measured on a 98-file monorepo, the scan spent 8.6% less and finished 10 minutes sooner with the skill lint. On the recall corpus in `fixtures/recall-corpus/`, Sonnet passes halved what the passes cost and kept every High and Highest finding.

**3.3.0 — investigate mode.** Before a fix changes flagged code, the skill now checks whether the pattern is there on purpose: a test that pins it, a commit message that explains it, an ADR that decides it. Deliberate code is left alone and gets a `// Deliberate:` comment citing the evidence, so the next scan does not flag it again. See [Investigate](#investigate--why-is-this-code-this-way).

**3.2.0 — hot paths.** Mark performance-critical code with `/** @hotpath */`. A fix that would add an allocation, a validation, or an extra pass there is redesigned to pay that cost outside the hot path, or handed to you as a choice when it cannot be. See [Hot paths](#hot-paths--hotpath).

Both are optional: a project with no `@hotpath` markers, no tests, and no history gets today's behaviour plus 1 verdict line per finding.

The review covers nine domains by default, each with its own detailed checklist. Add `--arch` or `--full` to include architecture analysis:

| Domain | Examples | Default |
|---|---|---|
| **Type Safety** | `any` abuse, unsafe casts, non-null assertions, `unknown` discipline, missing exhaustive checks | ✓ |
| **Security** | Injection, SSRF, prototype pollution, ReDoS, path traversal, hardcoded secrets | ✓ |
| **Async Patterns** | Floating promises, race conditions, missing timeouts, unbounded concurrency, `forEach(async...)` | ✓ |
| **Modernization** | Numeric enums, `\|\|` vs `??`, mutating array methods, `satisfies`, `using` keyword | ✓ |
| **Code Quality** | Dead code, complexity, duplication, debug artifacts, import-time side effects, testability | ✓ |
| **Config** | tsconfig.json strict flags, target/lib, module resolution, deprecated options | ✓ |
| **Boundary Validation** | `as T` on `JSON.parse`/`fetch`/env, DTO vs domain model separation, contract drift | ✓ |
| **Error Handling** | Silent failures, throw hygiene, `cause` chaining, failure design at API seams | ✓ |
| **Dependency Hygiene** | Lockfiles, wildcard versions, `npm audit`, duplicate-purpose and trivial deps | ✓ |
| **Architecture** | Shallow modules, scattered concepts, tight coupling, dependency direction, layering | `--arch` / `--full` |

## Installation

### Install with npx

From the root of the project where you want to install the skill:

```bash
npx ts-reviewer
```

The installer prints a short summary before installation:

```text
TypeScript Code Reviewer
Checks: type safety, security, async patterns, boundary validation, error handling, modernization, code quality, tsconfig, dependency hygiene
Target stack: TypeScript 5.9.x, ES2024, Node 24
```

Then it asks which AI agents to install for. Use Up/Down arrows to move, Space to toggle, and Enter to confirm.

Supported targets:

| AI agent | Install path |
|---|---|
| Claude Code | `.claude/skills/ts-reviewer/` |
| Codex | `.agents/skills/ts-reviewer/` |
| Antigravity | `.agent/skills/ts-reviewer/` |

> **Note on Codex:** project-local skills belong in `.agents/` per the Codex docs; `~/.codex/` is the *global* per-user directory. Codex also reads a project-local `.codex/` implicitly, so installs from older versions of this installer keep working — but `.agents/` is the correct location going forward.

In non-interactive terminals, the installer selects all supported targets.

### Manual Install

You can still copy the `ts-reviewer/` folder directly into the skill directory for your AI agent.

## Usage

The usual workflow is 3 requests in 1 session, or 1 request in auto mode:

```
Review my TypeScript code        → code-smells/report.md
Investigate the report           → 1 Verdict line per finding, no code change
Fix the report                   → fixes, comments on deliberate code, audit trail
```
```
Review and fix my TypeScript code    → all of the above, with 1 confirmation before the fix
```

Read the report between the steps: it is the work plan, and you can delete findings or edit a verdict before fix runs. Investigate is optional — `Fix the report` straight after a scan works as in earlier versions.

You do not start any sub-agents yourself. The scan launches its own analysis passes as sub-agents (`--agents N`, default 3); investigate and fix run in the main agent.

### Scan — find issues

Just ask Claude to review your code:

```
Review my TypeScript code
```
```
Find issues in this project
```
```
Audit the codebase for security and type safety problems
```

Claude will analyze the project and write a report to `code-smells/report.md` in the project root.
With Architecture active, the same directory also holds project discovery, Knip, graph, metric, co-change, rule, and Mermaid artifacts.

The analysis passes run in waves. `--agents N` sets how many run at once (default 3; `--agents 1` runs them one at a time in the main agent). Each pass writes its own findings file under `code-smells/passes/`, and the queue in `code-smells/passes/queue.md` tracks which passes are done, so an interrupted scan does not lose finished work.

The scan also runs a skill lint: a pinned ESLint + typescript-eslint config (`ts-reviewer/tools/eslint.config.mjs`), through `npx -y eslint@10 typescript-eslint@8 typescript@5.9`, after 1 approval. The checklist lines it decides by rule are marked `lint-owned` in the references, its findings land in the report like any pass, and the AI passes skip those lines. Declined or failed, the scan falls back to the passes for every line. Your project's own linter still runs as before.

The passes run in groups: Type Safety with Boundary Validation, Async Patterns with Error Handling, Config with Dependency Hygiene, Modernization with Code Quality, and Security and Architecture alone.

#### Domain flags

By default, only the nine core domains run. Use flags to control which domains are active:

| Flag | What runs |
|---|---|
| *(none)* | Type Safety, Security, Async, Modernization, Code Quality, Config, Boundary Validation, Error Handling, Dependency Hygiene |
| `--arch` | Architecture only (shallow modules, coupling, dependency direction, seams) |
| `--full` | All ten domains |
| `--no-arch` | The nine core domains — overrides `--arch`, `--full`, and any phrase that would enable architecture |
| `--domains <slugs>` | Only the named domains, by slug (`security`, `type-safety`, `boundary-validation`, ...) or by pass group (`type-safety+boundary-validation`). `--no-arch` still removes Architecture |
| `--pick` | Asks which pass groups to run, in a multi-select (a numbered list on Codex). No answer runs the default set |

Examples:

```
Review my TypeScript code --arch
```
```
Full audit --full
```
```
Review architecture of this project
```

### Fix — apply fixes from the report

After reviewing the scan report, ask Claude to fix the issues:

```
Fix the issues from the report
```
```
Apply fixes from code-smells/report.md
```

The fix workflow:
1. Parses the report as a work plan
2. Runs existing tests to capture a baseline (knows what was already failing)
3. Fixes issues file-by-file, writes regression tests, runs `tsc` after each file. A finding investigate called deliberate gets at most a comment; a fix on a hot path is redesigned first (see [Hot paths](#hot-paths--hotpath))
4. Runs linter, fixes lint errors
5. Runs full test suite, compares with baseline, fixes any regressions it caused
6. Repeats verification up to 5 iterations
7. Updates the report: if all fixed → deletes `code-smells/report.md`; if some remain → keeps it as an audit trail with BEFORE/AFTER diffs for every fix

**Important:** fix never commits or stages anything. You review the changes and decide what to keep.

### Auto — scan + fix in one pass

```
Review and fix my TypeScript code
```
```
Auto-fix code smells
```

Runs scan, investigates every finding, shows you the summary, asks if you want to proceed with fixes, then runs the full fix cycle. If everything is clean afterward, the report is deleted.

### Investigate — why is this code this way?

```
Investigate the report
```
```
Investigate the ts-reviewer report: which findings are deliberate?
```

Run it after a scan, before fix. It needs `code-smells/report.md`, and it works best in a git repository with real commit messages and a test suite — those are its evidence.

Before a fix changes flagged code, investigate asks whether the pattern is there on purpose. For each finding in `code-smells/report.md` it reads 5 sources, cheapest first, and stops at the first that names the flagged behaviour: a comment at the site, a test that calls the function, the commit that introduced the exact lines (`git log -L`), a decision record (`docs/adr/`, `ARCHITECTURE.md`, ...), and the callers. It writes 1 `**Verdict:**` line per finding with a pointer to that source, and changes no code.

| Verdict | Decided by | What fix mode does |
|---|---|---|
| `defect` | a test, a record, or a caller shows the failure | fixes it as reported |
| `deliberate-recorded` | a decision record names the behaviour as wanted | no change, `[SKIPPED: deliberate, <pointer>]` |
| `deliberate-unrecorded` | a test or a commit message names it as wanted, and nothing at the site does | adds `// Deliberate: <behaviour>. Evidence: <pointer>.` above the line, no other change |
| `unreachable` | every caller is known, and none reaches the failure | fixes it when the fix is free; on a hot path a costly fix is skipped without asking |
| `unknown` | no source decides | fixes it as today; the verdict tells you the fix rests on no evidence |

A commit message counts only when it names the behaviour ("wip" does not), and a test is read before the history, so a test that asserts the opposite wins. The comment a `deliberate-unrecorded` verdict leaves is what makes the next scan drop the finding.

### Hot paths — `@hotpath`

Some correct fixes are the wrong default in a frame loop or a message handler: `toSorted()` allocates on every call, a schema parse validates every message. Mark such code with a JSDoc tag:

```typescript
/** @hotpath */
export function updateFrame(entities: Entity[], dt: number): void { /* ... */ }
```

The tag is optional. `@hotpath` on a function, method, or class covers its body; in a file's leading comment it covers the whole file. Without any marker, only loop bodies and iteration callbacks (`map`, `forEach`, `sort`, ...) count as hot. A project running `eslint-plugin-jsdoc` with `check-tag-names` has to declare `hotpath` in `definedTags`.

A finding on a hot path whose fix adds a per-call cost carries a `**Hot path:**` line in the report. Fix mode does not apply such a fix as written: it walks a ladder of 7 rungs — remove the case through types, move the cost to the boundary, hoist it, reuse a module-owned buffer, check it in development builds only, split off the common case — and applies the first that closes the finding. When none does (rung 7), the code stays untouched and you are shown both variants: the reported fix with its cost, and the current code with its defect. You pick one; with no answer the entry is recorded as `[SKIPPED: rung 7 <kind>]`. A `bench` or `benchmark` script in `package.json` is run before and after, and both numbers go on every designed fix.

## Scope Modes

By default the entire codebase is reviewed. You can narrow the scope:

| What you say | What gets reviewed |
|---|---|
| *"review my code"* | Full codebase |
| *"review my changes"*, *"check uncommitted"* | Staged + unstaged + untracked `.ts`/`.mts`/`.cts` files |
| *"review my PR"*, *"diff against main"* | All changes on current branch vs base |
| *"review last commit"*, *"check last 3 commits"* | Last N commits |

### Diff-aware severity boost

In scoped modes, issues on **new/modified lines** get their severity boosted by one level (Low→Medium, Medium→High, etc.). A Medium code smell in a three-year-old file is tech debt; the same smell in code you wrote today should be fixed before merging.

Issues on unchanged lines are listed separately as pre-existing tech debt — informational, not blocking.

## Severity Scale

| Level | Meaning |
|---|---|
| **Highest** | Active bugs, security vulnerabilities, data loss risks |
| **High** | Bugs waiting to happen, will break under edge cases |
| **Medium** | Tech debt — clean up when you're already editing that file |
| **Low** | Style and conventions — improve when convenient |

Architecture findings use the same scale. Each candidate also carries a **Fixability** tag:

| Fixability | Meaning |
|---|---|
| `auto` | Applied automatically during fix mode |
| `needs-confirm` | Shown to you first — only applied after explicit approval |
| `report-only` | Left as documentation — never auto-applied |

## Project Structure

```
AGENTS.md                             # How to edit the review rules — read before changing anything below
CLAUDE.md                             # Pointer to AGENTS.md, picked up automatically by Claude Code

src/                                  # npm/npx installer source
├── cli.ts                            # CLI entrypoint and provider prompt
├── prompt.ts                         # raw-mode keyboard multi-select
└── paths.ts                          # target directories and skill asset loading

cnlp/                                 # the CNL-P format the skill files are written in
├── cnlp-format.md                    # the standard: forms, line rules, lexicon
├── cnlp.js                           # the checker — Node builtins only, no dependencies
├── skill-format.test.js              # the conformance test, run by `npm test`
└── profiles/                         # what each kind of document may contain
    ├── skill.md                      #   → ts-reviewer/SKILL.md
    ├── reference.md                  #   → ts-reviewer/references/*.md
    ├── guide.md                      #   → AGENTS.md
    └── profile.md                    #   → the profiles themselves

ts-reviewer/
├── SKILL.md                          # Main skill file — mode routing, workflow orchestration
├── tools/                            # Mechanical pre-pass and report validator — plain Node, no dependencies
│   ├── discover-projects.mjs         # Finds the TypeScript projects and their source roots
│   ├── co-change.mjs                 # Git co-change pairs across directory boundaries
│   ├── run-cruise.mjs                # dependency-cruiser graphs, metrics, and Mermaid diagrams per project
│   ├── classify-run.mjs              # Reads a tool run by its output, not its exit code
│   └── validate-report.mjs           # Checks code-smells/report.md against the report contract
└── references/
    ├── type-safety.md                # Checklist: any, unknown, casts, !, exhaustiveness, branded types
    ├── security.md                   # Checklist: trust boundaries, injection, SSRF, pollution, ReDoS
    ├── async-patterns.md             # Checklist: floating promises, races, timeouts, retries, cancellation
    ├── boundary-validation.md        # Checklist: runtime validation at edges, DTO/domain separation
    ├── error-handling.md             # Checklist: silent failures, throw hygiene, failure design
    ├── modernization.md              # Checklist: patterns below the stack, ??/?. , satisfies, using, toSorted
    ├── code-quality.md               # Checklist: complexity, dead code, debug artifacts, testability
    ├── tsconfig.md                   # Checklist: strict flags, target/lib, module resolution, deprecated
    ├── dependency-hygiene.md         # Checklist: lockfiles, versions, npm audit, dependency choice
    ├── architecture.md               # Checklist: shallow modules, coupling, dependency direction, seams
    ├── fix-workflow.md               # Complete fix protocol: tests, verification, rollback
    ├── fix-design.md                 # Stack-free ladder for designing a fix on a hot path
    ├── stack-cost.md                 # The @hotpath marker, cost kinds, rung forms, bench command, evidence sources
    └── investigate.md                # Stack-free verdicts: why flagged code is the way it is

docs/                                 # design proposals behind each feature, with their decisions
fixtures/                             # throwaway projects + answer keys the features were tested against (unpublished)
├── cost-corpus/                      #   → hot paths, 3.2.0
└── intent-corpus/                    #   → investigate, 3.3.0
```

**SKILL.md** is the orchestrator — it routes between scan/investigate/fix/auto modes, detects domain flags (`--arch`, `--full`), defines scope detection, severity scale, and report format.

**Reference files** contain the detailed checklists and protocols. Each analysis agent reads only the reference file relevant to its domain, keeping context focused. Architecture analysis is opt-in and loaded only when the domain is active.

## Editing the Rules

As of 2.0.0, `SKILL.md` and every reference file are written in **CNL-P** — a block-structured format an agent reads as instructions rather than prose. One rule per line, one term per concept, no headings, a hard 250-character line limit.

A check line looks like this:

```
- injection — `eval()` and `new Function()` executing a dynamic string: Highest, use a lookup table, a strategy, or a safe parser
```

The format is enforced, not merely recommended:

```bash
npm test        # typecheck + conformance and tool tests
```

The test catches a check line that lost its severity, a block the profile does not declare, blocks out of order, a banned vague word, and a line over the limit — each reported with its file and line number.

**Before adding or changing a rule, read [`AGENTS.md`](AGENTS.md).** It states which file owns which domain, the shape of a check line, the severity scale, which block takes what, and the line rules. Claude Code picks this up on its own through `CLAUDE.md`; for another agent, point it at `AGENTS.md` explicitly.

## How It Works Under the Hood

### Scan mode

1. **Discovery** — detects domain flags, maps the project, reads tsconfig.json, detects linter and test runner, asks the pass model once per project, and asks once before downloading the skill lint or a missing architecture tool.
2. **Diagnostics** — runs `tsc --noEmit`, the project linter, the skill lint, and LSP diagnostics (if available). The skill lint's findings become the pass `lint-skill`; compiler and linter output is cached under `code-smells/passes/` and reused on a resume of the same commit.
3. **Architecture pre-pass** — when active, writes bounded Knip, graph, metric, co-change, rule, and Mermaid artifacts under `code-smells/`, with project coverage and bounded failure diagnostics.
4. **Analysis** — specialized passes, 1 per group of domains, judge the candidates against the active checklists, skipping the lines the skill lint owns, running in waves of `--agents` at a time; each pass writes its own `code-smells/passes/<id>.jsonl`, and `passes/queue.md` marks which are done, so a stopped run resumes from the last checkpoint. Tool output is never a finding by itself.
5. **Report** — deduplicates, applies severity boost (scoped modes), consolidates recurring patterns, enforces a noise budget, writes `code-smells/report.md`, and validates its contract before the scan succeeds. Architecture findings appear in a separate `## Architecture Opportunities` section at the end.

Validate a report directly with `node ts-reviewer/tools/validate-report.mjs --repo . --report code-smells/report.md`. It checks headings, counts, finding anchors, architecture fields, and linked artifacts without adding a dependency, and it reads both the scan report and the audit trail a fix run leaves in its place. An **error** is a defect of the report that rewriting it fixes; a **warning** names an outcome of the mechanical pre-pass — a graph with no diagram, say — that the report cannot fix, and warnings do not fail the run.

### Investigate mode

1. Reads `references/investigate.md` and the evidence locations in `references/stack-cost.md`
2. For each `###` finding, reads the sources in order — site comment, tests, `git log -L` on the exact lines, decision records, callers — and stops at the first that names the flagged behaviour
3. Writes `**Verdict:** <verdict> | **Evidence:** <source> <pointer>` into the entry, and validates the report
4. Changes no source file: `git diff` is the same before and after

### Fix mode

1. Validates `code-smells/report.md` and stops before changing code when the report is invalid
2. Parses the report as the work plan
3. Captures test baseline (runs tests before changes), and the `bench` script when a finding is on a hot path
4. Closes deliberate findings first: no change for `deliberate-recorded`, 1 `// Deliberate:` comment for `deliberate-unrecorded`
5. Applies fixes bottom-to-top within each file (so line numbers don't shift); a fix on a hot path goes through the 7-rung design first
6. Writes regression tests for each testable fix
7. Runs `tsc --noEmit` after each file
8. Runs the full verification loop: tsc + linter + test suite (max 5 iterations)
9. Compares test results with baseline — only fixes regressions it caused
10. Shows you the rung 7 choices, runs the `bench` script again, and writes both numbers on every designed fix
11. Updates or deletes the report, keeps the remaining `code-smells/` artifacts, and asks before removing them

## Tips

- **Add `code-smells/` to `.gitignore`** — it contains review artifacts, not source code.

- **Resume an interrupted scan** — run the same scan again. When `code-smells/passes/queue.md` exists, the skill asks whether to resume (finished passes are skipped, cached `tsc` and linter output is reused on the same commit) or restart from scratch.

- **Claude Code users** — `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` in `settings.json` under `env` caps sub-agents for every session on the host. It is independent of `--agents`, which caps one review run and works in every supported agent.

- **Pick the pass model once** — the first scan asks which model and effort the analysis passes use, and writes the answer to `.claude/agents/ts-reviewer-scout.md` (Claude Code: `model`, `effort`) or `.codex/agents/ts-reviewer-scout.toml` (Codex: `model`, `model_reasoning_effort`). A smaller model there, for example Sonnet at `high`, costs less, while the main agent keeps verifying every finding. Delete the file to be asked again, or pass `--scout <model>` for 1 run. Architecture always runs on the main agent's model.

- **Commit before running fix** — so you can `git diff` to review changes and `git checkout -- .` to revert if needed.

- **Edit the report before fix** — since fix uses `code-smells/report.md` as its work plan, you can delete issues you don't want fixed, change severities, change a `Verdict` line, or add notes before running fix.

- **Leave evidence of intent** — a test that asserts the behaviour, a commit message that names it, or an ADR in `docs/adr/` is what investigate reads. A code comment at the site is the strongest: the scan drops the finding outright.

- **Mark hot paths once** — `/** @hotpath */` on a frame loop, parser, or message handler keeps every future fix there allocation-aware. Unmarked loops are still treated as possibly hot.

- **Scoped review for PRs** — `"review my branch against main"` is the most practical mode for day-to-day use. Full codebase audits are better suited for periodic health checks.

## Requirements

- TypeScript 5.9.x project targeting ES2024 on Node 24
- Git repository (for scoped modes and safe revert during fix)
- Node 24 with `npx` available (for tsc, linter)
- Optional: a `bench` or `benchmark` script in `package.json`, for before/after numbers on hot-path fixes
- Claude Code (recommended) or any Claude interface with skill support

## License

MIT
