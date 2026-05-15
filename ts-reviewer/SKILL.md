---
name: ts-reviewer
description: >
  TypeScript code review and auto-fix. Modes: scan, fix, auto. Scopes: full codebase,
  uncommitted, branch diff, last N commits. Trigger on: review, audit, check, lint,
  find issues, find bugs, fix issues, fix code smells, auto-fix, review and fix,
  clean up code, tech debt, code health, security audit, modernize, review my changes,
  review my PR, review last commit. Architecture review: --arch, --full, review architecture,
  find refactoring opportunities, full audit. Pure TypeScript 5.9+ only.
---

# TypeScript Code Reviewer

A comprehensive, multi-pass code reviewer and auto-fixer for pure TypeScript 5.9+ codebases.

## Modes

This skill operates in three modes. Detect the mode from the user's request:

| User says | Mode |
|---|---|
| "review", "find issues", "audit", "scan", "check" | `scan` |
| "fix issues", "fix the report", "apply fixes", "fix code smells" | `fix` |
| "review and fix", "auto-fix", "scan and fix", "clean up" | `auto` |

**`scan`** — Analyze the codebase and write a report to `code-smells.md`.
**`fix`** — Read `code-smells.md` and apply fixes with verification.
**`auto`** — Run scan, then fix, then re-scan to verify. Delete report if clean.

## Domain Set

Controls which review domains are active. Detected from flags first, then natural-language phrases.

| Flag / phrase | Active domains |
|---|---|
| (none / default) | Type Safety, Security, Async Patterns, Modernization, Code Quality, Config |
| `--arch` / "review architecture" / "find refactoring opportunities" / "deepening review" | Architecture only |
| `--full` / "full audit" / "full review" / "review everything" | All 7 domains (default 6 + Architecture) |

Parse order: check for explicit `--arch` / `--full` / `--no-arch` flags in the user's message first.
Fall back to phrase detection. If no flag or phrase matches → default domain set (no architecture).

Architecture domain is **off** in default scans. It loads `references/architecture.md` and adds
an `## Architecture Opportunities` section to `code-smells.md` only when active.

## Report File Location

- Always write to `code-smells.md` in the project root (not in `.claude/`)
  This ensures the skill works in non-Claude environments and the file is visible regardless of tooling.
- Recommend the user adds `code-smells.md` to `.gitignore` — it's a review artifact

---

## High-Level Workflows

### scan

```
Phase 1: Discovery    -> understand project structure, config, scope
Phase 2: Diagnostics  -> run tsc, linters, collect machine-reported issues
Phase 3: Analysis     -> spin up specialized sub-agents (or run sequentially)
Phase 4: Report       -> deduplicate, rank, write code-smells.md
```

### fix

Read `references/fix-workflow.md` before executing fix mode.

```
Step 1: Read code-smells.md (must exist — error if missing)
Step 2: Detect test runner, run baseline tests
Step 3: Fix issues file-by-file, write regression tests, run tsc after each file
Step 4: Run linter, fix lint errors
Step 5: Run full test suite, compare with baseline, fix regressions
Step 6: Verification loop — repeat tsc + lint + tests up to 5 iterations
Step 7: Update code-smells.md (remove fixed, mark failed)
        Do NOT commit, do NOT stage
```

### auto

```
1. Run scan -> writes code-smells.md
2. Show summary to user, ask "proceed with fix?"
3. If yes -> run fix (reads references/fix-workflow.md for full protocol)
4. If ALL issues fixed -> delete code-smells.md, report success
5. If some remain -> code-smells.md stays as audit trail (fixed + remaining)
Max 2 full scan-fix cycles. If issues persist after 2 cycles, stop.
```

---

## Scope Modes

The reviewer supports four scope modes. Detect the mode from the user's request.
If not specified, default to **full codebase**.

| User says | Scope mode |
|---|---|
| "review my code", "audit the project", "find issues" (no qualifier) | `full` |
| "review my changes", "check uncommitted", "what I changed" | `uncommitted` |
| "review my PR", "review my branch", "diff against main" | `branch` |
| "review last commit", "check last 3 commits", "what did I break" | `commits:N` |

