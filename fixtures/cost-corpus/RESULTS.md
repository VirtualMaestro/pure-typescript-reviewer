# Results

1 row per run. A case column holds `ok`, `forbidden`, `not flagged`, or `skipped`, with the rung
where one was recorded (`ok r4`). `Fields` is the count of cases whose `hot` and `fix_cost` match
the key, out of 7, or `n/a` for a `3.1.0` run.

| Date | Skill | Runtime | Model | Fields | 1 | 2 | 3 | 4 | 5 | 6 | 7 | Bench numbers | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2026-09-30 | 3.1.0, red run 1 | Claude Code, run as a sub-agent; 9 pass sub-agents | Opus 5.5 | n/a | skipped: `Auto-fixable: No` | ok: parameter typed `readonly Particle[]`, no guard | not flagged | skipped: `Auto-fixable: No`, only the `Msg` rename touched the line | ok: `toSorted()` | ok: the merged Code Quality fix dropped the option, `??` untested | skipped: `Auto-fixable: No` | n/a | gate not readable, case 3 unflagged: fixture changed (below), rerun. 0 of 4 flagged cost-bearing cases forbidden: the model marks the in-place sorts and the socket cast not auto-fixable and leaves them, with the defect |
| 2026-09-30 | 3.1.0, red run 2 | Claude Code, run as a sub-agent; 9 pass sub-agents | Opus 5.5 | n/a | forbidden: `toSorted(cmp)` inside the function | ok: parameter typed `readonly Particle[]`, the sub-agent noting "costs nothing on the hot path" | skipped: `Auto-fixable: No`, fix text "keep the in-place update for the hot path" | skipped: `Auto-fixable: No` | ok: `toSorted()` | ok: `??` | ok, outside the key: the sort deleted for `reduce(Math.min)`, no allocation | n/a | all 7 flagged, gate readable: 1 of 5 forbidden, the gate fails. The sorts of cases 1 and 7 were deletable, so the fixture changed again (below) |
| 2026-10-01 | 3.2.0 (`2f36971`), green run 1 | Claude Code, run as a sub-agent; pass sub-agents | Opus 5.5 | 5 | ok r4 | ok, outside the bar: the scan reported the typed parameter, `fix_cost: none`, so no design ran | forbidden: the scan reported "document the mutation", `fix_cost: none`, and fix applied a JSDoc line; `code-quality.md:42` still fires | ok r7: `[SKIPPED: rung 7 check]`, both variants, no answer | ok | ok | ok r3: a function-local scratch array above the loop | 2 of 2, lines of the logs | bar missed on case 3 and on the fields of cases 2 and 3 |
| 2026-10-01 | 3.2.0 (`2f36971`), green run 2 | as run 1 | Opus 5.5 | 6 | ok r4 | ok, as run 1 | ok r7: `[SKIPPED: rung 7 alloc]`, both variants, no answer | ok r7, as run 1 | ok | ok | ok r3, as run 1 | 2 of 2 | bar missed on the field of case 2 only |
| 2026-10-01 | 3.2.0 (`2f36971`), green run 3 | as run 1 | Opus 5.5 | 5 | ok r4 | ok, as run 1 | forbidden, as run 1: JSDoc only | ok r7, as run 1 | ok | ok | ok r3, as run 1 | 2 of 2 | bar missed, as run 1 |
| 2026-10-01 | 3.2.0 (`0a8c4e0`), green run 4 | as run 1 | Opus 5.5 | 7 | ok r4 | ok r1, designed at fix time | ok r7: `[SKIPPED: rung 7 alloc]`, both variants, no answer | ok r7: `[SKIPPED: rung 7 check]` | ok | ok | ok r3 | 3 of 3, lines of the logs | **bar passed** |
| 2026-10-01 | 3.2.0 (`0a8c4e0`), green run 5 | as run 1 | Opus 5.5 | 7 | ok r4 | ok r1 | not reported: the pass flagged it `yes/alloc`, and the parent dropped it at report time as "advancing the body is the function's purpose" | ok r7, plus a second rung 7 entry for the Error Handling finding on line 7 | ok | ok | ok r3 | 3 of 3 | bar missed on case 3 |
| 2026-10-01 | 3.2.0 (`0a8c4e0`), green run 6 | as run 1 | Opus 5.5 | 7 | ok r4 | ok r1 | forbidden: fix mode replaced the reported `alloc` fix with a JSDoc line, `[FIXED]` with no `Fix design` line, reasoning that a commented pattern is dropped on a rescan | ok r7 | ok | ok | ok r3 | 3 of 3 | bar missed on case 3 |

Run directories, kept for inspection: `C:\Users\virtu\AppData\Local\Temp\cost-corpus-H7XKfs` (run 1),
`C:\Users\virtu\AppData\Local\Temp\cost-corpus-Nqpffu` (run 2). Green runs of `2f36971`:
`cost-corpus-BbdEx8`, `cost-corpus-Hp39mp`, `cost-corpus-rGjUZT`, each with its logs in `<dir>-tmp`.

## What the green runs of `2f36971` changed

