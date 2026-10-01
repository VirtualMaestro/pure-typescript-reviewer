# Proposal — an `investigate` mode: decide why the code is this way before a fix changes it

**Audience:** the agent maintaining the `ts-reviewer` skill repository. This document is the
whole input for slice 2; slice 1 is `docs/ts-reviewer-fix-cost-proposal.md`, complete as `3.2.0`.
**Status:** step 1 of §9: the proposal is written, and §10 waits for the operator. Nothing of
slice 2 is under `ts-reviewer/`.
**Decided before this proposal** (slice 1, §7): slice 2 is 1 run mode and 1 stack-free file
`references/investigate.md`; the evidence order is cheapest first and stops at the first
decisive source; `unknown` is a valid verdict and is not `defect`; `deliberate-unrecorded` ends
in a recorded comment, not a code change; the stack-free test covers the new file.

**Numbering convention:** as in slice 1, a step number inside a code block in §5 is the number
the step has after every insert in that file. "The current step N" names a step in `3.2.0`.

---

## 1. Diagnosis

A finding says a pattern is a defect. Nothing in the skill asks whether the pattern is there on
purpose. The scan reads the site and 1 level of imports; fix mode reads the report. Between
them, 2 lines of `SKILL.md` decide intent, and both look only at the site:

| Where | What it says | What it leaves open |
|---|---|---|
| `SKILL.md:53` | drop a finding the enclosing function already "guards, validates, narrows, or comments" | intent recorded anywhere but the site: a test, the history, a decision record |
| `SKILL.md:55`, added in slice 1 | do not drop a finding as deliberate unless a comment or a doc at the site says so | the same: with no comment, the operator is the only route |
| `SKILL.md` workflow step 35 | read the callers to verify a data flow, or cap the severity at Medium | reachability decides the severity, never whether the fix runs |

The slice 1 runs show what fills the gap. In 9 green runs and 2 red runs, the agent decided
intent without evidence on 6 occasions, every time on the same 2 shapes:

- the red runs marked cases 3 and 4 `Auto-fixable: No` with "keep the in-place update for the
  hot path", a guess at intent written as a fix;
- green runs 1 and 3 reported "document the mutation" as the fix of case 3, and fix mode wrote a
  JSDoc line; run 6 did the same in fix mode; run 5 dropped the finding at report time as
  "advancing the body is the function's purpose".

Slice 1 closed each of those exits by routing the finding to the operator (`807eadf`). That is
correct and costs questions: every hot finding whose intent is open becomes a rung 7 choice.
Slice 1's §2 named the remedy: a verdict on intent, decided from evidence, removes a finding
before it reaches the ladder, and an operator question is left only where no evidence decides.

The same gap exists off the hot path, where it is not about cost: `toSorted()` applied to a
function whose test pins the in-place order breaks that test, fix mode reverts the fix, and the
report says `[FIX REVERTED]` where the evidence said "intended" before any change was made.

## 2. The design in one paragraph

A new run mode, `investigate`, reads the scan report and decides 1 verdict per `###` finding:
`defect`, `deliberate-recorded`, `deliberate-unrecorded`, `unreachable`, or `unknown`. It reads
5 sources in a fixed order, cheapest first — the site, the tests, the history of the exact
lines, the decision records, the callers — and stops at the first source that names the flagged
behaviour. It writes the verdict and a pointer to that source as 1 line of the entry, and
changes no code. Fix mode then acts on each verdict by a fixed rule: a deliberate finding closes
with no code change, an unrecorded one gains a comment citing its evidence, an unreachable one
keeps its code when the fix would cost, and `defect` and `unknown` are fixed as today. The
comment closes the loop: on the next scan, `SKILL.md:53` drops a finding its site comments.

What follows from it:

- investigate decides; it never edits. Every change stays in fix mode, with its snapshots, its
  compiler loop, and its audit trail.
- the order is the precedence. A test that asserts the opposite of a history message wins,
  because it is read first and it executes.
- `unknown` keeps today's behaviour and names it. The report shows which fixes rest on no
  evidence, and no new operator question is added for them (§10, question 4).
- a project with no tests, no history, and no decision records gets `unknown` or `unreachable`
  everywhere, which is today's behaviour plus 1 line per finding.
