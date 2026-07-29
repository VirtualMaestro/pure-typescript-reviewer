---
name: ts-reviewer
description: >
  TypeScript code review and auto-fix. Modes: scan, fix, auto. Scopes: full codebase,
  uncommitted, branch diff, last N commits. Trigger on: review, audit, check, lint,
  find issues, find bugs, fix issues, fix code smells, auto-fix, review and fix,
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
- the request, which carries the run mode, the domain set, and the scope mode
- the project `tsconfig.json`, `package.json`, and linter config
- the reference checklists under `references/`

preconditions:
- `code-smells.md` exists before fix mode runs: it is the work plan, and fix stops with an error when it is absent

scope:
- `.ts`, `.mts`, and `.cts` files are reviewed alike
- `.d.ts` files are reviewed by the Type Safety and Config domains only: a declaration has no runtime behavior
- `.tsx` is out of scope
- the analysis scope in a scoped mode is the diff file list, and the reading scope is wider
- read as read-only context: `tsconfig.json`, the configs it extends, and `package.json`
- read as read-only context: the files the scoped files import 1 level deep, and the shared types in `types.ts`, `*.d.ts`, `interfaces/`, `shared/`

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
- do not cite a link outside typescriptlang.org, developer.mozilla.org, and nodejs.org, or a path inside this skill: omit the `reference` field instead
- do not build a link from memory
- do not recommend anything outside `target_stack`
- do not justify a ban by naming the version that introduced the replacement: the stack is fixed
- do not emit the same file and line twice
- do not boost severity in `full` scope mode: all code is treated alike
- do not flag a config issue in a scoped mode unless `tsconfig.json` is in the diff

outputs:
- `code-smells.md` in the project root: the scan report, and the work plan fix reads
- the `## Architecture Opportunities` section of that report, only when Architecture is active and at least 1 candidate is found
- the audit trail in `code-smells.md` when any issue remains: BEFORE/AFTER for each fixed issue, a status tag for each failed, reverted, or skipped issue, the original entry for each untouched issue
- a regression test for each fix that is testable

run_modes:

| Run mode | The request says | What runs |
|---|---|---|
| `scan` | review, find issues, audit, scan, check | the analysis, then the report |
| `fix` | fix issues, fix the report, apply fixes, fix code smells | the fixes named in the report, with verification |
| `auto` | review and fix, auto-fix, scan and fix, clean up | scan, then fix, then a re-scan |

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
6. map the project tree in full, whatever the scope mode
7. read `tsconfig.json` and `references/tsconfig.md`, then audit the config flags
8. detect monorepo workspaces in `package.json` and `pnpm-workspace.yaml`, and every further tsconfig
9. audit the config that governs the files in scope, and name that config in the summary
10. read the linter config: `eslint.config.*`, `.eslintrc.*`, `biome.json`, `deno.json`
11. read `package.json` for the dependencies and the module type, and verify the TypeScript version, `engines.node`, and `@types/node` against `target_stack`
12. identify the entry points: `index.ts`, `main.ts`, the `exports` of `package.json`
13. collect the context files named in `scope:` when the scope mode is scoped
14. map the module relationships when Architecture is active: circular imports, deep relative imports, barrel-file cycles, feature slices, public entry points
15. scan `docs/adr/` for architectural decisions before proposing a change, and skip it silently when the directory is absent
16. report the discovery summary in the shape of `discovery_summary`
17. run `npx tsc --noEmit 2>&1 | head -200` over the full project, and report only the errors in the scoped files
18. run the linter: `npx eslint [files] --format json` or `npx biome check [files] --reporter json`
19. query the TypeScript LSP over MCP when it is reachable, then merge and deduplicate against the compiler output
20. triage every compiler and linter diagnostic through `severity_mapping`
21. read the reference file named in `domains` before each analysis pass
22. run only the passes whose domain is in the active domain set, as sub-agents shaped by `subagent_template` or one domain at a time
23. give every agent all the scoped files when scoped files <= 20, and split by directory above that, with the shared types visible to every agent
24. re-read the exact lines in the current file state before a finding enters the report
25. read the callers to verify a data flow a finding rests on, or mark its problem statement with "if <condition>" and cap its severity at Medium
26. downgrade a flagged non-High pattern that appears 5+ times across the codebase by 1 level, and report it once as a Recurring Pattern
27. boost a finding carrying `in_diff: true` by 1 level in a scoped mode, and mark it `High [boosted, was Medium — new code]`
28. deduplicate the findings on the same file, line, and issue, keeping 1
29. merge the findings 2 domains raise on the same file and line into 1 entry attributing both categories, at the higher severity
30. consolidate 3+ identical issues into 1 Recurring Pattern entry
31. keep the top 15 by severity and impact when a single domain produces more than 25 Medium or Low findings, and consolidate the rest into Recurring Pattern entries with their counts
32. write `code-smells.md` in the shape of `report_format`
33. sort by severity group, then category, then file path, and place `in_diff: true` before pre-existing in a scoped mode
34. show the top 10 and summarize the rest in a table when Medium and Low together hold more than 15 issues
35. recommend that the operator adds `code-smells.md` to `.gitignore`: it is a review artifact
36. read `references/fix-workflow.md` before fix mode executes: it holds the complete protocol
37. detect the test runner and run the baseline tests
38. fix the issues file by file, and run `tsc --noEmit` after each file
39. run the linter and fix the lint errors it reports
40. run the full test suite, compare it against the baseline, and fix the regressions
41. repeat the compiler, linter, and test verification with verification iterations <= 5
42. update `code-smells.md`: remove what is fixed, mark what failed
43. show the scan summary in auto mode, and ask the operator whether to proceed with the fix
44. re-scan after the fix in auto mode with full scan-fix cycles <= 2, and stop when issues persist after the second
45. delete `code-smells.md` and report success when every issue is fixed

