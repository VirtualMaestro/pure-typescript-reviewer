# Answer key

Never copied into a run. A change to the fixture or to this key is recorded in `RESULTS.md`
with the run it first applied to. The design it tests is `docs/ts-reviewer-investigate-proposal.md`.

Cases 1–6 each end in 1 verdict; case 7 is a control the scan drops as today. Line numbers are
those of `project/` as committed; the sha of case 2 differs per run, and the message is the key.

| # | File and shape | Flagged by | Evidence planted | Verdict and pointer | Accepted outcome | Forbidden outcome |
|---|---|---|---|---|---|---|
| 1 | `src/layers.ts:7`, exported `sortLayers(layers)` calling `layers.sort(byZ)` on the parameter | Modernization | `docs/adr/0002-layers-sort-in-place.md`; the history message "add the layers module" is silent | `deliberate-recorded`, record `docs/adr/0002-layers-sort-in-place.md` | `[SKIPPED: deliberate, …]`, `src/layers.ts` untouched or 1 comment line added | `toSorted()` or a copy applied; the finding left open with no tag and no record |
| 2 | `src/physics.ts:11..13`, `@hotpath integrate(body, dt)` writing `body.position` and `body.velocity` | Code Quality | the commit adding the file: "integrate advances each body in place: the step loop owns the bodies and reuses them every frame" | `deliberate-unrecorded`, history `<sha>` | 1 comment line above the flagged line citing the sha, no other change, no rung 7 question | a new object; a rung 7 question; a JSDoc rewrite citing nothing |
| 3 | `src/report.ts:7`, exported `buildReport(rows)` calling `rows.sort(byName)` | Modernization | `src/report.test.ts:5`, "buildReport leaves rows sorted by name for the pager" | `deliberate-unrecorded`, test `src/report.test.ts:5..9` | 1 comment line citing the test; the suite as at baseline | `toSorted()` applied, or applied and reverted; the finding left open with no tag and no record |
| 4 | `src/config.ts:5`, exported `loadConfig(text)` returning `JSON.parse(text) as Config` | Boundary Validation | `src/config.test.ts:9`, failing at baseline; then the history message "cast the config: the deploy tool validates it" | `defect`, test `src/config.test.ts:9..11` | a guard or a schema check applied; the baseline failure passes after it | a deliberate verdict from the history message |
| 5 | `src/ids.ts:4`, module-private `toIndex(value: unknown)` returning `value as number`, called only by `nextIndex()` with a `number` | Type Safety | none; `toIndex` is not exported, so its 1 caller is every caller | `unreachable`, callers `src/ids.ts:9` | the zero-cost fix applied, a typed parameter, or the cast removed | `defect` or `unknown`; a runtime guard added |
| 6 | `src/legacy.ts:3`, exported `lastN(items, n)` calling `items.reverse()` | Modernization | none: the message "wip", no test, no record, re-exported by `src/index.ts` | `unknown`, `none` | the fix applied as today, the `Verdict` line naming `unknown` | `defect` or a deliberate verdict |
| 7 | `src/cache.ts:8`, `entries.sort(byAge)` under `// Sorted in place on purpose: …` | Modernization | the comment at the site | none: `SKILL.md` drops a finding its site comments | no finding in the report | a finding, or a verdict on it |

A pointer matches when it names the same source and file, and its line is within the range
above. Case 2 matches on the message the sha resolves to.

## Project-wide rules

- The investigate step changes no file: `git diff` after it is empty, and `code-smells/` is the
  only path it writes.
- `npm test` in the project fails 1 test at baseline, case 4's; a run that ends with the
  report-test failing has applied the forbidden outcome of case 3.
- A case the scan does not flag is a defect of the fixture, not of the skill: fix the fixture,
  rerun, and only then read the gate or the bar.

## Red run gate (`3.2.0`, 1 run)

Decided 2026-10-01, after 3 red runs: a finding left open with no tag and no record counts as
a forbidden outcome, as failure (b) did for slice 1. The forbidden column of cases 1 and 3 says so.

The scan flags cases 1–6 and drops case 7, and >= 2 of cases 1–3 show their forbidden outcome.
Fewer means the model already reads tests, history, and decision records unprompted: stop,
record, reconsider.

## Pass bar (`3.3.0`, each of 3 runs, plus 1 cost corpus run)

- the verdict and the pointer match this key on cases 1–6;
- every accepted outcome holds, and no forbidden outcome is in `git diff`;
- case 7 is not reported;
- the investigate step leaves `git diff` empty;
- the cost corpus run in auto mode passes the bar of `fixtures/cost-corpus/KEY.md`, and no
  verdict there is deliberate or `unreachable`: `bench.ts` passes its own data to cases 1, 3, and
  7, so `defect` by the callers is right there, and `unknown` everywhere else (changed after the
  first green runs, `RESULTS.md`).
