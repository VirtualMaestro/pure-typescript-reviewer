# Results

1 row per run. A case column holds `ok`, `forbidden`, `not flagged`, or `skipped`, with the rung
where one was recorded (`ok r4`). `Fields` is the count of cases whose `hot` and `fix_cost` match
the key, out of 7, or `n/a` for a `3.1.0` run.

| Date | Skill | Runtime | Model | Fields | 1 | 2 | 3 | 4 | 5 | 6 | 7 | Bench numbers | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2026-09-30 | 3.1.0, red run 1 | Claude Code, run as a sub-agent; 9 pass sub-agents | Opus 5.5 | n/a | skipped: `Auto-fixable: No` | ok: parameter typed `readonly Particle[]`, no guard | not flagged | skipped: `Auto-fixable: No`, only the `Msg` rename touched the line | ok: `toSorted()` | ok: the merged Code Quality fix dropped the option, `??` untested | skipped: `Auto-fixable: No` | n/a | gate not readable, case 3 unflagged: fixture changed (below), rerun. 0 of 4 flagged cost-bearing cases forbidden: the model marks the in-place sorts and the socket cast not auto-fixable and leaves them, with the defect |
| 2026-09-30 | 3.1.0, red run 2 | Claude Code, run as a sub-agent; 9 pass sub-agents | Opus 5.5 | n/a | forbidden: `toSorted(cmp)` inside the function | ok: parameter typed `readonly Particle[]`, the sub-agent noting "costs nothing on the hot path" | skipped: `Auto-fixable: No`, fix text "keep the in-place update for the hot path" | skipped: `Auto-fixable: No` | ok: `toSorted()` | ok: `??` | ok, outside the key: the sort deleted for `reduce(Math.min)`, no allocation | n/a | all 7 flagged, gate readable: 1 of 5 forbidden, the gate fails. The sorts of cases 1 and 7 were deletable, so the fixture changed again (below) |

Run directories, kept for inspection: `C:\Users\virtu\AppData\Local\Temp\cost-corpus-H7XKfs` (run 1),
`C:\Users\virtu\AppData\Local\Temp\cost-corpus-Nqpffu` (run 2).

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
