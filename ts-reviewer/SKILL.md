---
name: ts-reviewer
description: >
  TypeScript code review and auto-fix. Modes: scan, investigate, fix, auto. Scopes: full codebase,
  uncommitted, branch diff, last N commits. Trigger on: review, audit, check, lint,
  find issues, find bugs, investigate the report, why is this code this way, is this deliberate,
  fix issues, fix the report, fix code smells, auto-fix, review and fix,
  clean up code, tech debt, code health, security audit, modernize, review my changes,
  review my PR, review last commit. Architecture review: --arch, --full, review architecture,
  find refactoring opportunities, full audit. Pure TypeScript 5.9.x, ES2024, Node 24 only.
---

mode: typescript_code_review

purpose:
- review a pure TypeScript codebase against `target_stack` in multiple passes, and write what it finds to a report
- apply the fixes named in that report, with compiler, linter, and test verification after each

target_stack:
- TypeScript 5.9.x
- `target` and `lib` ES2024
- Node 24, ESM, `module` and `moduleResolution` `nodenext`
- `tsc` emits to an output directory and Node runs the emitted JavaScript: a relative import carries the `.js` extension, and Node type-stripping is out of the model
- a pattern below this stack is a finding, and a feature above it is never recommended

inputs:
- the request, which carries the run mode, the domain set, the scope mode, and the wave size
- the project `tsconfig.json`, `package.json`, and linter config
- the reference checklists under `references/`

preconditions:
- `code-smells/report.md` exists before fix mode or investigate mode runs: it is the work plan, and either stops with an error when it is absent

scope:
- `.ts`, `.mts`, and `.cts` files are reviewed alike
- `.d.ts` files are reviewed by the Type Safety domain only: a declaration has no runtime behavior
- `.tsx` is out of scope
- the analysis scope in a scoped mode is the diff file list, and the reading scope is wider
- `--affected` widens Architecture evidence to modules reaching a changed module, and does not widen the analysis scope
- anchor each finding to 1 file, and set `in_diff: true` only when that file is in the diff list
- read as read-only context: `tsconfig.json`, the configs it extends, and `package.json`
- read as read-only context: the files the scoped files import 1 level deep, and the shared types in `types.ts`, `*.d.ts`, `interfaces/`, `shared/`
- a workspace package whose `package.json` depends on `next` is out of scope: drop its files and its config from the file list, and name it in the discovery summary

forbidden_behaviors:
- do not write the report under `.claude/`: it stays visible when no Claude tooling is present
- do not commit and do not stage: the operator reviews the fixes and decides
- do not check framework code: the scope is pure TypeScript
- do not require `CONTEXT.md` or any other domain-doc file
- do not report an issue found in a context file
- do not improvise a suppression-directive severity: `references/type-safety.md` owns them
- do not flag a consistent project convention unless it is harmful
- do not report a finding without a snippet and a concrete fix: "Consider refactoring" is not a fix
- do not report a finding whose snippet is absent at the stated line, give or take 2 lines: re-locate it or drop it
- do not downgrade a finding the enclosing function or module already guards, validates, narrows, or comments: drop it
- do not report a finding you cannot defend from the code in front of you
- do not drop a finding as deliberate unless a comment or a doc at the site says so: investigate mode, or the operator, decides the rest
- do not edit code in investigate mode: the verdicts are its whole output, and fix mode acts on them
- do not cite a link outside typescriptlang.org, developer.mozilla.org, and nodejs.org, or a path inside this skill: omit the `reference` field instead
- do not build a link from memory
- do not recommend anything outside `target_stack`
- do not justify a ban by naming the version that introduced the replacement: the stack is fixed
- do not emit the same file and line twice
- do not boost severity in `full` scope mode: all code is treated alike
- do not flag a config issue in a scoped mode unless `tsconfig.json` is in the diff
- do not download and execute a missing analysis tool before the operator approves it once at discovery
- do not run `npm install` or `npm uninstall` for analysis: use an approved pinned-major `npx -y` command, or record the pre-pass as skipped
- do not rename a report section, field, severity, confidence, or domain: `report_format` and `domains` hold exact identifiers
- do not start a wave before every pass of the previous wave is marked `done`, `pending`, or `failed` in the queue
- do not write a run file through a shell heredoc: an unbalanced quote leaves the shell waiting, so use the file tool or a script file
- do not read a finding from an agent reply: the `.jsonl` file under `code-smells/passes/` is the record, and a reply holds 1 line