- slice 1 is unchanged for `defect` and `unknown`: the ladder still runs on every cost-bearing
  finding that reaches it.

## 3. Layers

The 3 layers of slice 1 hold:

| Layer | File | Holds | On a port |
|---|---|---|---|
| Algorithm | `references/investigate.md` | the sources, their order, the verdicts, the prohibitions | copied byte for byte |
| Stack | `references/stack-cost.md`, 1 new block `evidence_forms` | where each source lives in this stack, the command that reads it, the comment form | rewritten, block name kept |
| Wiring | `SKILL.md`, `references/fix-workflow.md`, `tools/validate-report.mjs` | the run mode, the report line, the fix rule per verdict | rewritten for the host skill |

The stack file keeps its name although it now holds more than cost slots. A rename touches every
pointer slice 1 wrote; it is cheaper when slice 3 adds its own slots, and §4 records it.

## 4. Skipped on purpose

| Skipped | Why, and when to add it |
|---|---|
| investigating summary-table rows | a row carries no snippet and no line range, so the history and the tests have nothing exact to search. Slice 1's step 42 already lifts every cost-bearing finding into a full entry |
| a verdict at scan time, inside the pass sub-agent | a sub-agent sees 1 domain and its files. The history and the callers are repository-wide, and 1 investigation per merged entry is cheaper than 1 per domain |
| reading the whole history of a file | the exact lines are the claim. `git log -L` on the line range answers it in 1 command; a file's history is noise for this question |
| issue trackers and pull request discussions | a source outside the repository needs credentials and a network. Add it when a run shows `unknown` where such a record existed |
| a confidence score on a verdict | the verdict is decided by 1 named source, and the pointer is the confidence: the operator follows it |
| an operator question per `unknown` finding | the question count is what slice 2 exists to cut. §10, question 4 |
| renaming `stack-cost.md` to `stack.md` | see §3. Slice 3 adds the third set of slots, which is the moment to rename |
| a new status tag per verdict | `[SKIPPED: <reason>]` already exists, the validator buckets it, and the reason carries the verdict. A new tag changes the fix-mode heading regex |

## 5. Exact landing spots in the skill

The new file and the new block below were run through `bodyIssues` and `lexiconIssues` of
`cnlp/cnlp.js`, with the 2 new block names added to an in-memory copy of the reference profile:
0 issues. The stack-free regex of `tools.test.mjs` matches nothing in the new file. Every wiring
line passed `lexiconIssues`. **`npm test` on the real files has not been run**; that is step 4.

### `cnlp/profiles/reference.md` — first

`custom_sections:` gains 2 names, after `measurement`:

```
- verdicts
- evidence_forms
```

### New file `ts-reviewer/references/investigate.md` — the algorithm

```
purpose:
- state how to decide why flagged code is the way it is, before a fix changes it
- read it in investigate mode, and in auto mode between the scan and the fix

scope:
- `references/stack-cost.md` owns the form of each evidence source in this stack
- `references/fix-workflow.md` owns what fix mode does with each verdict, and what the report records
- this file names no language, no runtime, and no tool, so a second stack reuses it unchanged

read_first:
- a finding names a pattern and a defect, and a verdict says whether that defect is real at this site
- a source is a place that can say why the code is this way: the site, a test, the history, a decision record, the callers
- a source is decisive when it names the flagged behaviour, and silent when it does not mention it
- intent evidence names the flagged behaviour as wanted, and defect evidence shows the failure or names the opposite as wanted
- a record is a statement a reader of the code finds without the history: a comment, a doc, a decision record
- a test that asserts the flagged behaviour is intent evidence, and a test that asserts the opposite is defect evidence
- a history message is decisive only when it names the flagged behaviour, so "wip" or "fix" is silent
- the callers are defect evidence when 1 of them passes a value that reaches the failure the finding names
- the callers are decisive for `unreachable` only when every caller is known and none reaches the failure
- every caller is known only when nothing outside the repository can call the function
- a missing source is silent: a shallow history or a project with no tests yields no verdict
- `unknown` is a verdict, and it is not `defect`

verdicts:

| Verdict | Decided by | Next action |
|---|---|---|
| `defect` | defect evidence in the first decisive source, a caller reaching the failure included | the fix applies as the report states it |
| `deliberate-recorded` | intent evidence in a record | no change, and the finding closes citing the record |
| `deliberate-unrecorded` | intent evidence in a test or the history, and no record | a comment at the site citing the evidence, and no code change |
| `unreachable` | the callers: every one known, none reaching the failure | the fix applies when it adds no cost; a costly one keeps the code |
| `unknown` | no source decisive | the fix applies as for `defect`, and the report names the verdict |

workflow:
1. read the finding, its snippet, and the enclosing function in its current state
2. read the comment and the doc at the site and on the enclosing function
3. read the tests that call the function, and their assertions on the flagged behaviour
4. read the history of the exact lines: the change that introduced them, and its message
5. read the decision records for the flagged behaviour
6. trace the callers
7. stop at the first decisive source, and take its verdict from `verdicts`
8. write the verdict in 1 line with a pointer to the source that decided it, or `none` for `unknown`

forbidden_behaviors:
- do not read a source past the first decisive one: the order is the precedence
- do not decide `defect` because no source names the behaviour as wanted: that is `unknown`
- do not decide a deliberate verdict from the name of the function, the shape of the code, or what such code usually does
- do not change code while deciding a verdict: fix mode acts on it
- do not decide `unreachable` while a caller outside the repository can reach the function
```