### Git commands per scope

**`full`** — all `.ts` files:
```bash
npx glob '**/*.ts' --ignore '**/node_modules/**'
# or: git ls-files '*.ts'
```

**`uncommitted`** — staged + unstaged + untracked:
```bash
git diff --name-only HEAD -- '*.ts'
git ls-files --others --exclude-standard -- '*.ts'
```

**`branch`** — current branch vs base:
```bash
BASE=$(git rev-parse --verify main 2>/dev/null && echo main || echo master)
git diff --name-only "$BASE"...HEAD -- '*.ts'
git diff --name-only HEAD -- '*.ts'
```

**`commits:N`** — last N commits:
```bash
git diff --name-only HEAD~N..HEAD -- '*.ts'
```

### Context files (scoped reviews)

Analysis scope = diff file list. Reading scope = wider. Always include as read-only:

1. `tsconfig.json` (and extended configs)
2. Files imported by scoped files (one level deep)
3. Shared type definitions (`types.ts`, `*.d.ts`, `interfaces/`, `shared/`)
4. `package.json`

Context files are NOT analyzed for issues.

### Diff-aware severity boost (scoped modes only)

Collect changed hunks:
```bash
git diff -U0 [appropriate range] -- '*.ts' | grep '^@@'
```

- Issue on **new/modified line**: boost severity +1 (Low→Medium, Medium→High, High→Highest)
- Issue on **unchanged line**: keep original severity (pre-existing tech debt)
- Mark boosted issues: `High [boosted, was Medium — new code]`
- In `full` mode: no boost, all code treated equally

---

## Phase 1 — Discovery (scan mode)

1. **Detect domain set** from flags and phrases (see Domain Set section above).

2. **Detect scope mode** from user's request. Build file list.
   If scoped mode yields 0 files, ask whether to fall back to full.

3. **Map project tree** — full structure regardless of scope.

4. **Read `tsconfig.json`**. Load `references/tsconfig.md` and audit config flags.
   In scoped modes: only flag config if `tsconfig.json` is in diff or if full review.

5. **Check for linter configs** — `eslint.config.*`, `.eslintrc.*`, `biome.json`, `deno.json`.

6. **Read `package.json`** — TS version, dependencies, module type.

7. **Identify entry points** — `index.ts`, `main.ts`, exports in `package.json`.

8. **Collect context files** (scoped modes only).

9. **Architecture discovery** (only if Architecture is in active domain set):
   - Map module relationships: note circular imports, deep relative imports, barrel-file cycles, feature slices, public entry points.
   - Check if `docs/adr/` exists — if so, scan it for architectural decisions before proposing changes. Skip silently if absent.
   - Do NOT require `CONTEXT.md` or any domain-doc files.

Discovery summary:
```
Project: <n>
Scope: full / uncommitted / branch (vs <base>) / commits:<N>
TS version: <version>
Module system: ESM / CJS
Strict mode: yes / partial / no
Linter: eslint / biome / none
Test runner: vitest / jest / mocha / node:test / none
Files in scope: <N> .ts files (+ <M> context files)
```

---

## Phase 2 — Diagnostics (scan mode)

### 2a. TypeScript compiler

```bash
npx tsc --noEmit 2>&1 | head -200
```

Compiler errors -> **Highest**. Warnings -> **High**.
In scoped modes: run on full project, report only errors in scoped files.

### 2b. Linter

ESLint: `npx eslint [files] --format json 2>/dev/null | head -500`
Biome: `npx biome check [files] --reporter json 2>/dev/null | head -500`

Map: `error` -> **High**, `warning` -> **Medium**, `info` -> **Low**.

### 2c. LSP diagnostics (if available)

Query TypeScript LSP via MCP if accessible. Merge with compiler output, deduplicate.

---

## Phase 3 — Analysis (scan mode)

Read the corresponding reference file before each analysis pass.

Run only the agents whose domain is in the active domain set (see Domain Set section).