outputs:
- `code-smells/report.md` in the project root: the scan report, and the work plan fix reads
- `code-smells/passes/`: the pass queue, the cached diagnostics, and 1 JSONL file per pass
- the scout agent file named in `pass_agent`, written once, after the operator answers the scout question
- `code-smells/knip.json`, `projects.json`, `co-change.md`, `cruise-summary.md`, `metrics.md`, and graph and diagram directories when Architecture is active
- `code-smells/suggested.dependency-cruiser.cjs` when prose declares dependency rules and no machine-readable declaration owns them
- the `## Architecture Opportunities` section of the report only when Architecture is active and at least 1 confirmed finding exists
- the audit trail in `code-smells/report.md` when any issue remains: BEFORE/AFTER for each fixed issue, a status tag for each failed, reverted, or skipped issue, the original entry for each untouched issue
- a regression test for each fix that is testable

run_modes:

| Run mode | The request says | What runs |
|---|---|---|
| `scan` | review, find issues, audit, scan, check | the analysis, then the report |
| `fix` | fix issues, fix the report, apply fixes, fix code smells | the fixes named in the report, with verification |
| `investigate` | investigate the report, why is this code this way | the verdict of each finding in the report, by `references/investigate.md` |
| `auto` | review and fix, auto-fix, scan and fix, clean up | scan, then investigate, then fix, then a re-scan |

domain_sets:
- read the explicit `--arch`, `--full`, and `--no-arch` flags in the request first, then the phrases below, then fall back to the default set
- Architecture is off in a default scan, and loads `references/architecture.md` only when it is active

| Flag or phrase | Active domains |
|---|---|
| none | the 9 default domains: Type Safety, Security, Async Patterns, Modernization, Code Quality, Config, Boundary Validation, Error Handling, Dependency Hygiene |
| `--arch`, review architecture, find refactoring opportunities, deepening review | Architecture only |
| `--full`, full audit, full review, review everything | all 10 domains |
| `--no-arch` | the 9 default domains, and it wins over any flag or phrase above |

scope_modes:

| Scope mode | The request says |
|---|---|
| `full` | review my code, audit the project, find issues, with no qualifier |
| `uncommitted` | review my changes, check uncommitted, what I changed |
| `branch` | review my PR, review my branch, diff against main |
| `commits:N` | review last commit, check last 3 commits, what did I break |

domains:

| Domain | Reference file | Focus |
|---|---|---|
| Type Safety | `references/type-safety.md` | `any`, casts, `!`, exhaustiveness, generics |
| Security | `references/security.md` | injection, prototype pollution, ReDoS, path traversal |
| Async Patterns | `references/async-patterns.md` | floating promises, race conditions, error propagation |
| Modernization | `references/modernization.md` | patterns below `target_stack` |
| Code Quality | `references/code-quality.md` | complexity, duplication, naming, dead code, testability |
| Config | `references/tsconfig.md` | `tsconfig.json` flags and module setup |
| Boundary Validation | `references/boundary-validation.md` | runtime validation at system edges, DTO and domain separation |
| Error Handling | `references/error-handling.md` | silent failures, throw hygiene, failure design |
| Dependency Hygiene | `references/dependency-hygiene.md` | `package.json`, versions, lockfiles, supply chain |
| Architecture | `references/architecture.md` | shallow modules, scattered concepts, coupling, dependency seams, layering |