Four lines carry decisions a first draft would leave implicit:

- *a history message is decisive only when it names the flagged behaviour.* A repository full of
  "wip" and "fix" otherwise turns every finding deliberate on the first line of `git log`.
- *the callers are decisive for `unreachable` only when every caller is known.* An exported
  function of a published package has callers the trace cannot see; for them the verdict is
  `unknown`, never `unreachable`.
- *the order is the precedence.* A test asserting the opposite of a history message wins; the
  fixture holds that case (§8, case 4).
- *do not decide a deliberate verdict from the shape of the code.* It is the line the slice 1
  runs needed: "advancing the body is the function's purpose" is a reading of the name.

### `ts-reviewer/references/stack-cost.md` — 2 changed lines, 1 new block

`purpose:` and `scope:` name the second reader:

```
- fill the slots `references/fix-design.md` and `references/investigate.md` read, for the stack `target_stack` names
- load it with the checklist of every analysis pass, before fix mode designs a fix, and before a verdict is decided
```

```
- `references/fix-design.md` owns the design algorithm, `references/investigate.md` owns the verdicts, and this file owns every stack term both need
```

A new last block:

```
evidence_forms:

| Source | Form in this stack |
|---|---|
| site | a `//` or JSDoc comment on the flagged lines, the enclosing function or class, or the leading comment of the file |
| test | a `*.test.ts` or `*.spec.ts` file, or a file under `__tests__/`, that calls the function: `grep -rln '<name>'` over them |
| history | `git log -L <first>,<last>:<file> --format='%h %s'`, and `git log -S '<line>' --format='%h %s'` for a line that moved |
| record | `docs/adr/`, `adr/`, `doc/adr/`, `ARCHITECTURE.md`, `CONTRIBUTING.md`, and the README |
| callers | the references the TypeScript LSP returns, or `grep -rn '<name>('` |
| outside callers | a function an entry point of `package.json#exports`, `main`, or `bin` exports, or any export when the package declares none |
| comment written | a `//` line above the flagged line: `// Deliberate: <the behaviour>. Evidence: <pointer>.` |
```

`outside callers` is what makes the cost corpus safe: its `package.json` declares no entry
point, so every export counts as reachable from outside, and no slice 1 case turns `unreachable`.

### `SKILL.md` `run_modes:` — 1 row, and the `auto` row

```
| `investigate` | investigate the report, why is this code this way | the verdict of each finding in the report, by `references/investigate.md` |
| `auto` | review and fix, auto-fix, scan and fix, clean up | scan, then investigate, then fix, then a re-scan |
```

The `auto` row depends on §10, question 2.

### `SKILL.md` `preconditions:` — the line widens

```
- `code-smells/report.md` exists before fix mode or investigate mode runs: it is the work plan, and either stops with an error when it is absent
```

### `SKILL.md` `forbidden_behaviors:` — 1 line changes, 1 joins

```
- do not drop a finding as deliberate unless a comment or a doc at the site says so: investigate mode, or the operator, decides the rest
- do not edit code in investigate mode: the verdicts are its whole output, and fix mode acts on them
```

### `SKILL.md` `workflow:` — 3 steps after the current step 50

```
51. read `references/investigate.md` and `references/stack-cost.md` in investigate mode, and in auto mode after the scan summary
52. decide the verdict of each `###` finding as `references/investigate.md` states, and write it as the `Verdict` line of the entry
53. validate the report with the command of step 45 once every verdict is written
```

The current steps 51..62 become 54..65; none of them changes.

### `SKILL.md` `report_format:` — 1 bullet, and 1 optional line under the `Hot path` line

```
- the `Verdict` line is present on every `###` finding once investigate mode has run, and absent on every finding before it
```

```
**Verdict:** defect/deliberate-recorded/deliberate-unrecorded/unreachable/unknown | **Evidence:** <source> <pointer>/none
```

The line is optional, so every `3.2.0` report still validates. `<source>` is a name of the
`evidence_forms` table, and `<pointer>` is a path and line, a commit, or a caller.

### `references/fix-workflow.md` `workflow:` — 2 steps after the current step 11, 2 steps change

```
12. close a `deliberate-recorded` finding with no change, and tag it `[SKIPPED: deliberate, <pointer>]`
13. add the comment `references/stack-cost.md` names above a `deliberate-unrecorded` finding, change no code, and tag it `[SKIPPED: deliberate, <pointer>]`
14. apply the fix the report describes when the finding carries no `Hot path` line and no deliberate verdict
```

```
17. leave the code of a finding whose design ends at rung 7 untouched, carry its 2 variants to step 37, or tag an `unreachable` one `[SKIPPED: unreachable, <pointer>]`
```

The current step 25, "repeat steps 11..24", becomes step 27, "repeat steps 11..26". The current
steps 35 and 36 become 37 and 38, and step 17 names 37. Step 13 is the only code change a
deliberate verdict makes: 1 comment line, in the diff, under the same snapshot rule as every fix.

### `references/fix-workflow.md` `forbidden_behaviors:` — 1 line

```
- do not change code on a finding whose verdict is deliberate: the comment is the whole change
```

### `references/fix-workflow.md` `report_format:` — 3 bullets

```
- status tag `[SKIPPED: deliberate, <pointer>]`: a deliberate verdict closed the finding, and only a comment changed
- status tag `[SKIPPED: unreachable, <pointer>]`: no caller reaches the defect, and the fix would add a cost on a hot path
- an entry keeps the `Verdict` line it had in the scan report
```

### `tools/validate-report.mjs` — 3 checks

- both branches: a `**Verdict:**` line matches
  `^\*\*Verdict:\*\* (defect|deliberate-recorded|deliberate-unrecorded|unreachable|unknown) \| \*\*Evidence:\*\* (.+)$`,
  and its evidence is `none` exactly when the verdict is `unknown`;
- fix branch: an entry with a deliberate verdict and the tag `[FIXED]` fails with "a deliberate
  finding was changed";
- fix branch: an entry with a deliberate verdict and no status tag fails with "a deliberate
  finding was not closed", the counterpart of slice 1's "cost-bearing finding was not attempted".

### `tools.test.mjs` — 1 test widens, 1 joins

- "the fix design algorithm names no stack" reads `fix-design.md` and `investigate.md`, and is
  renamed "the stack-free algorithm files name no stack";
- a new validator test: a well-formed `Verdict` line on a scan entry is accepted, `unknown` with
  a pointer is rejected, and in the audit trail a `deliberate-recorded` entry tagged `[FIXED]` is
  rejected.

### `AGENTS.md`

- `domain_map:` gains 1 row: the verdict algorithm, `references/investigate.md`;
- the stack-free `forbidden_behaviors:` line names both algorithm files;
- `verification:` — the tool test count moves from 16 to 17.

### `README.md`

1 short section: what `investigate` reads, the 5 verdicts and what fix mode does with each, that
it changes no code, and the comment form a `deliberate-unrecorded` verdict leaves behind.

## 6. Cost of the change

| Touchpoint | What changes |
|---|---|
| `cnlp/profiles/reference.md` | 2 names in `custom_sections` |
| `ts-reviewer/references/investigate.md` | new, 49 lines |
| `ts-reviewer/references/stack-cost.md` | 2 lines changed, 1 block of 11 lines |
| `ts-reviewer/SKILL.md` | 1 run-mode row, 1 row changed, 1 precondition widened, 1 prohibition changed and 1 added, 3 workflow steps, 1 report bullet, 1 report line |
| `ts-reviewer/references/fix-workflow.md` | 2 workflow steps, 2 changed, 1 renumbered range, 1 prohibition, 3 report bullets |
| `ts-reviewer/tools/validate-report.mjs` | 3 checks |
| `tools.test.mjs` | 1 test widened, 1 added |
| `AGENTS.md`, `README.md` | 1 row, 1 line, 1 count; 1 section |
| `package.json` | `3.3.0`: a new run mode and an optional report line, so no existing report breaks |
| `fixtures/intent-corpus/` | new, unpublished, outside every directory `npm test` scans |

Run-time cost, per `###` finding: 1 test search, 1 history command on the line range, 1 read of
the decision records, shared by every finding of the run, and a caller trace only when the
first 4 sources are silent. A scan without investigate pays nothing.

