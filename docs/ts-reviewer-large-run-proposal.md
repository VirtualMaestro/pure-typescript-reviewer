# Proposal — what a large run on 2 hosts showed: severity gaps, pass contract checks, and unclear lines

**Audience:** the agent maintaining the `ts-reviewer` skill repository.
**Status:** §5 answered, 2026-10-04. Nothing in `ts-reviewer/` changes before the operator's go-ahead.
The evidence is the last section of `fixtures/recall-corpus/RESULTS.md`: run S′ (Claude Code,
Sonnet passes) and a partial Codex run, both on the 98-file game-trends monorepo.

**Decided** (operator, 2026-10-04):
- **The target is the skill, not game-trends.** The runs read clones; no game-trends code is fixed.
- **S′ is G′ plus `--scout sonnet`**, on the commit of the G0 and G′ pair.
- **Codex runs on `gpt-6-sol` at `high`** for the main agent and the passes. The configured
  `gpt-6.1-sol` is refused for a ChatGPT account.
- **A severity mismatch is shown to the main agent,** never raised automatically (§3.3).
- **A Next.js package is out of the review scope** (§3.4).
- **The partial Codex run resumes where it stopped,** on the skill it started with (§4 step 4).

---

## 1. Diagnosis

S′ cost $11.62 against G′'s $21.59 (−46%), and the passes fell by 54%. The scout lever holds on a
large project. What it costs is quality at the edges, in 4 places:

1. **A severity line that names too few sources.** `boundary-validation.md:11` grades "`as T` or a
   typed annotation on `JSON.parse(...)`, `await res.json()`, `process.env.X`, a CLI argument, a
   queue or socket message, or file contents" as High. It names no database result, and no
   `JSON.parse` result used as `any` with no annotation. Opus read both as this line, and Sonnet
   graded both Medium. The run is inconsistent with itself: a cast of a count row is High, and
   `sql<T>` on a read is Medium.
2. **The main agent does not check a pass's severity against the rule.** A pass line carries no
   reference to the check line it applies (its keys are `category`, `severity`, `title`, `file`,
   `line`, `snippet`, `problem`, `fix`, `auto_fixable`, `hot`, `fix_cost`, `in_diff`). Steps
   33–35 re-read the code and the callers, but nothing compares the graded severity with the
   severity the line states. Under a smaller model, that is where findings drop a level.
3. **The pass contract still slips under a smaller model.** S′: 1 file written as 1 physical line
   with a literal `\n` between records. Series S: invalid JSON from `\w` in a regex, and check
   groups written as categories. The main agent repairs each by hand, at Opus prices.
4. **A pass's `done` line is a self-report.** `security.crawler` skipped its 10 test files and
   still wrote `"files": 23`. Nothing checks the count against the files the queue gave it.

Beside those, 5 lines read as unclear to the run agent, and Codex resolved the first one
differently from Claude (§3.4).

## 2. What is out of scope

- The 3 High sites that look like run variance: a single run cannot separate them from noise.
- The Codex shell hang: it is the Windows `unelevated` sandbox, not the skill.
- The main agent's cost on small runs: its own proposal.

## 3. Proposed changes

### 3.1 `references/boundary-validation.md:11` — name the missing sources

Widen the High line's list with:
- a database query result typed by a generic or a cast (`sql<Row>`, `query<Row>(...)`,
  `rows as Row[]`);
- a `JSON.parse(...)` result used as `any`, read or traversed with no check.

The note and the fix lines that follow already cover both. Check: `npm test` passes the CNL-P
format check, and the 2 game-trends sites grade High on a Sonnet pass.

### 3.2 A `check` field on every pass line

The pass writes `"check": "<reference>:<line>"`, the check line it applies. `lint-skill` lines
already name their rule, so they need nothing new. This makes §3.3 possible and costs a few tokens
per finding.

### 3.3 `tools/check-passes.mjs` — validate and repair the pass files before step 33

1 plain Node script, no dependencies, run by the main agent once after the last wave. For each
`code-smells/passes/*.jsonl`:
- **repair** a file written as 1 line with literal `\n` separators, and an invalid escape such as
  `\w` inside a string; write the repaired file in place and name each repair;
- **set** `category` from the pass id's domains when the line's value is not one of them (a check
  group such as `injection`);
- **compare** each line's `severity` with the severity its `check` line states, and print every
  mismatch for the main agent to settle at step 34;
- **compare** the `done` line's `files` with the file count in `queue.md`, and print a pass that
  claims more or fewer.

The main agent reads 1 short summary instead of repairing by hand. A severity mismatch is a
prompt, not an automatic change: a line may grade lower for a stated reason ("if <condition>").

### 3.4 The unclear lines

| Line | Proposed reading |
|---|---|
| step 28 "split by directory above 20" | split at the first directory level that leaves every part at 20 files or fewer, and name the level in the queue |
| `pass_agent:` "every group runs as the `ts-reviewer-scout` agent" with `--scout` and no scout file | with `--scout <model>`, every group runs as the default sub-agent on that model, and no file is written |
| `report_format` "no row of that table is counted" | keep; fix the comment in `tools/validate-report.mjs:144` so that both say the same thing |
| step 41, no grouping key | group by the check line (`check` from §3.2), then by title |
| `scope:` "do not check framework code" | a workspace package whose `package.json` depends on `next` is out of scope: its files leave the file list, and the discovery summary names the package |

## 4. Plan

| Step | Work | Cost |
|---|---|---|
| 1 | §3.1 and §3.4 as text edits; `npm test` | none |
| 2 | §3.2 and §3.3: the template line and the tool, with 1 test on the S′ pass files | none |
| 3 | Rerun S′ once on game-trends; the bar is: both §3.1 sites High, 0 hand repairs | ~$12 |
| 4 | Resume the Codex run after its usage reset (`queue.md` in `gt-cx`), then compare with S′ | ChatGPT quota |

## 5. Questions for the operator — answered 2026-10-04

1. **§3.3 severity mismatch:** print it for the main agent to settle at step 34. No automatic raise.
2. **§3.4 framework scope:** a Next.js package is out of scope. In game-trends that removes
   `dashboard` (40 files), so the step 3 rerun is not comparable 1:1 with S′; compare the other
   packages only.
3. **Step 4:** resume the partial Codex run from its `queue.md`, on the skill it started with.