workflow:
1. identify the run mode from `run_modes`
2. identify the active domain set from `domain_sets`
3. identify the scope mode from `scope_modes`, and default to `full` when the request names none
4. build the file list with the command in `scope_commands` for that scope mode
5. ask whether to fall back to `full` when a scoped mode yields 0 files
6. ask once whether to resume or restart when `code-smells/passes/queue.md` exists, and delete `code-smells/passes/` on restart
7. warn when the `HEAD` in the queue header differs from the current `HEAD` on a resume: the line re-read below catches a stale line
8. map the project tree in full, whatever the scope mode
9. read `tsconfig.json` and `references/tsconfig.md`, then audit the config flags
10. detect monorepo workspaces in `package.json` and `pnpm-workspace.yaml`, and every further tsconfig
11. audit the config that governs the files in scope, and name that config in the summary
12. read the linter config: `eslint.config.*`, `.eslintrc.*`, `biome.json`, `deno.json`
13. read `package.json` for the dependencies and the module type, and verify the TypeScript version, `engines.node`, and `@types/node` against `target_stack`
14. identify declared entry points from `package.json#exports`, `main`, `bin`, and the `start`, `dev`, and `serve` scripts
15. count the markers `hot_marker` in `references/stack-cost.md` defines across the files in scope, and name the count in the discovery summary
16. ask once before a pinned-major `npx -y` run: the skill lint always, Knip and dependency-cruiser when Architecture is active and missing locally
17. collect the context files named in `scope:` when the scope mode is scoped
18. identify feature slices and public entry points when Architecture is active, leaving graph discovery to its mechanical pre-pass
19. collect machine-readable dependency rules and prose from ADR directories, `ARCHITECTURE.md`, README, and `CONTRIBUTING.md`
20. run `npx tsc --noEmit 2>&1 | head -200` over the full project into `code-smells/passes/tsc.log`, and report only the errors in the scoped files
21. run the linter into `code-smells/passes/lint.json`: `npx eslint [files] --format json` or `npx biome check [files] --reporter json`
22. reuse `tsc.log` and `lint.json` on a resume when the queue `HEAD` matches and the tree is clean, and rerun both otherwise
23. query the TypeScript LSP over MCP when it is reachable, then merge and deduplicate against the compiler output
24. triage every compiler and linter diagnostic through `severity_mapping`
25. read the reference file named in `domains` before each analysis pass
26. run the mechanical pre-pass in `references/architecture.md` when Architecture is active, passing the approved tool decision and scoped base
27. report the discovery summary in the shape of `discovery_summary`, including skipped and clean mechanical results
28. build the pass list: 1 pass per `pass_groups` row holding an active domain, with the files of its rule, split at the first directory level that leaves every part at <= 20 files
29. write `code-smells/passes/queue.md` in the shape of `pass_queue`, in its domain order, and skip a pass marked `done` on a resume
30. run the pending passes in waves of the wave size, as sub-agents shaped by `subagent_template`, or in the main agent when the wave size is 1
31. wait for every agent of a wave, then mark each pass `done` when the last line of its file is the `done` line, and `pending` otherwise
32. mark a pass `failed` after 2 attempts without a `done` line, name it in the discovery summary, and report its domains as not run
33. run `tools/check-passes.mjs` once after the last wave, then read the findings of every `done` pass from its `.jsonl` file
```bash
SKILL=<the directory this file was loaded from>
node "$SKILL/tools/check-passes.mjs" --refs "$SKILL/references" --dir code-smells/passes
```
34. re-read the exact lines in the current file state before a finding enters the report, and settle each severity `check-passes.mjs` prints against its check line
35. read the callers to verify a data flow a finding rests on, or mark its problem statement with "if <condition>" and cap its severity at Medium
36. downgrade a flagged non-High pattern that appears 5+ times across the codebase by 1 level, and report it once as a Recurring Pattern
37. boost a finding carrying `in_diff: true` by 1 level in a scoped mode, and mark it `High [boosted, was Medium — new code]`
38. deduplicate the findings on the same file, line, and issue, keeping 1
39. merge every finding on the same file and line into 1 entry, attributing each category raised and naming each issue, at the higher severity
40. consolidate 3+ identical issues into 1 Recurring Pattern entry
41. keep the top 15 by severity and impact when a single domain produces more than 25 Medium or Low findings, and consolidate the rest into Recurring Pattern entries with their counts, 1 entry per `check` line
42. keep a finding whose `hot` is not `no` and whose `fix_cost` is not `none` as a full entry carrying the `Hot path` line, whatever its severity
43. keep that finding out of every summary table and every Recurring Pattern entry, whatever steps 36, 40, and 41 do with its siblings: fix mode needs its snippet to design the fix
44. write `code-smells/report.md` in the shape of `report_format`
45. validate the report against `report_format` after writing it, and treat a `warning:` line as a pre-pass outcome the report cannot correct
```bash
# SKILL is the directory this file was loaded from.
SKILL=<the directory this file was loaded from>
node "$SKILL/tools/validate-report.mjs" --repo . --report code-smells/report.md
```
46. correct every named error and retry with report validation iterations <= 2
47. keep `code-smells/report.md` when the second validation fails, write `> unvalidated: <the first error>` under its title, and name the errors to the operator
48. sort by severity group, then category, then file path, and place `in_diff: true` before pre-existing in a scoped mode
49. show the top 10 and summarize the rest in a table when Medium and Low together hold more than 15 issues
50. recommend that the operator adds `code-smells/` to `.gitignore`: it holds review artifacts
51. read `references/investigate.md` and `references/stack-cost.md` in investigate mode, and in auto mode after the scan summary
52. decide the verdict of each `###` finding as `references/investigate.md` states, and write it as the `Verdict` line of the entry
53. validate the report with the command of step 45 once every verdict is written
54. read `references/fix-workflow.md` before fix mode executes: it holds the complete protocol
55. detect the test runner and run the baseline tests
56. fix the issues file by file, and run `tsc --noEmit` after each file
57. run the linter and fix the lint errors it reports
58. run the full test suite, compare it against the baseline, and fix the regressions
59. repeat the compiler, linter, and test verification with verification iterations <= 5
60. rerun the Architecture mechanical pre-pass on the fixed tree when Architecture is active
61. update `code-smells/report.md`: remove what is fixed, mark what failed
62. show the scan summary in auto mode, and ask the operator whether to proceed with the fix
63. re-scan after the fix in auto mode with full scan-fix cycles <= 2, and stop when issues persist after the second
64. delete `code-smells/report.md` and report success when every issue is fixed
65. retain the remaining `code-smells/` artifacts, state what they contain, and remove them only after the operator confirms