## 7. What slice 2 leaves to slice 3

Slice 3, the Performance domain, is unchanged by this proposal: its `engine` lines fire on
`hot: yes`, and a verdict decides only whether a finding is fixed. Two notes for it:

- an `engine` finding is the kind most likely to be deliberate: a hand-unrolled loop or a
  pre-sized array is often written on purpose. Its fixture should carry 1 case whose intent
  sits in a decision record, so slice 3's red run sees investigate close it.
- slice 3 adds the third set of stack slots; that is the moment to rename `stack-cost.md` (§4).

## 8. The fixture and its answer key

`fixtures/intent-corpus/`, built like the cost corpus, with 1 difference: the history is part
of the fixture. `prepare.mjs` replays an ordered list of commits from `history.mjs` — each an
author message and the files it writes — so that `git log -L` on a planted line returns the
planted message. The project has a `node:test` suite (`"test": "tsc && node --test dist/"`),
since 2 cases rest on tests, and `package.json#exports` names 1 entry module, so the caller
rule of case 5 is decidable.

The 7 cases. Cases 1–6 each end in 1 verdict; case 7 is a control the scan must drop as today.

| # | File and shape | Flagged by | Evidence planted | Verdict and pointer | Accepted outcome | Forbidden outcome |
|---|---|---|---|---|---|---|
| 1 | `src/layers.ts`, exported `sortLayers(layers)` calling `layers.sort(byZ)` on the parameter | Modernization | `docs/adr/0002-layers-sort-in-place.md`: the renderer keeps the array between frames, so the sort is in place | `deliberate-recorded`, record `docs/adr/0002-…` | `[SKIPPED: deliberate, …]`, the file untouched | `toSorted()` or a copy applied |
| 2 | `src/physics.ts`, `@hotpath integrate(body, dt)` writing `body.position` and `body.velocity`: slice 1's case 3 | Code Quality | the commit introducing the lines: "integrate advances each body in place: the step loop owns the bodies and reuses them every frame" | `deliberate-unrecorded`, history `<sha>` | 1 comment above the line citing the sha, no other change, no rung 7 question | a new object; a rung 7 question; a JSDoc rewrite citing nothing |
| 3 | `src/report.ts`, exported `buildReport(rows)` calling `rows.sort(byName)` | Modernization | `src/report.test.ts`: "buildReport leaves rows sorted by name for the pager", asserting the order of `rows` after the call | `deliberate-unrecorded`, test `src/report.test.ts:<line>` | 1 comment citing the test; the suite passes as at baseline | `toSorted()` applied, or applied and reverted |
| 4 | `src/config.ts`, exported `loadConfig(text)` with `JSON.parse(text) as Config` | Boundary Validation | a test asserting `loadConfig('{"port":"80"}')` throws, failing at baseline; and a commit message "cast the config: the deploy tool validates it" | `defect`, test `src/config.test.ts:<line>`: the test is read before the history | the guard or schema fix applied; the baseline failure passes after it | a deliberate verdict from the history message |
| 5 | `src/ids.ts`, module-private `toIndex(value: unknown)` returning `value as number`, called only by `nextIndex()` with a `number` | Type Safety | none: the module is not re-exported by the entry module | `unreachable`, callers `src/ids.ts:<line>` | the zero-cost fix applied, a typed parameter | `defect` or `unknown`; a runtime guard added |
| 6 | `src/legacy.ts`, exported `lastN(items, n)` calling `items.reverse()` | Modernization | none: 1 commit "wip", no test, no record | `unknown`, `none` | the fix applied as today, the verdict line naming `unknown` | `defect` or a deliberate verdict |
| 7 | `src/cache.ts`, `entries.sort(byAge)` on a parameter under `// Sorted in place on purpose: callers keep the order` | Modernization | the comment at the site | none: `SKILL.md:53` drops it at scan | no finding in the report | a finding, or a verdict on it |

