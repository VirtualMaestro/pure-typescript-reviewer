---
name: ts-reviewer
description: >
  Deep TypeScript code review — finds bugs, type safety holes, security issues, async anti-patterns,
  outdated practices, and code smells. Supports scoped review: full codebase, uncommitted changes,
  branch diff (PR review), or last N commits. Outputs a prioritized report.
  Use this skill whenever the user asks to "review", "audit", "check", "lint", "find issues",
  "find problems", "find bugs", "code smells", or "review code quality" in a TypeScript project.
  Also trigger when the user mentions "tech debt", "code health", "refactor candidates",
  "security audit", "modernize", "review my changes", "review my PR", "check what I changed",
  "review last commit", or "review uncommitted" in a TypeScript context. Works with pure
  TypeScript 5.x codebases — no framework-specific checks (React, Vue, Angular, etc.).
---

# TypeScript Code Reviewer

A comprehensive, multi-pass code reviewer for pure TypeScript 5.x codebases.
Produces a single prioritized report of all issues found across the project.

## High-Level Workflow

```
Phase 1: Discovery    -> understand project structure, config, scope
Phase 2: Diagnostics  -> run tsc, linters, collect machine-reported issues
Phase 3: Analysis     -> spin up specialized sub-agents (or run sequentially)
Phase 4: Report       -> deduplicate, rank, write .claude/code-smells.md
```

---

## Scope Modes

The reviewer supports four scope modes. Detect the mode from the user's request.
If not specified, default to **full codebase**.

### How to detect scope from user's request

| User says | Scope mode |
|---|---|
| "review my code", "audit the project", "find issues" (no qualifier) | `full` |
| "review my changes", "check uncommitted", "what I changed", "review working tree" | `uncommitted` |
| "review my PR", "review my branch", "diff against main", "changes for review" | `branch` |
| "review last commit", "check last 3 commits", "what did I break" | `commits:N` |

### Git commands per scope

**`full`** — all `.ts` files in the project:
```bash
find . -name '*.ts' -not -path '*/node_modules/*'
```

**`uncommitted`** — staged + unstaged + untracked `.ts` files:
```bash
# Changed tracked files (staged + unstaged)
git diff --name-only HEAD -- '*.ts'
# Untracked .ts files
git ls-files --others --exclude-standard -- '*.ts'
```

**`branch`** — all changes on current branch vs base branch:
```bash
# Auto-detect base branch (main or master)
BASE=$(git rev-parse --verify main 2>/dev/null && echo main || echo master)
# All .ts files changed on this branch
git diff --name-only "$BASE"...HEAD -- '*.ts'
# Plus any uncommitted changes on top
git diff --name-only HEAD -- '*.ts'
```
Combine both lists and deduplicate. If the user specifies a base branch
(e.g., "diff against develop"), use that instead of auto-detecting.

**`commits:N`** — last N commits:
```bash
git diff --name-only HEAD~N..HEAD -- '*.ts'
```
Default N=1 if user says "last commit" without a number.

### Context files (critical for scoped reviews)

When running a scoped review, the **analysis scope** is the diff file list,
but the **reading scope** must be wider. Agents need context to understand
whether the changed code is correct. Always include as read-only context:

1. `tsconfig.json` (and extended configs)
2. All files that the scoped files **import from** (follow the import graph one level deep):
   ```bash
   # For each file in scope, extract its imports
   grep -h "from ['\"]" <scoped_files> | sed "s/.*from ['\"]//;s/['\"].*//" | sort -u
   ```
3. Shared type definition files (`types.ts`, `*.d.ts`, `interfaces/`, `shared/`)
4. `package.json` (for dependency context)

These context files are NOT analyzed for issues — they are only read so agents
understand the types and interfaces the scoped code depends on.

### Diff-aware severity boost

When running any scoped mode (`uncommitted`, `branch`, `commits:N`),
apply a severity boost to issues found in **newly added or modified lines**.

Rules:
- Collect the set of changed lines from the diff:
  ```bash
  # For uncommitted:
  git diff -U0 HEAD -- '*.ts' | grep '^@@'
  # For branch:
  git diff -U0 "$BASE"...HEAD -- '*.ts' | grep '^@@'
  # For commits:
  git diff -U0 HEAD~N..HEAD -- '*.ts' | grep '^@@'
  ```
- For each issue, check whether `issue.line` falls within a changed hunk.
- If the issue is on a **new/modified line**: boost severity by one level
  (Low->Medium, Medium->High, High->Highest). Highest stays Highest.
- If the issue is on an **unchanged line** (pre-existing in the file): keep
  original severity. These are pre-existing tech debt — the user didn't introduce them.
- In the report, mark boosted issues with a UP-ARROW indicator next to the severity badge.
  Example: `High [boosted, was Medium — new code]`.

Rationale: a bug in code from 2 years ago is tech debt (fix when convenient).
The same bug in code written today should be fixed before merging.

In **full codebase** mode, do not apply severity boost — all code is treated equally.

---

