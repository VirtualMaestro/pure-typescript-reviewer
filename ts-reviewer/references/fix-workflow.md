purpose:
- state the complete fix mode protocol, from parsing the report to the final state of the working tree
- read it before executing any fix or auto mode run

scope:
- the fix-mode behaviour of each `Fixability:` value is owned by `references/architecture.md`
- the testing strategy for an architecture fix is owned by `references/architecture.md`

read_first:
- `code-smells/report.md` exists in the project root, and a missing report stops the run with the error "No scan report found at code-smells/report.md. Run scan first; the report path changed in v3."
- the project is inside a git repository, so a change can be reverted
- recommend that the operator commits or stashes uncommitted work before the fix runs, which leaves `git diff` and `git checkout -- .` usable to review and revert
- the baseline taken in step 9 decides what counts as a regression: a test failing before the fixes is pre-existing and stays out of the work

workflow:
1. validate the report and stop without changing code when it reports an error, since a `warning:` line names a pre-pass outcome rather than a defect of the report
```bash
# SKILL is the directory this file was loaded from.
SKILL=<the directory this file was loaded from>
node "$SKILL/tools/validate-report.mjs" --repo . --report code-smells/report.md
```
2. read `code-smells/report.md` and extract every issue into a work list
3. group the issues by file path, and sort them by line number descending inside each file, so a fix lower in the file does not shift the lines above it
4. build the work plan
```
File: src/auth/token.ts
  - Line 142: [High] Unsafe `as` cast — type-safety
  - Line 87:  [Medium] Floating promise — async
  - Line 23:  [Low] `enum` should be `as const` — modernization

File: src/api/handler.ts
  - Line 201: [Highest] eval() with user input — security
  - Line 55:  [Medium] Missing exhaustive check — type-safety
```
5. detect the test runner through the signals in `test_runners`, in the order listed there
6. detect the test file convention: `*.test.ts` against `*.spec.ts`, a `__tests__/` directory against co-location, and the framework imports, `describe` and `it` against `test`
7. warn the operator with "No test runner detected. Fixes will be applied without test verification." when no test infrastructure is found, skip every test step, and still run the compiler and the linter
8. run the full test suite before any change, and write the log to the OS temp directory, or to the project root when temp is unavailable
```bash
<test_command> 2>&1 | tee "$TMPDIR/ts-reviewer-baseline.log"
```
9. record the baseline: total tests, passing, failing with the list, and the command used
10. process 1 file at a time, reading its current state before each fix, since an earlier fix in the same file has shifted the lines
11. apply the fix the report describes
12. update every reference to a renamed or replaced symbol across the codebase, its imports and its usages, when the fix replaces a pattern such as `enum` with `as const`
13. write a regression test for each testable fix: an incorrect cast, an injection sink, a floating promise, or a missing null check
14. skip the regression test for an untestable fix: a naming or formatting change, a config flag, a modernization that keeps the behaviour, or a complexity split
15. name the regression test file `<original-file>.reviewer-fixes.test.ts`, following the naming, the placement, and the framework the project already uses
16. label each test with the issue title, and keep it to the specific fix rather than the whole function
```typescript
describe('ts-reviewer fixes: src/auth/token.ts', () => {
  it('should not use unsafe cast for token payload (type-safety)', () => {
    // test that validates the fix
  });
});
```
17. tell the operator that the `.reviewer-fixes` files are candidates to rename and merge into the existing suites: the naming is a handoff convention and not a permanent home
18. run `npx tsc --noEmit 2>&1` after each file, and use `--incremental` or check every 3..5 files instead where the work plan > 30 files and a full typecheck is slow
19. fix a new compiler error in the file just changed or in a file the change affects, then run the compiler again to confirm
20. revert the last fix in the file and mark the issue `[FIX FAILED: caused type errors]` when the same error survives 2 attempts
21. repeat steps 10..20 for each file in the work plan
22. run the linter over the changed files once every file is fixed
```bash
# ESLint
npx eslint [changed_files] --format json 2>/dev/null
# or Biome
npx biome check [changed_files] --reporter json 2>/dev/null
```
23. apply `npx eslint --fix [files]` or `npx biome check --fix [files]`, fix the rest by hand, and run the linter again to confirm it is clean
24. run the full test suite and compare it against the baseline through `baseline_verdicts`
```bash
<test_command> 2>&1 | tee "$TMPDIR/ts-reviewer-postfix.log"
```
25. read the failure and the stack trace of each regression, and identify the fix that caused it from the diff of that file
26. fix the regression, or revert the fix that caused it and mark it `[FIX REVERTED: caused test regression in <test>]`
27. repeat the compiler, the linter, and the full suite until they are clean, with iterations <= 5
```
Iteration 1: Fixed 12/15 issues. 2 test regressions found.
Iteration 2: Fixed 2 regressions. 1 new tsc error.
Iteration 3: Fixed tsc error. All tests pass. Clean.
-> Done at iteration 3.
```
28. stop fixing once the fifth iteration ends with the compiler, the linter, or the suite still not clean, leave the code as it stands, and add a Stabilization section to the report listing the unresolved regressions for the operator
29. show the operator what a `needs-confirm` architecture finding would change, and describe the reorganization or the interface change
30. apply an approved `needs-confirm` finding through the same file-by-file compiler loop, and mark a rejected one `[SKIPPED: user rejected]`
31. rerun Knip, dependency-cruiser, and co-change through the Architecture workflow when the report contains architecture findings
32. delete `code-smells/report.md` when every issue is fixed, and tell the operator "All N issues fixed. Report deleted. Run scan again to verify."
33. keep `code-smells/` after deleting the report, state what it contains, and ask before removing the directory
34. rewrite `code-smells/report.md` in the shape of `report_format` when any issue remains, carrying both what was fixed and what was not
35. leave every change in the working tree, unstaged and uncommitted, including the new regression test files