Project-wide rules:

- investigate changes no file: `git diff` after the investigate step is empty, and the report is
  the only file it writes.
- every verdict line carries the pointer the key names, up to the line number.
- the cost corpus, run once with `3.3.0` in auto mode, still passes slice 1's bar, and every one
  of its entries reads `unknown`: no case there has evidence, and its package declares no entry
  point.

Protocol per run: slice 1's, through the sub-agent prompt of `fixtures/cost-corpus/README.md`,
with 3 requests in place of 2: `review my TypeScript code`, `investigate the report`, `fix the
report`. A `3.2.0` red run makes the first and the third.

## 9. The plan

| Step | Work | Output | Exit criterion | Status |
|---|---|---|---|---|
| 1 | this proposal | `docs/ts-reviewer-investigate-proposal.md` | the operator has answered §10 | open: written 2026-10-01 |
| 2 | build the fixture | `fixtures/intent-corpus/` as §8 lays it out | `npx tsc --noEmit` clean, `npm test` in the project fails only the case 4 test, `git log -L` returns each planted message; `npm test` of this repository unaffected | open |
| 3 | red run: `3.2.0` against the fixture, 1 run | the first table of `fixtures/intent-corpus/RESULTS.md` | the scan flags cases 1–6 and drops 7, and >= 2 of cases 1–3 show a forbidden outcome | open |
| 4 | build slice 2 | the edits of §5, version `3.3.0` | `npm test` passes, with the widened and the new test | open |
| 5 | green runs: 3 cold runs of `3.3.0`, plus 1 cost corpus run | 4 more rows | the pass bar below, in each run | open |