## Phase 1 — Discovery

Before analyzing any code, understand the project. Run these steps in order:

1. **Detect scope mode** from the user's request (see table above).
   Run the appropriate git commands to build the file list.
   If a scoped mode produces 0 files, inform the user and ask whether to fall back to full.

2. **Map the project tree** — regardless of scope mode, get the full project structure
   to understand context. In scoped mode, note which files are in scope vs context-only.

3. **Read `tsconfig.json`** (and any extended configs like `tsconfig.base.json`).
   Load `references/tsconfig.md` and check every flag listed there against the project's config.
   Flag missing strict flags as issues.
   In scoped modes, still check config — but only if `tsconfig.json` itself is in the diff,
   or if this is a full review.

4. **Check for linter configs** — look for `eslint.config.*`, `.eslintrc.*`, `biome.json`, `biome.jsonc`, `deno.json`.
   Note which linter is available (if any).

5. **Read `package.json`** — note the TypeScript version, dev dependencies (linters, type packages),
   and `"type": "module"` vs CommonJS.

6. **Identify entry points and public API surface** — look for `index.ts`, `main.ts`, `mod.ts`,
   or exports in `package.json`. Public API gets extra scrutiny for type design.

7. **Collect context files** (scoped modes only) — resolve imports from scoped files
   and load shared type definitions. See "Context files" section above.

Output a short summary (for yourself, not the report) before proceeding:
```
Project: <name>
Scope: full / uncommitted / branch (vs <base>) / commits:<N>
TS version: <version>
Module system: ESM / CJS
Strict mode: yes / partial / no
Linter: eslint / biome / none
Files in scope: <N> .ts files (+ <M> context files)
Entry points: <list>
```

---

## Phase 2 — Diagnostics

Collect machine-reported issues before doing manual analysis.

### 2a. TypeScript compiler

```bash
npx tsc --noEmit 2>&1 | head -200
```

If `tsc` is not available via npx, try `./node_modules/.bin/tsc --noEmit`.
Every compiler error becomes a **Highest** severity issue automatically.
Compiler warnings become **High**.

In scoped modes, run `tsc --noEmit` on the full project (it needs the full program),
but only report errors from files in scope.

### 2b. Linter (if available)

If ESLint is configured:
```bash
# Full mode:
npx eslint . --format json 2>/dev/null | head -500
# Scoped mode — lint only the files in scope:
npx eslint <file1> <file2> ... --format json 2>/dev/null | head -500
```

If Biome is configured:
```bash
npx biome check . --reporter json 2>/dev/null | head -500
```

Capture linter output. Map linter severities:
- `error` -> **High**
- `warning` -> **Medium**
- `info` / `hint` -> **Low**

### 2c. LSP diagnostics (if available)

If a TypeScript LSP server is accessible (e.g. via MCP), query diagnostics for each file.
LSP often catches issues that `tsc --noEmit` alone does not surface (unused variables,
unreachable code, deprecated API usage). Merge results with compiler output, deduplicating
by file + line + message.

---

## Phase 3 — Analysis

This is the core of the review. For each analysis domain below, either spin up a dedicated
sub-agent (in Claude Code) or run the checks sequentially (in Claude.ai).

Each agent/pass must read its corresponding reference file from `references/` before starting.

### Agent roster

| Agent | Reference file | Focus |
|---|---|---|
| Type Safety | `references/type-safety.md` | `any`, casts, `!`, exhaustiveness, generics |
| Security | `references/security.md` | Injection, prototype pollution, ReDoS, path traversal |
| Async Patterns | `references/async-patterns.md` | Floating promises, race conditions, error propagation |
| Modernization | `references/modernization.md` | Outdated patterns vs TS 5.x idioms |
| Code Quality | `references/code-quality.md` | Complexity, duplication, naming, dead code, error handling |
| Config | `references/tsconfig.md` | tsconfig.json flags and module setup |

### Sub-agent instructions (Claude Code)

For each agent, spawn with this template:

```
You are a specialized TypeScript reviewer focused on [DOMAIN].

Read the reference checklist: [REFERENCE_PATH]

Review these files: [FILE_LIST]
Context files (read-only, do NOT report issues in these): [CONTEXT_FILE_LIST]
Scope mode: [full|uncommitted|branch|commits:N]

For every issue found, output this exact JSON structure:
{
  "category": "[DOMAIN]",
  "severity": "highest|high|medium|low",
  "title": "Short descriptive title",
  "file": "relative/path/to/file.ts",
  "line": 42,
  "snippet": "the relevant code (3-7 lines, no more)",
  "problem": "One-sentence explanation of what's wrong",
  "fix": "Concrete recommendation with a code example if helpful",
  "auto_fixable": true|false,
  "in_diff": true|false,
  "reference": "URL or docs reference if applicable"
}

The "in_diff" field indicates whether the issue is on a new/modified line (true)
or on a pre-existing unchanged line (false). In full mode, set all to false.

Output one JSON object per line (JSONL). Nothing else.
Do not report issues already covered by tsc compiler errors: [COMPILER_ERRORS_SUMMARY]
```

