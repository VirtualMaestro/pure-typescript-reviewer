# Recall corpus

A throwaway TypeScript project with 22 planted findings across the 9 default domains, and 2
controls. It measures what each lever of `docs/ts-reviewer-token-cost-proposal.md` costs in
findings and saves in tokens:
- the skill lint;
- the pass groups and file rules;
- the scout model.

The answer key is `KEY.md`, and every run lands as 1 row in `RESULTS.md`.

Nothing here is published. The directory is outside `package.json#files`, outside the root
`tsconfig.json`, and outside every directory `npm test` scans.

The project has no linter config on purpose. Case 15 needs that, and so does the gate of
§3.3: without a project linter, the filtered group relies on the skill lint alone.

## Protocol, per run

1. From the checkout holding the skill build under test:

   ```
   node fixtures/recall-corpus/prepare.mjs
   ```

   It copies `project/` to a fresh temp directory, commits it, runs `npm install`, and copies
   `ts-reviewer/` into `.claude/skills/ts-reviewer/` there. It prints the directory.

2. Run the scan there with a fresh agent, as described below. The request is
   `review my TypeScript code` alone: recall needs the scan, not fix.

3. Score against `KEY.md`:
   - from `code-smells/passes/*.jsonl`, the `pass` score;
   - from `code-smells/report.md`, the `report` score.

4. Count the tokens:

   ```
   node fixtures/recall-corpus/tokens.mjs ~/.claude/projects/<project>/<session>/subagents <run agent id>
   ```

   It sums every assistant message of the run agent and of each agent it started. A spawn is
   found by its tool-use id in the parent transcript. Output is split into fresh input, cache
   write, cache read, output, and thinking.

   The `subagent_tokens` in a Claude Code task notification is **not** the spend. It equals
   the context size of the agent's last turn, which was checked on 3 agents on 2026-10-03.

5. Write the row in `RESULTS.md`.

## Running step 2 as a sub-agent

Each run is a fresh Opus 5.5 sub-agent of the scoring session, 1 per run directory, and the 3
runs of a series go in parallel. The prompt, with `<DIR>` the printed directory:

```
You are the coding agent of a developer working on a TypeScript project at `<DIR>`. Work only
inside that directory: do not read or list anything outside it (the TMPDIR below excepted). It
has a project skill at `.claude/skills/ts-reviewer/SKILL.md`; it is the skill for the request
below. Read that SKILL.md first and follow it exactly, including every reference file it tells
you to read (paths relative to the skill directory).

Environment: in every shell command, first set `export TMPDIR=<DIR>-tmp` (create the directory
once with mkdir -p). Use that directory wherever the skill says the OS temp directory or `$TMPDIR`.

The developer makes 1 request: "review my TypeScript code"

The developer is not available to answer questions during this run. Where the skill tells you
to ask the operator something or wait for the operator's choice, proceed as the skill says for
a run with no operator answer, and record in the report that no answer was given. Do not commit
or stage anything.

If a harness hook blocks you from writing a file the skill requires, write it through a scratch
file and copy it into place with a shell command.

When done, reply with: the number of passes you ran and their ids, the total findings in
code-smells/report.md, and any point where the skill's instructions were unclear or
contradictory to you, quoting the line. Keep the reply under 300 words.
```

## Building the fixture

```
cd fixtures/recall-corpus/project
npm install
npx tsc --noEmit        # clean
```