scope_commands:
```bash
# full — every TypeScript file
npx glob '**/*.{ts,mts,cts}' --ignore '**/node_modules/**'
# or: git ls-files '*.ts' '*.mts' '*.cts'

# uncommitted — staged, unstaged, and untracked
BASE=HEAD
git diff --name-only HEAD -- '*.ts' '*.mts' '*.cts'
git ls-files --others --exclude-standard -- '*.ts' '*.mts' '*.cts'

# branch — the current branch against its base
BASE=$(git rev-parse --verify main 2>/dev/null && echo main || echo master)
git diff --name-only "$BASE"...HEAD -- '*.ts' '*.mts' '*.cts'
git diff --name-only HEAD -- '*.ts' '*.mts' '*.cts'

# commits:N — the last N commits
BASE=HEAD~N
git diff --name-only HEAD~N..HEAD -- '*.ts' '*.mts' '*.cts'

# the changed hunks, for the severity boost in a scoped mode
git diff -U0 <range> -- '*.ts' '*.mts' '*.cts' | grep '^@@'
```

severity_scale:
- these are the base severities in a scoped mode, before the boost
- a finding on an unchanged line keeps its severity: it is pre-existing tech debt, and it is informational
- an Architecture finding uses this scale with the criteria in the `severity_mapping` block of `references/architecture.md`