### Sequential mode (Claude.ai / no sub-agents)

If sub-agents are not available, go through each domain one at a time.
Read the reference file, then scan the codebase file by file.
Use the same JSON structure for consistency before converting to the final report.

### File batching strategy

- If the project has <= 20 .ts files (or <= 20 scoped files) — each agent reviews all files.
- If > 20 files — split files across agents by directory, but ensure each agent
  sees shared types/interfaces files (types.ts, interfaces/, shared/) for context.
- Always give every agent the tsconfig.json and the discovery summary.

---

## Phase 4 — Report

### Severity boost application

Before deduplication, apply the diff-aware severity boost (scoped modes only):
1. For each issue with `"in_diff": true`, boost severity by one level.
2. Record the original severity for the report annotation.

### Deduplication

After boost:
1. Remove exact duplicates (same file + line + same issue).
2. Merge overlapping issues (e.g., "uses `any`" from Type Safety agent and
   "insecure input type" from Security agent -> keep the higher-severity one,
   note the overlap).
3. If the same pattern appears in 3+ places, consolidate into a single
   "Pattern" issue listing all locations instead of repeating.

### Output file

Write results to `.claude/code-smells.md` (create `.claude/` directory if needed).

Use this exact structure:

````markdown
# TypeScript Code Review Report

**Project:** <name>
**Reviewed:** <date>
**TypeScript version:** <version>
**Scope:** Full codebase / Uncommitted changes / Branch `<name>` vs `<base>` / Last N commits
**Files analyzed:** N (+ M context files in scoped mode)
**Total issues found:** N (X critical, Y high, Z medium, W low)
**Severity-boosted:** N issues on new/modified lines (scoped modes only)

## Summary

<2-3 sentence overview of the codebase health and the most important patterns found.
In scoped modes, focus on the quality of the changes specifically.>

## Critical Issues (Highest + High)

### [TITLE] — Highest [boosted, was High — new code]

**Category:** <category> | **File:** `path` | **Line:** N | **Auto-fixable:** Yes/No | **New code:** Yes

```typescript
// relevant code snippet
```

**Problem:** <explanation>

**Fix:** <recommendation with code example>

**Reference:** <link or docs reference if applicable>

---

<repeat for each critical issue>

## Medium Issues

<same format>

## Low Issues

<same format>

## Recurring Patterns

<issues that appear in 3+ places, listed once with all locations>

## Config Issues

<tsconfig.json and linter config issues — only in full mode or if config files are in diff>

## Pre-existing Issues (scoped modes only)

<issues found on unchanged lines in scoped files — these are pre-existing tech debt,
listed at original (non-boosted) severity. Useful as context but not blocking for the PR.
Omit this section entirely in full codebase mode.>
````

### Sorting rules

1. Within each severity group, sort by category, then by file path.
2. Critical issues (Highest, High) — always list individually.
3. Medium and Low — if > 15 issues in a group, show top 10 individually
   and summarize the rest in a table.
4. In scoped modes, issues in new code (in_diff=true) sort before pre-existing issues
   at the same severity level.

---

## Severity Scale

| Level | Criteria | Examples |
|---|---|---|
| Highest | Active bugs, security vulnerabilities, data loss risks | SQL injection, uncaught promise rejection crashing the process, writing to wrong file |
| High | Bugs waiting to happen, will break under edge cases | Missing null check on optional chain, `as` cast hiding a real type mismatch, floating promise in error path |
| Medium | Tech debt — clean up when you're already editing that file | `any` in internal function, missing exhaustive check, complex function that should be split |
| Low | Style and conventions — improve when convenient | Inconsistent naming, missing readonly, verbose type that could use utility type |

In scoped modes, remember that these are **base severities** before the diff-aware boost.
A Medium issue on a new line becomes High after boost.

---

## Important Guidelines

- **No framework checks.** This skill is for pure TypeScript. Do not flag anything
  related to React, Vue, Angular, Svelte, or any UI framework patterns.

- **No false positives from intentional patterns.** If code has a `// @ts-ignore` or
  `// eslint-disable` with a clear comment explaining WHY, note it as Low, not High.
  Suppressions without explanations are Medium.

- **Respect project conventions.** If the project consistently uses a pattern
  (e.g., barrel exports, specific naming convention), don't flag it as a smell
  unless it causes actual problems.

- **Be concrete.** Every issue must have a code snippet and a fix recommendation.
  "Consider refactoring" is not a valid fix — show what the refactored code looks like.

- **Don't flood with noise.** If you find 50 instances of the same `any` usage,
  create one "Recurring Pattern" entry with all locations, not 50 separate issues.

- **Scoped mode focus.** In scoped reviews, prioritize issues in the diff.
  Pre-existing issues in scoped files are informational — list them separately
  in the "Pre-existing Issues" section so the user knows about tech debt nearby,
  but don't let them overshadow the actual changes being reviewed.