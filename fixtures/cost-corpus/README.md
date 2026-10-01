# Cost corpus

A throwaway TypeScript project with 7 planted findings, used to measure whether `ts-reviewer`
fix mode adds a run-time cost on a hot path. The design it tests is
`docs/ts-reviewer-fix-cost-proposal.md`; the answer key is `KEY.md`; every run lands as 1 row in
`RESULTS.md`.

Nothing here is published: the directory is outside `package.json#files`, outside the root
`tsconfig.json`, and outside every directory `npm test` scans.

## Protocol, per run

1. From the checkout holding the skill build under test:

   ```
   node fixtures/cost-corpus/prepare.mjs
   ```

   It copies `project/` alone to a fresh temp directory, commits it, runs `npm install`, and
   copies `ts-reviewer/` into `.claude/skills/ts-reviewer/` there. It prints the directory.
   `KEY.md`, `RESULTS.md`, and the proposal never enter that directory.

2. Open a fresh agent session in the printed directory and run, in order:

   ```
   review my TypeScript code
   fix the report
   ```

   Answer any operator prompt the skill raises the way you would on a real project, and note
   what you answered.

3. Back in this checkout, score the run against `KEY.md`:

   - `code-smells/passes/*.jsonl` in the run directory: `hot` and `fix_cost` on all 7 cases
     (cases 5 and 6 carry no `Hot path` line in the report, so the JSONL is the only record);
   - `code-smells/report.md`: the `Hot path`, `Fix design`, and `Rejected rungs` lines, and the
     status tags;
   - `git diff` in the run directory: the accepted and forbidden outcomes;
   - `$TMPDIR/ts-reviewer-bench-before.log` and `ts-reviewer-bench-after.log`: the 2 numbers on
     every designed fix are lines of these.

   A `3.1.0` run emits no cost fields and no bench logs: score the fix outcome only.

4. Write the row in `RESULTS.md`.

## Building the fixture

```
cd fixtures/cost-corpus/project
npm install
npx tsc --noEmit        # clean
npm run bench           # 6 lines, 1 per planted function
```