| Severity | Criteria | Examples |
|---|---|---|
| Highest | active bugs, security vulnerabilities, data loss | SQL injection, uncaught rejection, lying type predicate |
| High | bugs waiting to happen, edge-case failures | missing null check, `as` hiding a mismatch, floating promise |
| Medium | tech debt to clean up in context | `any` internally, missing exhaustive check, complex function |
| Low | style, to improve when convenient | naming, missing `readonly`, verbose type |

severity_mapping:
- every compiler output line is an error: the TypeScript compiler emits no warnings
- map the linter severities conservatively: a project configures stylistic rules as `error`

| Diagnostic | Severity |
|---|---|
| a compiler error naming a runtime hazard: null or undefined access, wrong argument shape, missing property | Highest |
| a compiler hygiene error: unused local, unreachable code, implicit `any` on an internal | High |
| a linter rule matching a checklist item in a reference file | the checklist severity |
| a correctness-class linter rule: `no-floating-promises`, `no-misused-promises`, `no-unsafe-*` | High |
| any other linter `error` | Medium |
| any other linter `warning` or `info` | Low |

discovery_summary:
```
Project: <n>
Scope: full / uncommitted / branch (vs <base>) / commits:<N>
Stack: matches target_stack / deviates: <every pinned value that differs, of TS version, target, lib, module, moduleResolution, engines.node>
Module system: ESM / CJS
Strict mode: yes / partial / no
Linter: eslint / biome / none
Test runner: vitest / jest / mocha / node:test / none
Hot paths: <N> marked / none: hot rests on loop bodies alone
Files in scope: <N> .ts files (+ <M> context files)
Excluded framework packages: <package names, or none>
Agents per wave: <N>
Main agent: <model>
Pass agent: ts-reviewer-scout <model> <effort> / the default sub-agent; Architecture on the main agent
Skill lint: <N> findings / declined / failed: <reason>
Filtered passes: <group> <matched>/<scoped> files, or none
Resumed: <done>/<total> passes from code-smells/passes/queue.md, or no
Architecture projects: <config and source roots, when active>
Architecture tools: <local or approved npx versions, when active>
Architecture coverage: <successful>/<selected>, when active
Mechanical results: <module and edge counts, cycles, orphans, and co-change pairs; name clean zeros>
Skipped pre-passes: <tool and reason, or none>
Speculative candidates: <names only, or none>
Declared dependency rules:
| Rule | Source file:line | Directories |
|---|---|---|
| <rule, or none> | <path:line> | <mapping> |
```

subagent_template:
```
You are a specialized TypeScript reviewer focused on [DOMAINS].
Target stack: TypeScript 5.9.x, target and lib ES2024, Node 24, ESM under nodenext, tsc emitting JavaScript that Node runs — never recommend anything outside it.
Read each reference checklist: [REFERENCE_PATHS]
Read the cost slots: [STACK_COST_PATH], then fill `hot` and `fix_cost` for every finding.
Write `fix` as a change after which a rescan would not raise the finding again, whatever it costs, and fill `fix_cost` for that change: on a hot path, fix mode designs a cheaper one.
Report a pattern even when a test, a commit, or a decision record suggests it is deliberate: only a comment at the site drops it.
Skip every checklist line carrying "lint-owned by" when this reads yes: [SKILL_LINT_RAN]
Write the problem of a finding whose data flow leaves these files as "if <condition>": the main agent reads the callers.
Review these files: [FILE_LIST]
Context files (read-only, do NOT report issues): [CONTEXT_FILE_LIST]
Scope mode: [full|uncommitted|branch|commits:N]
Write every finding as 1 JSONL line to: [OUTPUT_PATH]
Write that file with your file-writing tool, never a shell heredoc: an unbalanced quote leaves the shell waiting.
Append 1 last line when every file is reviewed: {"done": true, "findings": N, "files": M}
Reply with 1 line: the pass id, the findings count, the files count. The file is the result; the reply is not.

Output JSONL, one object per line:
{
  "category": "[1 domain name of [DOMAINS], written exactly as there: the domain whose checklist names the pattern]",
  "severity": "highest|high|medium|low",
  "title": "Short descriptive title",
  "file": "relative/path.ts",
  "line": 42,
  "check": "the reference file and line of the checklist line applied, as boundary-validation.md:11",
  "snippet": "3-7 lines of code",
  "problem": "One-sentence explanation",
  "fix": "Concrete recommendation with code example",
  "auto_fixable": true|false,
  "hot": "yes|no|unknown",
  "fix_cost": "none|alloc|pass|check|async",
  "in_diff": true|false,
  "reference": "optional — omit unless the forbidden_behaviors allow it"
}
```