forbidden_behaviors:
- do not commit and do not stage: the operator reviews and decides
- do not delete a file unless the report flagged the whole file as dead code
- do not modify a file outside the issues in `code-smells/report.md`, apart from a cascading change such as an import updated after a type rename
- do not change what the code does: a fix changes how it does it, and only a security fix intentionally changes behaviour, such as validation that now rejects malicious input
- do not refactor a whole file because of 1 issue: fix exactly what the report names
- do not apply an ambiguous or risky fix: mark it `[SKIPPED: requires manual review]` and move on, since skipping costs less than breaking the build
- do not revert with `git checkout -- <file>` or `git restore`: the operator can hold uncommitted changes in that file, and both commands destroy them along with the fix
- do not touch a file before saving its exact current content to a scratch directory keyed by path: reverting restores that snapshot and re-applies only the fixes already verified
- do not write any log or snapshot into `.claude/`: the skill runs where that directory does not exist

baseline_verdicts:

| Baseline | Post-fix | Verdict |
|---|---|---|
| pass | pass | no regression |
| fail | fail | a pre-existing failure, and not part of this work |
| pass | fail | a regression this run caused, and it has to be fixed |
| fail | pass | a pre-existing failure this run fixed by accident |
| new | fail | a new regression test failing, and it has to be fixed |
| new | pass | a new regression test passing |

report_format:
- every `[FIXED]` issue carries both the original code and the replacement, so the operator can review it as a diff and identify which fix to revert later
- keep each snippet to 3..7 lines, showing the changed part alone
- status tag `[FIXED]`: applied and verified
- status tag `[FIX FAILED: <reason>]`: attempted and not completed, such as compiler errors
- status tag `[FIX REVERTED: <reason>]`: applied, caused a test regression, and rolled back
- status tag `[SKIPPED: requires manual review]`: too risky or too ambiguous to fix automatically
- no tag: not attempted, because it is not auto-fixable or out of scope
````markdown
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
````

test_runners:

| Signal | Runner | Command |
|---|---|---|
| `package.json` has a `test` script that is not the npm placeholder | npm script | `npm test`, or `pnpm test` or `yarn test` when that lockfile is present |
| `vitest.config.*` exists | vitest | `npx vitest run` |
| `jest.config.*` exists, or `"jest"` is in `package.json` | jest | `npx jest` |
| `*.test.ts` or `*.spec.ts` plus `"mocha"` in the devDependencies | mocha | `npx mocha` |
| `*.test.ts` files and no signal above | node:test | `node --test` |

```bash
npx vitest run                          # run all tests once
npx vitest run --reporter json          # JSON output for parsing
npx vitest run src/auth/                # run tests in directory

npx jest                                # run all
npx jest --json                         # JSON output
npx jest --testPathPattern auth         # filter by path

npx mocha                               # run all
npx mocha --reporter json               # JSON output

node --test                             # run all *.test.* files
node --test --test-reporter spec        # detailed output
```
