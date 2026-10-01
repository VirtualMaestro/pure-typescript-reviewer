# Results

1 row per run. A case column holds `ok`, `forbidden`, `not flagged`, or the verdict and outcome
seen. `Verdicts` is the count of cases 1–6 whose verdict and pointer match the key, or `n/a` for
a `3.2.0` run, which has no investigate mode.

| Date | Skill | Runtime | Model | Verdicts | 1 | 2 | 3 | 4 | 5 | 6 | 7 | Diff after investigate | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2026-10-01 | 3.2.0 (`92dd659`), red run 1 | Claude Code, run as a sub-agent; pass sub-agents | Opus 5.5 | n/a | ok-equivalent: no pass flagged it, and the parent named the ADR as the reason, stretching "a comment or a doc at the site" | forbidden: `[SKIPPED: rung 7 alloc]`, a rung 7 question the history message answers | open: `Auto-fixable: No`, no tag, no comment, so a rescan raises it again | ok: guard applied, the baseline failure passes | ok: `toIndex` deleted | ok: `toReversed()` | ok: dropped | n/a | 1 of 3 forbidden: the gate fails as written. 2 more red runs before the reading |
| 2026-10-01 | 3.2.0 (`92dd659`), red run 2 | as red run 1 | Opus 5.5 | n/a | open: `Auto-fixable: No`, no tag; the entry cites the ADR, the parent reading it as not "at the site" | forbidden, as red run 1 | open, as red run 1 | ok: guard applied, the baseline failure passes | ok: typed parameter | ok: `toReversed()` | ok: dropped | n/a | 1 of 3 forbidden, as red run 1 |
| 2026-10-01 | 3.2.0 (`92dd659`), red run 3 | as red run 1 | Opus 5.5 | n/a | ok-equivalent, as red run 1: no pass flagged it; the parent names the ADR and the `void` return | forbidden, as red run 1 | open: "not auto-fixable because an existing test asserts the mutation", no tag, no comment | ok | ok | ok | ok | n/a | 1 of 3 forbidden, as red runs 1 and 2 |

Run directories: `intent-corpus-J1Y1Y8` (red 1), `intent-corpus-HxRAYa` (red 2), `intent-corpus-3jVu83` (red 3).

## Reading the red runs

The 3 runs agree, so the reading is stable. Against the key's forbidden column the gate fails:
1 of cases 1–3 per run, case 2 every time. Cases 4–7 end right in every run without investigate.

What `3.2.0` does with intent, seen in all 3 runs:

- it already reads tests and decision records unprompted. Case 3's test made every run mark the
  finding `Auto-fixable: No`; case 1's ADR made 2 runs drop the finding, by reading the ADR as
  "a doc at the site" of `SKILL.md:55`, and the third keep it open citing the ADR.
- it never reads the history. Case 2's commit message names the in-place update, and every run
  asked the rung 7 question that message answers.
- it never closes a deliberate finding. Case 3, and case 1 in red run 2, stay in the report with
  no tag and no comment, so every later scan raises them again and the next run decides again.
  It is slice 1's failure (b), a finding declined with no record and no operator choice, in the
  off-hot-path form.
- in 2 runs case 1 left no trace in the report: the drop is right, and nothing records why.

Whether failure (b) counts toward this gate is the operator's call, as it was for slice 1.