pass_queue:
- `--agents N` in the request sets the wave size, and the default is 3
- `--agents 1` runs 1 pass at a time in the main agent, with no sub-agent
- the pass id is the group id of `pass_groups`, or `<group id>.<directory slug>` for a split pass
- the pass order is the row order of `pass_groups`, after the row `lint-skill` of `skill_lint`
- a queue holding a pass id absent from `pass_groups` predates pass groups: restart it without the resume ask
- a status is `pending`, `done`, or `failed`, and `Attempts` counts the waves the pass ran in
```markdown
# Pass queue

HEAD: <sha>
Scope: <mode>
Agents per wave: <N>

| Pass | Domains | Files | Status | Attempts | Findings |
|---|---|---|---|---|---|
| security | Security | 42 | done | 1 | 7 |
| type-safety+boundary-validation.src-auth | Type Safety, Boundary Validation | 12 | pending | 1 | |
```

pass_groups:
- a group runs its active domains in 1 pass: the agent reads each reference, and a finding keeps the category of the domain that raised it
- the group id joins the domain slugs with `+`
- every pass reads the shared types as context, whatever the files of its rule
- a filtered group takes the scoped files that the `workflow:` command of any of its references lists
- a filtered group takes every scoped file when the skill lint did not run and the project linter enables no `no-floating-promises`

| Group | Domains | Files |
|---|---|---|
| `security` | Security | every scoped file |
| `type-safety+boundary-validation` | Type Safety, Boundary Validation | every scoped file |
| `async-patterns+error-handling` | Async Patterns, Error Handling | filtered |
| `config+dependency-hygiene` | Config, Dependency Hygiene | no `.ts` file: the project files each reference reads |
| `modernization+code-quality` | Modernization, Code Quality | every scoped file |
| `architecture` | Architecture | the inputs `references/architecture.md` names |

pass_agent:
- every group runs as the `ts-reviewer-scout` agent when the scout file exists, except `architecture`, which runs as the default sub-agent on the main agent's model
- the scout file is `.claude/agents/ts-reviewer-scout.md` on Claude Code and `.codex/agents/ts-reviewer-scout.toml` on Codex, in the project root
- ask once for the scout model and effort when the scout file is absent, and write the answer to it
- offer the models the host's agent call lists, or take the name the operator types when the host lists none
- the answer "the main agent's model" writes `inherit` on Claude Code and leaves `model` out on Codex
- pass the scout model, and the effort where the call takes one, in each agent call: a host can load a new agent file late
- `--scout <model>` in the request wins for 1 run: every group but `architecture` runs as the default sub-agent on that model, no scout file is written, and no scout question is asked
- a run with no operator answer writes no scout file and runs every group as the default sub-agent
- a host with no scout file format runs every group as the default sub-agent