**The gate at step 3.** Fewer than 2 of cases 1–3 forbidden means the model already reads tests
and history unprompted; stop, record, and reconsider whether a prohibition is the whole fix.

**The pass bar at step 5**, per run: the verdict and the pointer match the key on cases 1–6;
every accepted outcome holds and no forbidden one is in `git diff`; case 7 is not reported; the
investigate step leaves `git diff` empty; and the cost corpus run passes slice 1's bar with every
verdict `unknown`.

## 10. Questions for the operator

Each has a recommendation; the proposal is written to it.

1. **Which findings does investigate cover?** Recommended: every `###` entry. Alternative: only
   `Hot path` entries and `Auto-fixable: No` entries, where intent changes the outcome most. The
   alternative is cheaper and misses case 3, where the fix is auto-fixable and the test breaks.
2. **Does auto mode run investigate between scan and fix?** Recommended: yes. Auto mode has no
   operator between the 2 steps, which is where the runs guessed intent. Alternative: investigate
   runs only on request, and auto stays scan, fix, re-scan.
3. **Does `unreachable` close a rung 7 finding without the operator?** Recommended: yes, keeping
   the code and citing the caller trace: a per-call cost for a defect no caller reaches is not
   worth a question. Alternative: the rung 7 question stays, with the verdict shown beside it.
4. **What does fix mode do with `unknown`?** Recommended: fix as today, and the verdict line
   tells the operator which fixes rest on no evidence. Alternative: leave every `unknown` finding
   untouched for the operator, which on a project with no tests and no history is every finding.
5. **Does a history message count as intent evidence?** Recommended: yes, when it names the
   flagged behaviour; a test read first overrides it (case 4). Alternative: history counts only
   as defect evidence, and intent needs a test or a record, which leaves case 2 at `unknown` and
   its rung 7 question in place.
