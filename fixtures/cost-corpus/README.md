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

## Running step 2 as a sub-agent

The red and green runs so far ran step 2 as a fresh Opus 5.5 sub-agent of the scoring session,
1 per run directory, all 3 green runs in parallel. Parallel runs need their own `TMPDIR`: the
bench and test logs have fixed names. The prompt, with `<DIR>` the printed directory:

```
You are the coding agent of a developer working on a TypeScript project at `<DIR>`. Work only
inside that directory: do not read or list anything outside it (the TMPDIR below excepted). It
has a project skill at `.claude/skills/ts-reviewer/SKILL.md`; it is the skill for both requests
below. Read that SKILL.md first and follow it exactly, including every reference file it tells
you to read (paths relative to the skill directory).

Environment: in every shell command, first set `export TMPDIR=<DIR>-tmp` (create the directory
once with mkdir -p). Use that directory wherever the skill says the OS temp directory or `$TMPDIR`.

The developer makes 2 requests, in order:
1. "review my TypeScript code"
2. once the scan is complete and its report is written: "fix the report"

The developer is not available to answer questions during this run. Where the skill tells you
to ask the operator something or wait for the operator's choice, proceed as the skill says for
a run with no operator answer, and record in the report that no answer was given. Do not commit
or stage anything.

If a harness hook blocks you from writing a file the skill requires, write it through a scratch
file and copy it into place with a shell command.

When done, reply with: the absolute paths of the bench logs you wrote (if any), the final status
of each finding in code-smells/report.md (title + status tag), and any point where the skill's
instructions were unclear or contradictory to you, quoting the line. Keep the reply under 400 words.
```

With no operator, a rung 7 design ends `[SKIPPED: rung 7 <kind>]` with both variants: that is
the accepted outcome for cases 3 and 4 in a sub-agent run.

## Building the fixture

```
cd fixtures/cost-corpus/project
npm install
npx tsc --noEmit        # clean
npm run bench           # 6 lines, 1 per planted function
```