skill_lint:
- the config is `tools/eslint.config.mjs` in this skill: ESLint core rules and typescript-eslint rules, pinned by the command below
- a reference line carrying "lint-owned by" names the rule that finds its pattern, and no analysis pass reads that line while the skill lint runs
- `ts/` in an owner stands for `@typescript-eslint/`, and an id after a colon names the 1 message of the rule that the line owns
- a lint finding carries `hot: unknown` and `fix_cost: none`, and the main agent sets both by `references/stack-cost.md` only in a file holding a hot marker
- keep the title and the fix of a lint finding as written: its owner line holds a concrete fix, and the re-read checks only that the snippet stands at its line
- add `--in-diff` to the `lint-pass.mjs` command in a scoped mode: the skill lint reads the scoped files only
- run it after step 21, and write its findings as the pass `lint-skill` with `tools/lint-pass.mjs`, which takes category, severity, and fix from the owning line
- a declined or failed run marks the pass `lint-skill` failed, and every analysis pass keeps the lint-owned lines
- the skill lint replaces no project linter: step 21 runs the project config as before
```bash
SKILL=<the directory this file was loaded from>
npx -y -p eslint@10 -p typescript-eslint@8 -p typescript@5.9 eslint -c "$SKILL/tools/eslint.config.mjs" --format json [files] 2>/dev/null > code-smells/passes/lint-skill.json
node "$SKILL/tools/lint-pass.mjs" --refs "$SKILL/references" --lint code-smells/passes/lint-skill.json --out code-smells/passes/lint-skill.jsonl
```

report_format:
- the `##` sections of the block below are the whole set, in that order, and a heading outside it is a renamed section
- Discovery, Pre-existing Issues, Architecture Opportunities, Verification, and Generated artifacts are optional, and the other 5 are always present
- `Total issues` counts the `###` findings, the summary-table rows, and the Architecture Opportunities entries, and the severity breakdown counts the same 3
- a `Recurring Patterns` row is a pattern rather than an issue: no row of that table is counted, and a member counts only where it also stands as an issue
- a summary table is read by its `Category` and `Location` columns, and a pattern table by its `Pattern` and `Occurrences` columns
- the `Hot path` line is present on a finding whose `hot` is not `no` and whose `fix_cost` is not `none`, and absent on every other finding
- the `Verdict` line is present on every `###` finding once investigate mode has run, and absent on every finding before it
````markdown
# TypeScript Code Review Report

**Project:** <n>
**Reviewed:** <date>
**Stack:** TypeScript 5.9.x / ES2024 / Node 24 — matches / <deviation>
**Scope:** Full / Uncommitted / Branch `x` vs `y` / Last N commits
**Files analyzed:** N (+ M context)
**Architecture coverage:** N/M (when active)
**Total issues:** N (X highest, Y high, Z medium, W low)
**Severity-boosted:** N (scoped modes only)

## Summary

<2-3 sentences on codebase health and key patterns>

## Discovery

<optional; the `discovery_summary` block as it was reported>

## Highest + High Issues

### TITLE — Severity [boosted info if applicable]

**Category:** cat | **File:** `path` | **Line:** N | **Auto-fixable:** Yes/No | **New code:** Yes/No
**Hot path:** yes/unknown | **Fix cost:** alloc/pass/check/async
**Verdict:** defect/deliberate-recorded/deliberate-unrecorded/unreachable/unknown | **Evidence:** <source> <pointer>/none

```typescript
// snippet: 3-7 lines copied from the file, within its own length of the stated line
```

**Problem:** explanation
**Fix:** recommendation with code
**Reference:** link

---

## Medium Issues
## Low Issues

| Issue | Category | Location | Fix |
|---|---|---|---|
| title | cat | `path:N` | recommendation |

## Recurring Patterns

| Pattern | Occurrences | Severity treatment |
|---|---|---|
| name | N | what happened to its members |

## Config Issues

<findings in the shape above, or prose naming where the config findings already sit>

## Pre-existing Issues (scoped modes only)

## Architecture Opportunities

<optional; 1 entry per candidate, in the shape the `report_format` block of references/architecture.md gives>

## Verification

| Check | Result |
|---|---|
| the command that ran | what it reported |

## Generated artifacts

- `<file under code-smells/>` — what it holds

---
````

invocation:
- any agent: state the request in plain language, for example `review my TypeScript code` or `fix the report`
- add `--arch` or `--full` to that request to change the domain set