scope_commands:
```bash
# full — every TypeScript file
npx glob '**/*.{ts,mts,cts}' --ignore '**/node_modules/**'
# or: git ls-files '*.ts' '*.mts' '*.cts'

# uncommitted — staged, unstaged, and untracked
git diff --name-only HEAD -- '*.ts' '*.mts' '*.cts'
git ls-files --others --exclude-standard -- '*.ts' '*.mts' '*.cts'

# branch — the current branch against its base
BASE=$(git rev-parse --verify main 2>/dev/null && echo main || echo master)
git diff --name-only "$BASE"...HEAD -- '*.ts' '*.mts' '*.cts'
git diff --name-only HEAD -- '*.ts' '*.mts' '*.cts'

# commits:N — the last N commits
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
Files in scope: <N> .ts files (+ <M> context files)
```

subagent_template:
```
You are a specialized TypeScript reviewer focused on [DOMAIN].
Target stack: TypeScript 5.9.x, target and lib ES2024, Node 24, ESM under nodenext, tsc emitting JavaScript that Node runs — never recommend anything outside it.
Read the reference checklist: [REFERENCE_PATH]
Review these files: [FILE_LIST]
Context files (read-only, do NOT report issues): [CONTEXT_FILE_LIST]
Scope mode: [full|uncommitted|branch|commits:N]

Output JSONL, one object per line:
{
  "category": "[DOMAIN]",
  "severity": "highest|high|medium|low",
  "title": "Short descriptive title",
  "file": "relative/path.ts",
  "line": 42,
  "snippet": "3-7 lines of code",
  "problem": "One-sentence explanation",
  "fix": "Concrete recommendation with code example",
  "auto_fixable": true|false,
  "in_diff": true|false,
  "reference": "optional — omit unless the forbidden_behaviors allow it"
}
```

report_format:
````markdown
# TypeScript Code Review Report

**Project:** <n>
**Reviewed:** <date>
**Stack:** TypeScript 5.9.x / ES2024 / Node 24 — matches / <deviation>
**Scope:** Full / Uncommitted / Branch `x` vs `y` / Last N commits
**Files analyzed:** N (+ M context)
**Total issues:** N (X highest, Y high, Z medium, W low)
**Severity-boosted:** N (scoped modes only)

## Summary

<2-3 sentences on codebase health and key patterns>

## Highest + High Issues

### TITLE — Severity [boosted info if applicable]

**Category:** cat | **File:** `path` | **Line:** N | **Auto-fixable:** Yes/No | **New code:** Yes/No

```typescript
// snippet
```

**Problem:** explanation
**Fix:** recommendation with code
**Reference:** link

---

## Medium Issues
## Low Issues
## Recurring Patterns
## Config Issues
## Pre-existing Issues (scoped modes only)

## Architecture Opportunities

### TITLE — Severity

- **Files:** relative/path/a.ts, relative/path/b.ts
- **Problem:** why this causes friction now
- **Proposed deepening:** what would change
- **Interface shape:** rough sketch of new interface
- **Dependency category:** in-process | local-substitutable | remote-owned | true-external
- **Test strategy:** how tests improve
- **Benefits:** locality, leverage, test impact
- **Trade-offs:** what gets harder
- **Fixability:** auto | needs-confirm | report-only

---
````

invocation:
- any agent: state the request in plain language, for example `review my TypeScript code` or `fix the report`
- add `--arch` or `--full` to that request to change the domain set
