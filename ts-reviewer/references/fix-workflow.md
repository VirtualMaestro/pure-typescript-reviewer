# Fix Workflow Protocol

This document describes the complete fix mode protocol.
Read this before executing any fix or auto mode operation.

## Prerequisites

- `code-smells.md` must exist in the project root.
  If missing, stop with error: "No scan report found. Run scan first."
- The project must be in a git repository (for safe revert if needed).
- Recommend the user commit or stash uncommitted work before fix runs,
  so they can `git diff` or `git checkout -- .` to revert all changes.

## Step 1 — Parse the Report

Read `code-smells.md` and extract all issues into a work list.
Group issues by file path. Within each file, sort by line number **descending**
(fix from bottom of file upward so line numbers above don't shift).

Build the work plan:
```
File: src/auth/token.ts
  - Line 142: [High] Unsafe `as` cast — type-safety
  - Line 87:  [Medium] Floating promise — async
  - Line 23:  [Low] `enum` should be `as const` — modernization

File: src/api/handler.ts
  - Line 201: [Highest] eval() with user input — security
  - Line 55:  [Medium] Missing exhaustive check — type-safety
```

## Step 2 — Detect Test Infrastructure

Check for test runner in this order:

| Signal | Runner | Command |
|---|---|---|
| `package.json` has `"scripts": { "test": "..." }` AND the script is not the npm placeholder (`echo "Error: no test specified" && exit 1`) | npm script | `npm test` (use `pnpm test` / `yarn test` if a pnpm/yarn lockfile is present) |
| `vitest.config.*` exists | vitest | `npx vitest run` |
| `jest.config.*` or `"jest"` in package.json | jest | `npx jest` |
| `*.test.ts` / `*.spec.ts` + `"mocha"` in devDeps | mocha | `npx mocha` |
| `deno.json` exists | deno | `deno test` |
| `bun.lockb` or `bun.lock` exists | bun | `bun test` |
| Node.js 18+ and `*.test.ts` files | node:test | `node --test` |

If no test infrastructure found:
- Warn the user: "No test runner detected. Fixes will be applied without test verification."
- Skip all test-related steps (baseline, regression tests, verification).
- Still run `tsc --noEmit` and linter after fixes.

Also detect the test file naming convention:
- `*.test.ts` vs `*.spec.ts`
- `__tests__/` directory vs co-located with source
- Test framework imports (`describe/it` vs `test` vs `Deno.test`)

## Step 3 — Capture Test Baseline

Run the full test suite BEFORE any changes:
```bash
<test_command> 2>&1 | tee "$TMPDIR/ts-reviewer-baseline.log"
```
Write logs to the OS temp directory (or the project root if temp is unavailable —
recommend gitignoring them). Do NOT write to `.claude/` — the skill must work in
non-Claude environments and the directory may not exist.

Record:
- Total tests: N
- Passing: N
- Failing: N (list these — they are pre-existing failures, NOT our responsibility)
- Test run command used

This baseline is critical. After our fixes, any NEW failures are regressions we caused.
Pre-existing failures that still fail are not our problem.

## Step 4 — Apply Fixes File-by-File

Process one file at a time. For each file:

### 4a. Apply all fixes in the file

Go through the file's issues sorted by line number descending.
For each issue:

1. Read the current state of the file (lines may have shifted from previous fixes in same file).
2. Apply the fix described in the report.
3. If the fix involves replacing a pattern (e.g., `enum` -> `as const`), update ALL
   references to that symbol across the codebase (imports, usages).

### 4b. Write regression tests

For each fix, write a regression test if the issue is testable.

**Testable issues** (write a regression test):
- Type safety: incorrect cast → test that the function handles the correct type
- Security: eval/injection → test that the sanitized version rejects malicious input
- Async: floating promise → test that errors propagate correctly
- Bugs: missing null check → test with null/undefined input

**Non-testable issues** (skip regression test):
- Style changes (naming, formatting)
- Config changes (tsconfig flags)
- Modernization that doesn't change behavior (enum -> as const with same values)
- Complexity reduction (splitting a function — behavior unchanged)

Regression test conventions:
- Match the project's existing test naming convention and framework
- Place tests next to existing test files, or in `__tests__/` if that's the convention
- Name: `<original-file>.reviewer-fixes.test.ts` (or `.spec.ts` per convention)
- Each test should be clearly labeled with the issue title:
  ```typescript
  describe('ts-reviewer fixes: src/auth/token.ts', () => {
    it('should not use unsafe cast for token payload (type-safety)', () => {
      // test that validates the fix
    });
  });
  ```
- Keep tests focused and minimal — test the specific fix, not the entire function
- Tell the user these files are candidates to rename and merge into their existing
  suites — the `.reviewer-fixes` naming is a handoff convention, not a permanent home

### 4c. Run tsc after each file

```bash
npx tsc --noEmit 2>&1
```

On large repos (> ~30 files in the work plan) where a full typecheck is slow, use
`npx tsc --noEmit --incremental` or batch the check every 3-5 files instead of every file.

If `tsc` reports NEW errors in the file we just fixed or in files affected by our changes:
- Analyze the errors
- Fix them immediately (they are likely caused by our refactoring — e.g., type changes
  that affect consumers)
- Re-run `tsc` to confirm
- If unable to fix after 2 attempts on the same error, revert the last fix in this file
  and mark the issue as `[FIX FAILED: caused type errors]` in the report

### 4d. Move to next file

Repeat 4a-4c for each file in the work plan.

## Step 5 — Linter Pass

After all files are fixed, run the linter:

```bash
# ESLint
npx eslint [changed_files] --format json 2>/dev/null
# or Biome
npx biome check [changed_files] --reporter json 2>/dev/null
```

If linter reports errors in files we changed:
- Auto-fix what's auto-fixable: `npx eslint --fix [files]` or `npx biome check --fix [files]`
- For remaining errors: fix manually
- Re-run linter to confirm clean

## Step 6 — Test Verification

Run the full test suite:
```bash
<test_command> 2>&1 | tee "$TMPDIR/ts-reviewer-postfix.log"
```

Compare with baseline:

| Baseline | Post-fix | Verdict |
|---|---|---|
| PASS | PASS | OK — no regression |
| FAIL | FAIL | OK — pre-existing failure, not our problem |
| PASS | FAIL | REGRESSION — we broke this, must fix |
| FAIL | PASS | BONUS — we accidentally fixed a pre-existing failure |
| (new) | FAIL | Our new regression test fails — must fix |
| (new) | PASS | Our new regression test passes — good |

For each REGRESSION:
1. Analyze the test failure and the stack trace.
2. Identify which fix caused it (check git diff for the relevant file).
3. Either fix the regression or revert the offending fix.
4. Mark reverted fixes as `[FIX REVERTED: caused test regression in <test>]`.

## Step 7 — Verification Loop

After fixing regressions, repeat:
1. `tsc --noEmit`
2. Linter check
3. Full test suite

If new issues appear, fix them. **Maximum 5 iterations** of this loop.

After 5 iterations, if issues remain:
- Stop fixing
- Leave the code in its current state
- Update the report with a "Stabilization" section listing unresolved regressions
- The user will need to handle these manually

Iteration tracking:
```
Iteration 1: Fixed 12/15 issues. 2 test regressions found.
Iteration 2: Fixed 2 regressions. 1 new tsc error.
Iteration 3: Fixed tsc error. All tests pass. Clean.
-> Done at iteration 3.
```

## Step 8 — Update Report

After fix completes, decide what to do with `code-smells.md`:

### All issues fixed successfully

Delete `code-smells.md`. The report served its purpose and the codebase is clean.
Inform the user: "All N issues fixed. Report deleted. Run scan again to verify."

### Some issues remain (failed, reverted, skipped, or not auto-fixable)

Keep `code-smells.md` as a complete audit trail. The file must show the full picture:
both what was fixed and what wasn't. This is important because:
- The user can trace regressions back to a specific fix
- The user can see at a glance what still needs manual attention
- A "fixed" issue that later causes problems can be identified and reverted

Rewrite the report with this structure:

```markdown
# TypeScript Code Review Report

**Project:** <n>
**Scanned:** <original scan date>
**Fixed:** <fix date>
**Total issues found:** N
**Fixed:** N | **Failed:** N | **Skipped:** N | **Remaining:** N

## Fix Summary

<1-2 sentences: what was done, what remains>

## Fixed Issues

### [TITLE] — [FIXED]

**Original severity:** High | **Category:** type-safety | **File:** `path` | **Line:** N

```typescript
// BEFORE (original code)
```

```typescript
// AFTER (applied fix)
```

**Regression test:** `path/to/file.reviewer-fixes.test.ts` (or "not applicable")

---

## Remaining Issues

### Unfixed (failed/reverted/skipped)

### [TITLE] — [FIX FAILED: reason] or [FIX REVERTED: reason] or [SKIPPED: reason]

**Severity:** High | **Category:** security | **File:** `path` | **Line:** N

```typescript
// code snippet
```

**Problem:** <explanation>
**Recommended fix:** <what should be done manually>
**Why auto-fix failed:** <specific reason>

---

### Not attempted (not auto-fixable or not in scope)

<these keep their original format from the scan report>

## Config Issues
## Recurring Patterns
```

Status tags for each issue:
- `[FIXED]` — successfully applied and verified
- `[FIX FAILED: <reason>]` — attempted but couldn't complete (tsc errors, etc.)
- `[FIX REVERTED: <reason>]` — applied but caused test regression, rolled back
- `[SKIPPED: requires manual review]` — too risky or ambiguous to auto-fix
- No tag — not attempted (not auto-fixable or out of scope)

### BEFORE/AFTER for fixed issues

Every `[FIXED]` issue must include both the original code and the replacement.
This serves as a diff the user can review, and if something breaks later,
they can identify which fix to revert by looking at the AFTER block.
Keep snippets minimal (3-7 lines) — just the changed portion.

## Step 9 — Final State

After fix completes:
- All code changes are in the working tree, NOT staged, NOT committed
- The user can:
  - `git diff` to review all changes
  - `git add -p` to selectively stage
  - `git checkout -- .` to revert everything
  - Run tests themselves to verify
- New regression test files are also unstaged
- `code-smells.md` is either deleted (all clean) or updated with full audit trail

---

## Architecture Fixes

Architecture findings in the `## Architecture Opportunities` section carry a `Fixability:` field.
Fix mode behavior is determined by that field:

| Fixability | Fix mode behavior |
|---|---|
| `auto` | Apply in normal fix loop. Run `tsc --noEmit` after each file as usual. |
| `needs-confirm` | Surface to user with a diff/migration plan. Do NOT apply automatically. Wait for explicit go-ahead. |
| `report-only` | Never apply. Leave in report as documentation. Mark `[SKIPPED: report-only]`. |

### Testing strategy for architecture fixes

When applying an `auto` architecture fix (module merge, import path cleanup, narrow circular-import break):

1. Write new tests at the **deepened module's interface** — test observable behavior, not internal state.
2. Delete old unit tests that tested the shallow modules being merged — they become redundant once the deeper module's interface tests cover the same behavior.
3. Tests must survive internal refactors. If a test must change when implementation changes, it's testing past the interface.
4. Don't expose internal seams through the module interface just to make tests easier to write.

### `needs-confirm` flow

1. Show the user what would change (describe the reorganization or interface change).
2. If the user approves, apply the fix using the same file-by-file + `tsc` verification loop.
3. If the user rejects, mark the finding `[SKIPPED: user rejected]` in the report and move on.

---

## Fix Safety Rules

1. **NEVER commit or stage.** The user reviews and decides.
2. **NEVER delete files** unless the file was entirely dead code flagged in the report.
3. **NEVER modify files outside the scope** of issues in `code-smells.md`,
   except for necessary cascading changes (e.g., updating imports after a type rename).
4. **Preserve all existing behavior.** Fixes should not change what the code does,
   only how it does it (safer types, modern syntax, proper error handling).
   The exception is security fixes that intentionally change behavior (e.g., adding input
   validation that rejects previously-accepted malicious input).
5. **Keep changes minimal.** Don't refactor an entire file because of one issue.
   Fix exactly what the report says, nothing more.
6. **If uncertain, skip.** If a fix is ambiguous or risky, mark it as
   `[SKIPPED: requires manual review]` and move on. Better to skip than to break.
7. **Snapshot before touching, restore to revert.** Before applying the first fix to a
   file, save its exact current content (copy to a temp/scratch directory, keyed by
   path). To revert a fix, restore the file from that snapshot and re-apply only the
   fixes that were verified safe. NEVER use `git checkout -- <file>` or `git restore` —
   the user may have uncommitted changes in the same file, and those commands destroy
   them along with the fix.

---

## Test Runner Quick Reference

### vitest
```bash
npx vitest run                          # run all tests once
npx vitest run --reporter json          # JSON output for parsing
npx vitest run src/auth/                # run tests in directory
```

### jest
```bash
npx jest                                # run all
npx jest --json                         # JSON output
npx jest --testPathPattern auth         # filter by path
```

### mocha
```bash
npx mocha                               # run all
npx mocha --reporter json               # JSON output
```

### node:test
```bash
node --test                              # run all *.test.* files
node --test --test-reporter spec         # detailed output
```

### deno
```bash
deno test                                # run all
deno test --filter "auth"                # filter
```

### bun
```bash
bun test                                 # run all
bun test --bail                          # stop on first failure
```