| Agent | Reference file | Focus |
|---|---|---|
| Type Safety | `references/type-safety.md` | `any`, casts, `!`, exhaustiveness, generics |
| Security | `references/security.md` | Injection, prototype pollution, ReDoS, path traversal |
| Async Patterns | `references/async-patterns.md` | Floating promises, race conditions, error propagation |
| Modernization | `references/modernization.md` | Outdated patterns vs TS 5.9+ idioms |
| Code Quality | `references/code-quality.md` | Complexity, duplication, naming, dead code |
| Config | `references/tsconfig.md` | tsconfig.json flags and module setup |
| Architecture | `references/architecture.md` | Shallow modules, scattered concepts, coupling, dependency seams, testability |

### Sub-agent template (Claude Code)

```
You are a specialized TypeScript reviewer focused on [DOMAIN].
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
  "reference": "URL or docs ref"
}
```

### Sequential mode (no sub-agents)

Go through each domain one at a time. Same JSON structure.

### File batching

- <= 20 scoped files: each agent reviews all files
- > 20 files: split by directory, ensure shared types visible to all agents

---

## Phase 4 — Report (scan mode)

### Processing

1. Apply severity boost (scoped modes only): `in_diff: true` -> boost +1 level.
2. Deduplicate: same file + line + issue -> keep one.
3. Merge overlapping: keep higher severity, note overlap.
4. Consolidate patterns: 3+ identical issues -> one "Recurring Pattern" entry.

### Report structure

Write to `code-smells.md`:

````markdown
# TypeScript Code Review Report

**Project:** <n>
**Reviewed:** <date>
**TypeScript version:** <version>
**Scope:** Full / Uncommitted / Branch `x` vs `y` / Last N commits
**Files analyzed:** N (+ M context)
**Total issues:** N (X critical, Y high, Z medium, W low)
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
(only when Architecture is in active domain set AND at least one candidate found — omit entirely otherwise)

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

### Sorting

1. By severity group, then category, then file path.
2. In scoped modes: `in_diff=true` sorts before pre-existing.
3. If > 15 issues in Medium/Low: show top 10, summarize rest in table.

---

## Fix Mode

**Read `references/fix-workflow.md` before executing.** It contains the complete
fix protocol: test runner detection, baseline capture, file-by-file fix strategy,
regression test writing, verification loop, and failure handling.

Key principles:
- Fix reads `code-smells.md` as its work plan (Terraform plan/apply pattern)
- Fixes are applied file-by-file with `tsc --noEmit` after each file
- Regression tests are written for each fix where testable
- Full test suite runs after all fixes, compared against baseline
- Max 5 verification iterations (tsc + lint + tests)
- NEVER commit, NEVER stage — user reviews and decides
- ALL fixed -> delete `code-smells.md` (clean slate)
- Some remain -> keep `code-smells.md` as audit trail with BEFORE/AFTER for fixed issues,
  status tags for failed/reverted/skipped, and original entries for untouched issues

---

## Severity Scale

| Level | Criteria | Examples |
|---|---|---|
| Highest | Active bugs, security vulns, data loss | SQL injection, uncaught rejection, lying type predicate |
| High | Bugs waiting to happen, edge-case failures | Missing null check, `as` hiding mismatch, floating promise |
| Medium | Tech debt to clean up in-context | `any` internally, missing exhaustive check, complex function |
| Low | Style — improve when convenient | Naming, missing readonly, verbose type |

In scoped modes: these are base severities before diff-aware boost.

Architecture findings use the same severity scale with domain-specific criteria.
See `references/architecture.md` → Severity Mapping for Architecture.

---

## Important Guidelines

- **No framework checks.** Pure TypeScript only.
- **No false positives from intentional patterns.** `// @ts-expect-error` with explanation = Low.
  `// @ts-ignore` (legacy) = Medium. Without explanation = Medium.
- **Respect project conventions.** Don't flag consistent patterns unless harmful.
- **Be concrete.** Every issue needs a snippet and a fix recommendation.
  "Consider refactoring" is not a valid fix.
- **Don't flood with noise.** Consolidate identical issues into Recurring Patterns.
- **Scoped mode focus.** Prioritize diff issues. Pre-existing = informational only.
