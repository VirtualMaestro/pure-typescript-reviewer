# Proposal — the 6 open points before the first npm release

**Audience:** the agent maintaining the `ts-reviewer` skill repository.
**Status:** approved 2026-10-06; built step by step (§4), then measured (§5). The version stays
`3.5.0`: it is not published yet.

**Decided** (operator, 2026-10-06):
- **Fix all 6 before publishing.**
- **An untyped `JSON.parse` in a test file grades Medium,** and High stays for the code under test.
- **The main agent's cost gets both levers:** pass prompts written by a tool, and a report builder
  in the skill.

---

## 1. The 6 points

| # | Point | Evidence |
|---|---|---|
| 1 | A pass that stops replying holds its wave: nothing notices it | a nested pass hung 12 h on a heredoc after its file was complete |
| 2 | A pass that skims a file still counts it as read | `security.crawler` in S′ searched, skipped 10 test files, and wrote `"files": 23` |
| 3 | The main agent is 45–67% of a small run and $5.03 of S″ | S″ transcript: 84 turns at a 145k median context, 23 hand-written pass prompts, a report script written fresh every run |
| 4 | The new untyped-`JSON.parse` line grades test code High | S″: `crawler/test/adapters.test.ts:126`, `mcp-server/src/stdio.test.ts:44` |
| 5 | Step 20 runs `tsc` on the root config, which in a monorepo can cover 2 files | game-trends: every agent ran `tsc` per package on its own |
| 6 | Step 40 does not say what happens to a High pattern | each agent kept 1 full entry and listed the rest in the row |

## 2. Where the main agent's money goes (S″, $5.03)

- **Cache reads, $2.41:** 12.0M tokens over 84 turns. Every turn rereads the context, which grows
  from 42k to 221k. A turn saved, or a token kept out of the context, pays on every later turn.
- **Output, $1.51:** 76k tokens. The 23 pass prompts are the template filled by hand, about 1k tokens
  each; `build-report.mjs` was written fresh (10.6k characters) and debugged.
- **Cache writes, $1.11.**

## 3. Changes

### 3.1 A stalled pass (point 1)

- Step 31: a pass is `done` as soon as its file ends with the `done` line, whether or not its agent
  replied.
- Step 31: an agent with no reply and no `done` line after 30 minutes leaves its pass `pending`, to
  run again in the next wave; stop the agent where the host allows.
- `subagent_template`: run no command that waits for input, and bound every shell command in time.

### 3.2 Skipped files (point 2)

- The `done` line gains `"skipped"`: every file of the list the pass did not read in full. A search
  over a file is not a reading.
- `check-passes.mjs` prints each non-empty `skipped`.
- A new step-31 rule: the skipped files run once more as a pass of the same group, with the id
  `<pass id>-rest`.
- The count stays a self-report. The change makes a skip something the agent must write down, not
  something it can leave out.

### 3.3 Pass prompts as files (point 3)

`tools/pass-prompts.mjs` reads a plan the main agent writes once, `code-smells/passes/plan.json`
(scope mode, whether the skill lint ran, and per pass: id, domains, files, context files). It writes:
- `code-smells/passes/queue.md`, keeping the status, attempts, and findings of every pass already
  in it, which is the resume;
- `code-smells/passes/prompts/<id>.md`: the `subagent_template` of `SKILL.md`, filled.

The agent call then carries 1 line: read the prompt file and follow it. The template stays the 1
source in `SKILL.md`, and the tool reads it from there.

### 3.4 A report builder (point 3)

`tools/build-report.mjs` turns the settled findings into `code-smells/report.md`. The split:
- **the main agent decides:** steps 33–35, the re-read and the severity of each finding, and writes
  the findings it keeps to `code-smells/passes/final.jsonl`; it writes the prose (summary, config
  note, discovery block, verification rows) to `code-smells/passes/meta.json`;
- **the tool applies the mechanics:** steps 36–43 and 48–49 (downgrade, boost, deduplicate, merge,
  consolidate, cap, hot entries, sort, top 10), counts, and renders `report_format`.

The rules stay in `SKILL.md` as they are; the tool is their 1 implementation, as `lint-pass.mjs`
is for the lint. Architecture Opportunities stay the main agent's: the tool inserts a file it is
given. A report the tool writes must pass `validate-report.mjs`, and a test holds it.

### 3.5 Test files (point 4)

The untyped-`JSON.parse` line of `boundary-validation.md` gains "Medium in a test file". A test file
is `*.test.*`, `*.spec.*`, or a file under `test/`, `tests/`, or `__tests__/`, the set the skill lint
already uses. `check-passes.mjs` accepts Medium for that line in a test file.

### 3.6 `tsc` per project (point 5)

Step 20 runs `npx tsc --noEmit -p <config>` for every project config step 10 found that includes a
scoped file, and keeps the first 200 lines of each in `tsc.log`. A single-config project runs once,
as before.

### 3.7 A High pattern (point 6)

Step 40: a High or Highest pattern keeps 1 full entry, and its row lists the other sites. Fix mode
needs a snippet to design the fix, and the row needs the sites.

## 4. Plan

| Step | Work | Check |
|---|---|---|
| 1 | §3.1, §3.2, §3.5, §3.6, §3.7: text, `check-passes.mjs`, tests | `npm test` |
| 2 | §3.3 `pass-prompts.mjs` and its test | `npm test` |
| 3 | §3.4 `build-report.mjs` and its test: a built report passes the validator | `npm test` |
| 4 | 1 recall-corpus run with `--scout sonnet` | High+ 42/42; main agent below S's $1.77 |
| 5 | 1 game-trends run (S‴) | report validates; main agent below S″'s $5.03 |

## 5. Results

| Step | Commit | Outcome |
|---|---|---|
| 1 | `edb5951` | points 1, 2, 4, 5, 6 |
| 2 | `327e5d0` | `pass-prompts.mjs` |
| 3 | `e42a9d1` | `build-report.mjs`; built from the raw S″ passes, its report validates first try |
| 4 | P1 | recall 22/22, High+ 14/14; main agent $1.15 against $1.77 (−35%); run $2.03 against $2.65 |
| 5 | S‴, S⁗ | main agent $3.10 and $3.18 against $5.03 (−37%); every report validates first try |

The runs led to 3 more commits:
- `eaf094a` and `68b4370`: 9 lines the run agents read 2 ways, and the joined split;
- `27e13e7`: 2 builder faults and the lockfile rest pass.

Every bar of §4 is met. RESULTS.md, "Prepublish", holds the figures.