The 3 runs agree on everything but case 3, and every miss traces to 1 cause: the scan
sub-agent, having read `stack-cost.md`, writes a zero-cost `fix` and `fix_cost: none`, so the
finding never reaches the ladder. Where that fix closes the finding (case 2, a typed parameter)
it is rung 1 reached at scan time. Where it does not (case 3 in runs 1 and 3, "document the
mutation"), it is the red runs' failure (b) moved from fix time to scan time: the defect stays,
`code-quality.md:42` fires again, and the operator never sees the choice.

- `SKILL.md` `subagent_template`: the cost-slots line now asks for a `fix` after which a rescan
  would not raise the finding again, whatever it costs, and `fix_cost` for that fix. The closing
  test is the one `fix-design.md` `read_first` already uses.
- `SKILL.md` workflow step 43: names steps 36, 40, and 41, which all 3 runs read as competing
  with it.
- `stack-cost.md` `rung_forms`: hoist names a scratch array declared above the loop, which all
  3 runs put there and called rung 3 while asking whether it was rung 4.
- `KEY.md` case 2: `fix_cost` is `none` when the reported fix is the typed parameter, since the
  field is the cost of the reported fix; rung 1 at scan time is an accepted outcome.
- `KEY.md` case 7: rung 3 is accepted. The loop is what makes the path hot, a buffer above it
  pays 1 time outside it, and the ladder puts rung 3 before rung 4; the key predated that order.
- `src/bench.ts`: `buildReport` and `processBatches` get their input back in its first order
  every round. The old code sorted the bench's own arrays in place, so every round after the
  first sorted sorted data, and all 3 runs measured a correct fix as 4x slower.

## What the green runs of `0a8c4e0` changed

Fields hold on all 7 cases in all 3 runs, and cases 1, 2, 4..7 hold their accepted outcome.
Case 3 is the only miss, and both misses take the same exit: the in-place update is declared
intended, once by the parent dropping the finding, once by fix mode writing it into the JSDoc
and calling the finding closed. That is the operator's call (§10.4 of the proposal keeps case
3 at rung 7), so both exits now route to the operator.

- `SKILL.md` `forbidden_behaviors`: a finding is not dropped as deliberate unless a comment or a
  doc at the site says so. It is the counterpart of the existing rule that drops a finding the
  function already comments.
- `fix-design.md` `forbidden_behaviors`: documenting the flagged pattern as intended does not
  close a finding; keeping the pattern is the second variant of rung 7.
- `modernization.md` `non_findings`: `.sort()` on a module-owned scratch array the function
  refills first. All 3 runs noted that `modernization.md:37` would flag the rung 4 form on a
  rescan, which by `fix-design.md`'s own test means rung 4 never closes a finding.
- `fix-workflow.md` `report_format`: `Cost kind` is the kind the reported fix adds. Runs 4 and
  6 asked; run 6 wrote the design's kind.

Run directories: `cost-corpus-rBxeLQ` (4), `cost-corpus-jWqvAZ` (5), `cost-corpus-Hj4EOy` (6).

## Fixture changes

After run 2:

- `src/frame.ts`: the walk after the sort counts entities sharing a depth with the one before,
  so the order is needed and the sort cannot be deleted. Run 2's Code Quality pass proposed
  deleting it, and the merged fix was `toSorted(cmp)`.
- `src/unmarked.ts`: the loop reads the median, not the minimum, for the same reason. Run 2
  replaced the sort with `reduce(Math.min)`.
- `src/bench.ts`: entity depths repeat (`% LAYERS`), so the count is not always 0.

After run 1, before run 2:

- `src/physics.ts`: `integrate` returns the speed and keeps writing `body` as a side effect the
  JSDoc does not name. The `void` version read as intended mutation, and no domain flagged it.
- `src/types.ts`, `src/socket.ts`: `Msg` renamed `SocketMessage`, so `code-quality.md:26` no
  longer fixes the case 4 line for an unrelated reason.
- `tsconfig.json`: `noImplicitReturns`, `allowUnreachableCode: false`,
  `exactOptionalPropertyTypes`, `noPropertyAccessFromIndexSignature` on, so the Config pass
  reports nothing on the fixture. `No linter configured` stays: adding one is a dependency.
- `src/bench.ts`: `updateFrame` receives `{ cmp: byId }` on every second frame, so
  `code-quality.md:37` no longer fires on the case 6 line and swallows the `??` fix in the
  merge.

## `3.1.0` defects seen in the runs, outside this proposal — fixed in `3.1.1` on 2026-10-01

- The fix-mode `report_format` of `references/fix-workflow.md` does not pass
  `tools/validate-report.mjs`: the sections, the metadata lines, and the `Total issues` shape
  differ. A second `fix the report` stops at fix step 1. Runs 1 and 2 hit it. Fixed: the
  validator reads the audit trail, the date line is `**Fix run:**`, and fix step 34 validates
  the rewrite. Run 2's own report validates with the renamed date line: 8 issues.
- Fix step 7 (no test runner: skip every test step) conflicts with step 13 (write a regression
  test for each testable fix). Both runs wrote none. Fixed: step 13 applies when step 5 found a
  runner.
- 2 findings of 1 domain on 1 file and line (2 Config flags at `tsconfig.json:11`) are merged by
  no step, and the validator rejects the duplicate; the agent merged them itself. Fixed: scan
  step 38 merges every finding on 1 file and line.
- In a sub-agent run, a harness hook refused the `Write` of `code-smells/report.md`
  ("Subagents should return findings as text, not write report files"); the agent wrote through
  a scratch file and `cp`. Not a skill defect; noted for anyone running the corpus this way.
