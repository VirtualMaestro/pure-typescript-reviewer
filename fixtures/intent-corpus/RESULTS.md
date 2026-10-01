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

**Decided 2026-10-01:** failure (b) counts, as for slice 1. Read that way the gate passes in
every run: red run 1 has cases 2 and 3 forbidden, red run 2 cases 1, 2, and 3, red run 3 cases 2
and 3. Step 4 is open.

## Green runs of `57e9509` (`3.3.0`)

| Date | Skill | Runtime | Model | Verdicts | 1 | 2 | 3 | 4 | 5 | 6 | 7 | Diff after investigate | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2026-10-01 | 3.3.0 (`57e9509`), green run 1 | as red run 1 | Opus 5.5 | 6 | ok: `deliberate-recorded`, ADR, untouched | ok: `deliberate-unrecorded`, history, 1 comment, no rung 7 question | ok: `deliberate-unrecorded`, test, 1 comment, suite as baseline | ok: `defect`, test; guard applied, the baseline failure passes | ok: `unreachable`, callers; typed parameter | ok: `unknown`; `toReversed()` | ok: dropped | empty | **bar passed** |
| 2026-10-01 | 3.3.0 (`57e9509`), green run 2 | as red run 1 | Opus 5.5 | 6 | ok, as run 1 | ok | ok | ok | ok | ok | ok | empty | **bar passed** |
| 2026-10-01 | 3.3.0 (`57e9509`), green run 3 | as red run 1 | Opus 5.5 | 6 | ok | ok | ok | ok, pointer `config.test.ts:10`, inside the key's range | ok | ok | ok | empty | **bar passed** |

Cost corpus, 1 auto run of `57e9509` (`cost-corpus-TP1KKk`): slice 1's outcomes hold — case 1 r4,
case 2 r1, case 7 r3, cases 3 and 4 `[SKIPPED: rung 7 …]`, cases 5 and 6 applied as reported,
2 numbers per designed fix from the cycle 1 logs. The fields are not readable: the re-scan of
auto mode restarted the queue and deleted the first scan's `passes/`. Verdicts: cases 2 and 4
`unknown`, but cases 1, 3, and 7 `defect`, each citing `src/bench.ts` passing its own array or
body into the mutating call. That is the rule as written — a caller passing a value that reaches
the failure is defect evidence — and the key's "every verdict `unknown`" was a wrong prediction.
5 non-cost entries carry no `Verdict` line in the rewritten report, against "an entry keeps the
`Verdict` line it had": most likely summary-table rows the fix run promoted to entries.

Questions all 3 intent runs raised, and the changes they lead to:

- `fix-design.md` forbids closing a finding by documenting the pattern as intended, and
  `fix-workflow.md` step 13 does exactly that for `deliberate-unrecorded`. Every run followed
  step 13, which is the intended reading. Changed: the prohibition and its neighbour name a
  deliberate verdict as the third way a cost-bearing finding closes.
- `investigate.md` stops at the first decisive source, while `deliberate-unrecorded` asked for
  "no record", a source read after the history. Changed: the row drops "and no record"; the
  order already decides it.

Left open, no run went wrong on them: SKILL step 40 against the `Verdict` line on a Recurring
Pattern member (all runs kept full entries); `unreachable` off the hot path (all runs applied the
zero-cost form); the auto re-scan meeting the resume question of step 6 with no operator; the
bench logs of a second auto cycle overwriting the first.

## Green runs of `d651275` (`3.3.0` with the 2 changed lines): the bar holds 3 of 3

| Date | Skill | Runtime | Model | Verdicts | 1 | 2 | 3 | 4 | 5 | 6 | 7 | Diff after investigate | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2026-10-01 | 3.3.0 (`d651275`), green run 4 | as red run 1 | Opus 5.5 | 6 | ok | ok | ok | ok | ok | ok | ok | empty | **bar passed** |
| 2026-10-01 | 3.3.0 (`d651275`), green run 5 | as red run 1 | Opus 5.5 | 6 | ok | ok | ok | ok | ok | ok | ok | empty | **bar passed** |
| 2026-10-01 | 3.3.0 (`d651275`), green run 6 | as red run 1 | Opus 5.5 | 6 | ok | ok | ok | ok, pointer `config.test.ts:10` | ok | ok | ok | empty | **bar passed**: step 5 of the proposal is done |

Cost corpus, 1 auto run of `d651275` (`cost-corpus-GpNA4T`, snapshots in its `-tmp`): fields 7 of 7
from the first scan's `passes/`; slice 1's outcomes hold (r1, r4, r3, both rung 7 skips, 5 and 6
applied as reported, 2 numbers per designed fix from `cycle1/`); verdicts `defect` by the callers
on cases 1, 3, 7 and `unknown` on 2 and 4, none deliberate or `unreachable`. Bar passed.

Run directories: `intent-corpus-F9JlJc` (4), `intent-corpus-Ep1lhm` (5), `intent-corpus-pFXBxk` (6).

Left open, no run went wrong on them; each is a candidate for the next wording pass, which reruns
all 3: SKILL step 40 against a `###` entry per site (every run kept full entries and added a
pattern row); `unknown` on an `Auto-fixable: No` finding (every run left the linter untouched);
the auto re-scan meeting step 6's resume question with no operator, and its bench logs and audit
trail overwriting cycle 1's; a merged rung 7 entry whose categories carry different cost kinds.
