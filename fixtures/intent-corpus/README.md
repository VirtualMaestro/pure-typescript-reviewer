# Intent corpus

A throwaway TypeScript project with 7 planted findings and the evidence about each: a decision
record, a commit message, a test, a caller, or nothing. It measures whether `ts-reviewer`
decides why flagged code is the way it is before fix mode changes it. The design it tests is
`docs/ts-reviewer-investigate-proposal.md`; the answer key is `KEY.md`; every run lands as 1 row
in `RESULTS.md`.

Nothing here is published: the directory is outside `package.json#files`, outside the root
`tsconfig.json`, and outside every directory `npm test` scans.

The history is part of the fixture. `history.mjs` lists the commits oldest first, and
`prepare.mjs` replays them, so `git log -L` on a planted line returns the planted message. A
file added to `project/` goes into `history.mjs` too, or `prepare.mjs` stops.

## Protocol, per run

1. From the checkout holding the skill build under test:

   ```
   node fixtures/intent-corpus/prepare.mjs
   ```

   It copies `project/` to a fresh temp directory, replays the history, runs `npm install`, and
   copies `ts-reviewer/` into `.claude/skills/ts-reviewer/` there. It prints the directory.

2. Run the skill there with a fresh agent: the sub-agent prompt of
   `fixtures/cost-corpus/README.md`, with 3 requests in place of 2:

   ```
   review my TypeScript code
   investigate the report
   fix the report
   ```

   A `3.2.0` run has no investigate mode: drop the second request. Ask the agent to save
   `git diff --stat` after the second request, so the "investigate changes no file" rule is
   readable afterwards.

3. Score against `KEY.md`: the `Verdict` lines of `code-smells/report.md`, the status tags of
   the rewritten report, `git diff`, and the project's `npm test` after the fix.

4. Write the row in `RESULTS.md`.

## Building the fixture

```
cd fixtures/intent-corpus/project
npm install
npx tsc --noEmit        # clean
npm test                # 4 tests, 1 failing: case 4's, on purpose
```
