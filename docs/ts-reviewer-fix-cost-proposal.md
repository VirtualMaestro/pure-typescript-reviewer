# Proposal — make `ts-reviewer` fix mode design a fix before it applies one on a hot path

**Audience:** the agent maintaining the `ts-reviewer` skill repository, working in a session
opened in this repository. This document is the whole input: the discussion that produced it
happened in another repository and is not available to that session.
**Status:** steps 1..4 of §9 are done (2026-09-30 and 2026-10-01): slice 1 is built as `3.2.0`
and `npm test` passes. Step 5 is done: 3 green runs of `807eadf` pass the bar, after 2 wording
changes recorded in `fixtures/cost-corpus/RESULTS.md`. Slice 1 is complete; slices 2 and 3
each get their own proposal (§7), and 1 smoke run on Codex is still open (§9).
**Decided:** the fix-cost logic lives inside this package, not in a separate global skill
package, so `ts-reviewer` stays self-contained and installs with one command. The content is
cut in 3 layers (§3) so that a later port to C#/Unity copies 1 file, rewrites 1 file, and
rewires the rest. The work ships in 3 slices; this proposal covers slice 1 only. The marker is
`@hotpath`, the version is `3.2.0`, `hot: unknown` triggers a design, and fixture cases 3 and 4
end at rung 7: §10 records each answer with its reason.

**What implementation owns:** reviewing the answer key in §8 with the operator, building the
fixture, the red run, copying the lines in §5 into the skill, `npm test`, and the 3 cold runs.

**Numbering convention:** a step number inside a code block in §5 is the number the step has
after every insert in that file. "The current step N" names a step by its number in `3.1.0`.

---

## 1. Diagnosis

Fix mode is mechanically strong and has no design step. `references/fix-workflow.md`
`workflow:11` is the entire instruction for *how* to fix:

> 11. apply the fix the report describes

The fix it applies was written during the scan, in the `fix` field of `subagent_template`
(`SKILL.md:280`), by a sub-agent reviewing 1 domain. That agent is the one with the least
context about what the fix costs at run time. Nothing downstream checks it:

| Where | What it says | What it leaves open |
|---|---|---|
| `fix-workflow.md:96` | "do not change what the code does: a fix changes how it does it" | the cost lives in *how*, and nothing bounds it |
| `fix-workflow.md:38-42`, workflow steps 8 and 9 | the baseline is the test suite, pass or fail | no cost baseline |
| `SKILL.md:210-220` | severity from impact | no field for what the fix adds |

The reviewer's own checklists already recommend fixes that add a cost to every call:

| Checklist line | Reported fix | Cost on a hot path |
|---|---|---|
| `modernization.md:37-38`, `.sort()` on a parameter | `toSorted()`, or copy first | 1 array allocation per call |
| `code-quality.md:41`, a function mutating its input parameter | return a new value | 1 object allocation per call |
| `type-safety.md:15-16`, an unvalidated `as Type` | a type guard or a validation function | 1 runtime check per iteration |
| `boundary-validation.md:11-13`, `as T` on `JSON.parse` | a schema parse | 1 validation per message |

Each of those is the right fix in cold code and the wrong default in a frame loop, a parser,
or a message handler. The fix is correct, the bug is gone, and the code is slower. That is the
failure this proposal removes.

Performance is also absent as a review domain: the only line is `code-quality.md:45`, "an
array lookup in a hot path", and nothing in the skill says what a hot path is. Slice 1 defines
the term; the domain is slice 3 and out of scope here (§7).

## 2. The design in one paragraph

Every finding gets 2 fields at scan time: whether it sits on a hot path, and which kind of
cost its reported fix adds. A finding that is on a hot path *and* whose fix adds a cost is
"cost-bearing". Fix mode applies every other finding exactly as today, so the change costs
nothing on the common path. For a cost-bearing finding, fix mode walks a fixed ladder of 7
rungs ordered from "the cost is never paid" to "the cost is paid on every iteration", and
applies the first rung that closes the finding. When only the last rung closes it, the code
stays untouched and the operator picks between the reported fix, with its cost kind stated,
and the current code, with its defect stated.

**Every cost-bearing finding is designed, `Auto-fixable: Yes` or `No`** (decided 2026-10-01,
after the red runs of §9). What follows from that:

- `auto_fixable` is advisory on a cost-bearing finding: the ladder decides what is fixable. The
  red runs showed the sub-agent's `No` to be a hedge about cost ("keep the in-place update for
  the hot path"), and the ladder is that reasoning made explicit and recorded.
- every cost-bearing finding ends with a status tag: `[FIXED]` at rung 1..6, `[FIXED]` at rung 7
  when the operator picks the fix, `[SKIPPED: rung 7 <kind>]` with both variants recorded, or
  the loop's own `[FIX FAILED]` and `[FIX REVERTED]`. No cost-bearing finding is left untagged,
  and the validator's fix-mode branch fails one that is.
- the operator answers more questions: each rung 7 design is a choice. They are shown together
  at 1 moment of the run, and a run with no operator records `[SKIPPED: rung 7 <kind>]` with
  the variants, never a silent skip. Slice 2's `deliberate` verdicts are what reduce the
  questions later, by removing findings before they reach the ladder.
- a design can be a larger diff than the reported fix: rung 1 changes a signature and its
  callers through the cascade of fix step 12, and rung 4 adds module state and makes the
  function non-reentrant, which the `Fix design` line records.
- a merged entry keeps 1 fix, and its `hot` and `fix_cost` are those of the fix it keeps.
- the red-run gate counts a costly fix applied and a cost-bearing finding declined without a
  design as the same failure: both leave the operator without the choice.

## 3. Three layers

| Layer | File | Holds | On a port to another stack |
|---|---|---|---|
| Algorithm | `references/fix-design.md` | the ladder, the walk, the prohibitions | copied byte for byte |
| Stack | `references/stack-cost.md` | the hot marker, the cost kinds, the form of each rung, the measurement command | rewritten block by block, block names kept |
| Wiring | `SKILL.md`, `references/fix-workflow.md`, `references/code-quality.md`, `tools/validate-report.mjs` | the 2 scan fields, the trigger, the rung 7 route, the report lines | rewritten for the host skill |

The block names of `stack-cost.md` are the contract between the first 2 layers:
`hot_marker`, `cost_kinds`, `rung_forms`, `measurement`. A port fills the same 4 blocks.

The algorithm file speaks only in its own terms: "the hot marker", "a cost kind", "a
cost-bearing finding". It never names the `@hotpath` tag, the `Hot path` report line, or the
`hot` and `fix_cost` fields, which are the stack and wiring layers' names for those terms.

The separation is held by a test, not by intent: `tools.test.mjs` asserts that
`fix-design.md` names no language, runtime, or tool (§5). Without it, stack terms leak into
the algorithm within weeks and the port becomes a line-by-line review.

The seam is a hypothesis until a second stack uses it. That is why the algorithm file should
stay small and why nothing here extracts it into a shared package: 2 copies are cheaper than
a dependency, and a third stack is the moment to extract.

## 4. Skipped on purpose

| Skipped | Why, and when to add it |
|---|---|
| an intent check: is the flagged pattern a deliberate trade-off | slice 2, the `investigate` mode. Slice 1 still redesigns the fix; it does not yet ask whether the finding should exist |
| a Performance review domain | slice 3. It needs a pattern catalog; slice 1 needs only the cost kinds |
| a scan-time `Fixability` field on every finding | the rung is known only after the design, and the design runs in fix mode. A rung 7 finding takes 1 status tag and 1 operator step of its own, next to the `needs-confirm` steps (§5) |
| reusing the `needs-confirm` value for a rung 7 finding | `references/architecture.md` owns that value and its fix-mode behaviour, `fix-workflow.md` `scope:` says so, and the value lives in a `Fixability` field only architecture entries carry. A rung 7 finding has no field to hold it |
| a project file listing hot paths | `SKILL.md:47` forbids requiring a domain-doc file. The marker lives in the code |
| hotness inherited from callers: a function called from a `@hotpath` function | it needs a call graph. Add it when a real run shows cost-bearing findings missed for that reason |
| `*.bench.ts` and `vitest bench` detection | 1 signal, the `bench` script, is enough to prove the measurement path, and the fixture carries one (§8). Add the second when a project uses it |
| a per-fix measurement | the `bench` script measures the project, so fix mode runs it 1 time before the first change and 1 time after the last, and every designed fix carries the same pair. A per-function number needs a bench harness the skill does not own |
| edits to the domain checklists beyond 1 `scope:` line in `code-quality.md`, and 1 `non_findings:` line in `modernization.md` that the green runs showed necessary: without it `modernization.md:37` flags the rung 4 form on a rescan | the trigger already reroutes the fix. `AGENTS.md` forbids restating 1 fact in 2 files, and the `scope:` line is the form it allows for a term another file owns |
| classification by the parent agent instead of the sub-agent | the sub-agent has the code and the fix in context. Move it when a real run shows the fields filled wrong |
| a shared npm package for the algorithm file | see §3 |

## 5. Exact landing spots in the skill

The 2 new files and every inserted line below were run through this repository's own checker,
`bodyIssues` and `lexiconIssues` from `cnlp/cnlp.js`, with the 5 new block names added to an
in-memory copy of the reference profile: 0 issues, and every line within the 150-character
target. The stack-free regex of the new test (below) matches nothing in `fix-design.md`.
`npm test` on the real files passes as of step 4 of §9: 21 tests, 19 pass, 2 skipped offline.

### `cnlp/profiles/reference.md` — first, per `AGENTS.md` `workflow:8`

`custom_sections:` gains 5 names, after `test_runners`:

```
- ladder
- hot_marker
- cost_kinds
- rung_forms
- measurement
```

`ladder` is a term the steps use, so it sits before `workflow:` in `fix-design.md`, as
`cnlp-format.md` §7 places a custom block of that kind.

### New file `ts-reviewer/references/fix-design.md` — the algorithm

```
purpose:
- state how to design a fix before applying it, when the reported fix adds a cost on a hot path
- read it in fix mode before the first cost-bearing finding

scope:
- `references/stack-cost.md` owns the hot marker, the cost kinds, the form of each rung, and the measurement command
- `references/fix-workflow.md` owns the fix loop, the snapshots, the verification, when the measurement runs, and what the report records
- this file names no language, no runtime, and no tool, so a second stack reuses it unchanged

read_first:
- a hot path is code the hot marker covers, or a loop body no marker covers
- a cost is what a fix adds to every call or every iteration, and the current code does not pay
- a cost-bearing finding sits on a hot path and its reported fix adds a cost, and the report marks it
- the reported fix is 1 candidate, written during the scan before anyone checked what it costs
- a rung is a place to pay the cost, and the ladder orders the rungs from never to every iteration
- rungs 2..4 each pay 1 time, ordered by how much they change the code: boundary moves the cost, hoist moves a line, reuse adds module state
- a rung closes a finding when nothing reaches the defect the finding names any longer, and a rescan would not raise it again
- a rung 1..4 closes a finding only when the place it pays the cost lies outside the marker or the loop that makes the path hot
- rungs 5 and 6 pay inside the hot path, in a development build or on the rare path only
- a value from outside the process has no precondition a caller can hold, so rung 5 never closes a finding on it

ladder:

| Rung | Name | When the fix pays the cost |
|---|---|---|
| 1 | remove | never: the types make the case unrepresentable, and the check or the copy has nothing left to do |
| 2 | boundary | 1 time, where the value enters the module, outside the hot path |
| 3 | hoist | 1 time, before the loop, or 1 time at module load |
| 4 | reuse | 1 time, at setup: a buffer or an object the module owns serves every iteration, and only a refill remains |
| 5 | dev-only | in a development build only: an assertion plus a precondition the callers hold, stated at the function |
| 6 | split | on the rare path only: the common case takes a path that skips the cost |
| 7 | in-place | on every iteration: the reported fix as written |

workflow:
1. read the finding, its snippet, and the enclosing function in its current state
2. name the cost kind the reported fix adds, and the marker or the loop that makes the path hot
3. walk the ladder from rung 1, and stop at the first rung that closes the finding
4. state in 1 line per rung why each rung above the chosen one does not close the finding
5. apply a rung 1..6 design in place of the reported fix
6. write the 2 variants of a rung 7 finding: the reported fix with its cost kind, and the current code with the defect it keeps
7. hand a rung 7 finding to the operator with both variants, and leave its code untouched until the operator picks 1

forbidden_behaviors:
- do not apply the reported fix on a hot path before walking the ladder
- do not pick rung 7 while a rung above it closes the finding
- do not count a rung as closing the finding when it leaves the defect reachable
- do not write "no regression" or "no impact" without a measured number beside it
- do not design a fix for a finding that is not cost-bearing: the reported fix applies as written
- do not leave a cost-bearing finding without a design: a rung, or the operator's choice, closes every one
- do not close a finding by documenting the flagged pattern as intended: keeping the pattern is the second variant of rung 7, and the operator picks it
```

The last line was added after green runs 5 and 6 (§9), where case 3 was declared intended
without the operator, once by the scan and once by fix mode. Its scan-side counterpart is a
`SKILL.md` `forbidden_behaviors:` line: "do not drop a finding as deliberate unless a comment
or a doc at the site says so: the operator decides what is intended".

Three `read_first` lines carry decisions the first draft left implicit:

- *rung 1..4 pays outside the marker or the loop.* A `@hotpath` message handler is its own
  boundary, so a schema parse inside it is rung 7, not rung 2: the cost lands on every call
  of the hot function either way. Without this line, rung 2 "closes" every handler finding.
- *a rescan would not raise it again.* An explicit `out` parameter still mutates a parameter,
  and `code-quality.md:41` flags it again on the re-scan of auto mode. A design the checklist
  re-flags is a loop, not a fix.
- *rung 5 never closes a finding on outside data.* A dev-only assertion leaves the defect
  reachable in production, so it closes a finding only where the callers hold the precondition.

### New file `ts-reviewer/references/stack-cost.md` — the stack slots

```
purpose:
- fill the slots `references/fix-design.md` reads, for the stack `target_stack` names
- load it with the checklist of every analysis pass, and before fix mode designs a fix

scope:
- `references/fix-design.md` owns the design algorithm, and this file owns every stack term it needs
- a port to another stack rewrites this file block by block, and keeps every block name

hot_marker:
- the JSDoc tag `@hotpath` on a function, a method, or a class marks its body as a hot path
- `@hotpath` in the leading comment of a file marks every function in that file
- an iteration callback is the function passed to `forEach`, `map`, `filter`, `reduce`, `flatMap`, `some`, `every`, `find`, or `sort`
- `hot` is `yes` when a marker covers the snippet
- `hot` is `unknown` when no marker covers the snippet and it sits in a loop body or an iteration callback
- `hot` is `no` in every other case

cost_kinds:

| Kind | What the fix adds to every call or iteration | Examples |
|---|---|---|
| `none` | nothing at run time | `??` for `\|\|`, `satisfies`, a type annotation, `readonly` |
| `alloc` | a heap allocation | `toSorted()`, a spread copy, `structuredClone()`, a closure, a wrapper object |
| `pass` | a traversal of a collection, or a higher complexity class | a second `.filter()`, a lookup inside a loop |
| `check` | a runtime validation or a guard | a schema parse or a type guard in place of `as T` |
| `async` | an `await`, a promise, or a timer | `await` on a synchronous path, a `Promise.all` wrapper |

rung_forms:

| Rung | Form in this stack |
|---|---|
| remove | a branded type, a discriminated union, or a narrowed parameter type, which leaves the cast or the guard nothing to check |
| boundary | 1 schema parse or 1 guard where the value enters: the exported function, the message handler, the module entry |
| hoist | a `const` computed above the loop, a scratch array declared above the loop and refilled in it, or a `RegExp` or a closure lifted to module scope |
| reuse | a module-owned scratch array or object, refilled on every iteration, or a typed array for numeric data |
| dev-only | an assertion behind a module-level `const DEV = process.env.NODE_ENV !== 'production'`, plus the precondition in the JSDoc |
| split | a test for the common case first, such as `length <= 1` or an identity check, then the costly path |
| in-place | the reported fix as written |

measurement:
- a `bench` or `benchmark` script in `package.json` is the measurement, run with the package manager the lockfile names
- the output goes to `$TMPDIR/ts-reviewer-bench-before.log` and `$TMPDIR/ts-reviewer-bench-after.log`, next to the test logs
- the number recorded is the output line naming the changed function or file, and the last output line when no line names it
- a project with neither script has no measurement, and the record reads `unmeasured`
```

The `dev-only` form hoists the environment read to module scope on purpose: reading
`process.env` inside a hot function is itself a per-call cost.

### `SKILL.md` `subagent_template:` — 1 line after `Read the reference checklist:`, 2 JSON fields after `auto_fixable`

```
Read the cost slots: [STACK_COST_PATH], then fill `hot` and `fix_cost` for every finding.
Write `fix` as a change after which a rescan would not raise the finding again, whatever it costs, and fill `fix_cost` for that change: on a hot path, fix mode designs a cheaper one.
```

The second line was added after the first 3 green runs (§9): a scan sub-agent that has read
the cost slots otherwise reports a zero-cost fix that leaves the defect, with `fix_cost: none`,
and the finding never reaches the ladder.

```
  "hot": "yes|no|unknown",
  "fix_cost": "none|alloc|pass|check|async",
```

### `SKILL.md` `workflow:` — 1 step after the current step 14

```
15. count the markers `hot_marker` in `references/stack-cost.md` defines across the files in scope, and name the count in the discovery summary
```

### `SKILL.md` `workflow:` — 2 steps after the current step 40, which the insert above makes 41

```
42. keep a finding whose `hot` is not `no` and whose `fix_cost` is not `none` as a full entry carrying the `Hot path` line, whatever its severity
43. keep that finding out of every summary table and every Recurring Pattern entry, whatever steps 36, 40, and 41 do with its siblings: fix mode needs its snippet to design the fix
```

The steps that follow renumber; none of them changes. Step 43 carves an exception out of the
current steps 35, 39, 40, and 46: the placement changes, and the severity rules of steps 35
and 36 still apply. A `###` entry under `## Medium Issues` or `## Low Issues` is already
legal: `validate-report.mjs:145-146` accepts it, and the current step 46 writes the top 10 that
way.

### `SKILL.md` `discovery_summary:` — 1 row, after `Test runner`

```
Hot paths: <N> marked / none: hot rests on loop bodies alone
```

### `SKILL.md` `report_format:` — 1 bullet, and 1 optional line directly under the `**Category:**` line

```
- the `Hot path` line is present on a finding whose `hot` is not `no` and whose `fix_cost` is not `none`, and absent on every other finding
```

```
**Hot path:** yes/unknown | **Fix cost:** alloc/pass/check/async
```

The line is present only on a cost-bearing finding. A report without it is a valid report, so
every report written by `3.1.0` still validates and the contract stays backward compatible.
The value pairs read `yes/unknown` and not `yes | unknown`: in this line the pipe separates
fields, as it does on the `**Category:**` line.

No `forbidden_behaviors:` line joins these. Step 42, the bullet, and the validator check
already hold the fact; `cnlp-format.md` §6 forbids stating it a third time.

### `references/code-quality.md` `scope:` — 1 line

```
- the hot path that `collections and iteration` names is the one `hot_marker` in `references/stack-cost.md` defines
```

`code-quality.md:45` has said "hot path" since before this proposal, and this is the form
`AGENTS.md` `workflow:2` gives for a term a neighbour owns.

### `references/fix-workflow.md` `workflow:` — 1 step after the current step 9

```
10. run the measurement `references/stack-cost.md` names when the report holds a `Hot path` line, and record it with the baseline
```

`read_first` line 13, "the baseline taken in step 9", stays true: the insert is after 9.

### `references/fix-workflow.md` `workflow:` — the current step 11 becomes 4 steps

```
12. apply the fix the report describes when the finding carries no `Hot path` line
13. read `references/fix-design.md` and `references/stack-cost.md` before the first finding that carries a `Hot path` line
14. design the fix of a `Hot path` finding, auto-fixable or not, as `references/fix-design.md` states, and apply the design in place of the reported fix
15. leave the code of a finding whose design ends at rung 7 untouched, and carry its 2 variants to step 35
```

Step 14 overrides `Auto-fixable: No` on purpose (§2): a `Hot path` finding is always attempted,
and the ladder, not the scan sub-agent, decides what is fixable.

### `references/fix-workflow.md` `workflow:` — the current step 21 renumbers its range

The current step 21 reads "repeat steps 10..20 for each file in the work plan". The loop body
it names is now steps 11..24:

```
25. repeat steps 11..24 for each file in the work plan
```

### `references/fix-workflow.md` `workflow:` — 3 steps after the current step 30, which the inserts above make 34

```
35. show the operator the 2 variants of each rung 7 design, and apply the variant the operator picks through the same file-by-file compiler loop
36. tag a rung 7 finding the operator did not apply `[SKIPPED: rung 7 <kind>]`
37. run the measurement again after the last change to the code, and write both numbers on every designed fix
```

The current steps 29 and 30 stay as they are: they show and apply a `needs-confirm`
architecture finding, and step 35 sits next to them because it is the same moment in the run,
after the compiler loop is clean. The second measurement runs after step 35 on purpose: a
rung 7 variant the operator applies is a change to the code, and the first draft measured
before it. The current steps 31..35 become 38..42.

### `references/fix-workflow.md` `forbidden_behaviors:` — 1 line, after the current line 96

```
- do not change what the code costs on a hot path: a fix that adds a cost kind there goes through `references/fix-design.md`
```

### `references/fix-workflow.md` `report_format:` — 3 bullets, and 2 lines in the `[FIXED]` entry shape

```
- a designed fix carries the `Fix design` line and the `Rejected rungs` line under its AFTER snippet
- status tag `[SKIPPED: rung 7 <kind>]`: no rung above 7 closes the finding, and the operator kept the code or gave no answer
- a `[SKIPPED: rung 7 <kind>]` entry carries both variants under `Recommended fix`, and the operator's answer under `Why auto-fix failed`
```

````markdown
**Fix design:** rung <N> <name> | **Cost kind:** <the kind the reported fix adds> | **Measured:** <before> -> <after>, or unmeasured
**Rejected rungs:** <N> <name>: <reason>; <N> <name>: <reason>
````

A rung 7 variant the operator applies is a `[FIXED]` entry whose `Fix design` line reads
`rung 7 in-place`. A rung 7 finding the operator kept, or left unanswered, is the tagged entry
above. Those 2 tags and the `Fix design` line are the whole rung 7 vocabulary of the report.

### `tools/validate-report.mjs` — 1 check, next to the `Problem` and `Fix` checks at line 168

```js
const cost = block.find((line) => line.startsWith("**Hot path:**"));
if (cost && !/^\*\*Hot path:\*\* (yes|unknown) \| \*\*Fix cost:\*\* (alloc|pass|check|async)$/.test(cost)) {
  fail(index + 1, "Hot path line has an invalid shape");
}
```

The check runs inside the `###` loop over every issue section, so it covers a cost-bearing
entry under `## Medium Issues` and `## Low Issues` as well as under `## Highest + High Issues`.

A second check sits in the fix-mode branch `3.1.1` added, next to the bucket count of each
entry: an entry carrying a `**Hot path:**` line and no status tag fails with "cost-bearing
finding was not attempted". That is the "no silent skip" rule of §2 held mechanically.

### `tools.test.mjs` — 2 tests

```js
test("the fix design algorithm names no stack", () => {
  const raw = readFileSync(path.join(repoRoot, "ts-reviewer", "references", "fix-design.md"), "utf8");
  assert.doesNotMatch(raw, /typescript|javascript|\bnode\b|\bv8\b|\btsc\b|\bnpm\b|\.ts\b|jsdoc|eslint|vitest/i);
});
```

The second test extends the existing validator fixtures: a report with a well-formed `Hot path`
line on a Medium `###` entry is accepted, and one with `**Fix cost:** none` is rejected.

### `AGENTS.md`

- `domain_map:` gains 2 rows: the fix design algorithm, `references/fix-design.md`; the stack
  cost slots, `references/stack-cost.md`.
- `forbidden_behaviors:` gains 1 line:
  ```
  - do not name a language, a runtime, or a tool in `references/fix-design.md`: `tools.test.mjs` holds that file stack-free
  ```
- `verification:` — the tool test count moves from 14 to 16.

### `README.md`

1 short section: what `@hotpath` is, that it is optional, that without it only loop bodies count,
that a project running `eslint-plugin-jsdoc` with `check-tag-names` declares the tag, and what
a rung 7 finding looks like to the operator.

## 6. Cost of the change

| Touchpoint | What changes |
|---|---|
| `cnlp/profiles/reference.md` | 5 names in `custom_sections` |
| `ts-reviewer/references/fix-design.md` | new, 49 lines |
| `ts-reviewer/references/stack-cost.md` | new, 43 lines |
| `ts-reviewer/SKILL.md` | 1 template line, 2 JSON fields, 3 workflow steps, 1 summary row, 1 report bullet, 1 report line |
| `ts-reviewer/references/fix-workflow.md` | 8 workflow steps (4 replace 1), 1 renumbered range, 1 prohibition, 3 report bullets, 2 report lines |
| `ts-reviewer/references/code-quality.md` | 1 `scope:` line |
| `ts-reviewer/tools/validate-report.mjs` | 1 optional-line check |
| `tools.test.mjs` | 2 tests |
| `AGENTS.md`, `README.md` | 2 rows, 1 line, 1 count; 1 section |
| `package.json` | `3.2.0`: the new report line is optional, so no existing report breaks |
| `fixtures/cost-corpus/` | new, unpublished: outside `files`, outside the root `tsconfig.json` `include`, outside the directories `cnlp/skill-format.test.js` scans |

Run-time cost for a user of the skill: every scan sub-agent reads 1 more file of 43 lines. Fix
mode reads 2 more files only when the report holds a cost-bearing finding. A project with no
`@hotpath` marker and no flagged loop body pays the scan read and nothing else.

## 7. The later slices, so that slice 1 does not block them

| Slice | What | Lands as | Layer rule it must keep |
|---|---|---|---|
| 2 | an `investigate` run mode: before a finding is called a bug, name why the code is this way. Verdicts `defect`, `deliberate-recorded`, `deliberate-unrecorded`, `unreachable`, `unknown`, each with a fixed next action | 1 row in `run_modes`, 1 stack-free file `references/investigate.md` | the same stack-free test covers the new file |
| 3 | a Performance review domain | `references/performance.md`: `checks:` groups `structural` and `engine`, and outdated advice as `non_findings:` | the catalog is stack layer; `engine` lines fire on `hot: yes` only |

Notes that slice 2 and 3 should not lose:

- Slice 2's evidence order is cheapest first, stopping at the first decisive one: the comment at
  the site, a test that pins the behaviour, `git log -S` on the exact lines, an ADR, then the
  caller trace. `unknown` is a valid result and goes to the operator; it is not `defect`.
- Slice 2's `deliberate-unrecorded` verdict ends in a recorded comment, not a code change. That
  record is what makes the next investigation of the same site cost 1 comment read.
- Slice 2 revisits fixture cases 1 and 3 (§8): an in-place sort per frame and a body integrated
  in place are the kind of thing a project does on purpose, and slice 1 designs the fix without
  asking.
- Slice 3's `non_findings:` block exists to stop advice that no longer holds on the pinned
  engine, such as "`try`/`catch` deoptimizes" or caching `arr.length`.
- Each slice gets its own proposal after step 5 of §9, because the cold runs of slice 1 will
  change what the next slice needs.

## 8. The fixture and its answer key

`fixtures/cost-corpus/` at the repository root:

```
fixtures/cost-corpus/
├── README.md      the protocol below
├── KEY.md         the answer key; never copied into a run
├── RESULTS.md     1 row per run: date, skill version, runtime, model, per-case outcome
├── prepare.mjs    steps 1..3 of the protocol as 1 command
└── project/       the throwaway TypeScript project the skill is run against
    ├── .gitignore        `node_modules/`, `dist/`, `code-smells/`, `.claude/`: the run's own artefacts stay out of `git diff`
    ├── package.json      type module, `typescript` and `@types/node` in devDependencies, a `bench` script: `tsc && node dist/bench.js`
    ├── package-lock.json committed, so `references/dependency-hygiene.md` has no missing lockfile to report
    ├── tsconfig.json     matching target_stack
    └── src/
        ├── types.ts      the shared shapes
        ├── bench.ts      calls every planted function in a loop and prints 1 line per function: `<name>: <ms> ms`, 6 lines
        └── ...           7 planted cases in 6 files: cases 1 and 6 share `updateFrame`
```

`prepare.mjs` is the protocol's steps 1..3 as 1 command: it copies `project/` to a fresh temp
directory, commits it, runs `npm install`, and copies `ts-reviewer/` of this checkout into
`.claude/skills/ts-reviewer/` there, which is what the installer writes
(`src/index.ts` `scaffoldTsReviewerSkill`). It prints the directory.

`bench.ts` does 2 jobs. It is the measurement, so the green runs prove the measurement path
end to end. And it is the caller of every planted function, so `code-quality.md:19` and `:21`
do not flood the report with dead-code findings on the fixture itself. The `unmeasured` branch
of the `measurement` block stays untested by this fixture; it is 1 line.

The 7 cases. Cases 1–4 and 7 are cost-bearing; 5 and 6 are controls that must *not* trigger a
design.

| # | File and shape | Flagged by | Reported fix | `hot` | `fix_cost` | Accepted outcome | Forbidden outcome |
|---|---|---|---|---|---|---|---|
| 1 | `src/frame.ts`, `@hotpath updateFrame(entities, opts)` calling `entities.sort(cmp)` on the parameter, and the walk after it depends on the order | Modernization | `toSorted()` | yes | alloc | rung 4: copy into a module-owned scratch array, sort that. Or rung 7, handed to the operator | `toSorted()` or a spread copy inside the function |
| 2 | `src/particles.ts`, `@hotpath step(raw: unknown[], dt)` with `item as Particle` in the loop | Type Safety | a type guard, or the typed parameter | yes | check, or none when the reported fix is the typed parameter | rung 1: type the parameter `Particle[]`, at fix time or already as the reported fix. Or rung 2: 1 guard where the array enters | a guard call inside the loop |
| 3 | `src/physics.ts`, `@hotpath integrate(body, dt)` returning the speed and writing `body.position` and `body.velocity` as an undocumented side effect | Code Quality | return a new object | yes | alloc | rung 7, handed to the operator with both variants: an `out` parameter is a parameter the checklist mutates and re-flags, and a module-owned result object changes what the caller holds | a new object or a spread applied silently; a silent skip with no variants |
| 4 | `src/socket.ts`, `@hotpath onMessage(data)` with `JSON.parse(data) as SocketMessage` | Boundary Validation | a schema parse | yes | check | rung 7, handed to the operator with both variants: the handler is the boundary, so rung 2 pays inside the hot path, and outside data closes no rung 5 | a schema parse applied silently; a silent skip with no variants |
| 5 | `src/report.ts`, cold `buildReport(rows)` calling `rows.sort(byName)`, no loop, no marker | Modernization | `toSorted()` | no | alloc | the reported fix, applied as today, no `Hot path` line, no `Fix design` line | any design step |
| 6 | `src/frame.ts`, inside the same `@hotpath` function: `opts.cmp \|\| byDepth` where `cmp?: Comparator<Entity>` | Modernization | `??` | yes | none | the reported fix, applied as today, no `Hot path` line | any design step |
| 7 | `src/unmarked.ts`, no marker: `for (const batch of batches) { batch.items.sort(ascending); ... }`, reading the median afterwards | Modernization | `toSorted()` | unknown | alloc | rung 3: a scratch array declared above the loop and refilled per batch. Or rung 4: the same array module-owned. Or rung 7, handed to the operator | `toSorted()` inside the loop with no design record |

Case 6 is typed so that `modernization.md:33` fires, the Low line, and not `:32`: a
`Comparator` is never falsy, so `??` for `||` keeps the behaviour. The first draft used
`opts.scale || 1`, where `??` changes what a `scale` of `0` does, and `fix-workflow.md:96`
would have had to be broken to apply the control.

Two project-wide rules on top of the cases:

- the fixture has a `bench` script, so every designed fix carries 2 numbers, and each number is
  a line of the matching bench log. Any "no regression" or "no impact" without a number fails
  the run.
- the design runs on every cost-bearing case, `Auto-fixable: Yes` or `No` (§2); a cost-bearing
  case left with no status tag fails the run.

Cases 3 and 4 are judgment calls, and the key is what defines "done". **The operator reviews
`KEY.md` before the red run**, not after.

Protocol, per run:

1. `node fixtures/cost-corpus/prepare.mjs`, from the checkout holding the skill build under
   test. It copies `project/` alone: `KEY.md`, `RESULTS.md`, and this proposal stay out of
   reach of the agent under test.
2. The operator opens a fresh session in the directory it printed: `review my TypeScript
   code`, then `fix the report`. The session that scores the run is not the session under test.
3. Score against `KEY.md`: `code-smells/passes/*.jsonl` for `hot` and `fix_cost` on all 7
   cases, since cases 5 and 6 carry no `Hot path` line in the report; `code-smells/report.md`
   and `git diff` for the outcomes; the 2 bench logs for the numbers. Write the row in
   `RESULTS.md`.

## 9. The plan

| Step | Work | Output | Exit criterion | Status |
|---|---|---|---|---|
| 1 | this proposal | `docs/ts-reviewer-fix-cost-proposal.md` | the operator has read §10 and answered it | done, 2026-09-30 |
| 2 | build the fixture | `fixtures/cost-corpus/` as §8 lays it out | `npx tsc --noEmit` is clean inside `project/`, `npm run bench` prints 6 lines; the operator has approved `KEY.md`; `npm test` of this repository is unaffected | open |
| 3 | red run: the current `3.1.0` skill against the fixture, 1 run | the first table in `RESULTS.md` | the scan flags all 7 cases, and >= 3 of the 5 cost-bearing cases show a forbidden outcome: the costly fix applied, or the finding declined with no design | done, 2 runs on 2026-09-30; run 2 passes the gate at 3 of 5: see the outcome below |
| 4 | build slice 1 | the edits of §5, version `3.2.0` | `npm test` passes, including the 2 new tests | done, 2026-10-01: 21 tests, 19 pass, 2 skipped offline |
| 5 | green runs: the `3.2.0` build against the fixture, 3 cold runs | 3 more tables in `RESULTS.md` | the pass bar below, in each of the 3 runs | done, 2026-10-01: runs 7..9 of `807eadf` pass the bar 3 of 3, after 2 wording changes on runs 1..6 (`RESULTS.md`) |

**The gate at step 3 is real.** The red run scores the fix outcome only, since `3.1.0` emits no
cost fields. A case the scan does not flag is a defect of the fixture, not of the skill: fix
the fixture and rerun before reading the gate. If fewer than 3 of the 5 cost-bearing cases show
the forbidden outcome, the model already avoids the costly fix unprompted and the problem is
smaller than this proposal assumes. Stop there, record the table, and reconsider: a single
prohibition in `fix-workflow.md` may be the whole fix.

**Red run outcome, 2026-09-30.** 2 runs of `3.1.0` on Opus 5.5, each as a sub-agent with 9
pass sub-agents; the rows and the fixture changes between them are in
`fixtures/cost-corpus/RESULTS.md`. Run 1 left case 3 unflagged, so the fixture changed and run
2 flagged all 7. Forbidden outcomes in run 2: 1 of 5, case 1, `toSorted(cmp)` inside the
`@hotpath` function. Case 2 got the zero-cost fix, a typed parameter, the sub-agent writing
"costs nothing on the hot path" unprompted. Cases 3 and 4 were marked `Auto-fixable: No` and
left with their defect, the fix text of case 3 reading "keep the in-place update for the hot
path". Case 7's sort was deletable, so the model deleted it, a fix outside the key; the fixture
now reads the median, so the order is needed. The gate fails as written, and what the runs
show is 2 failure modes, not the 1 of §1:

- (a) an alloc-kind fix applied on a hot path, §1's diagnosis: 1 of 2 places in run 2;
- (b) a cost-bearing finding declined as `Auto-fixable: No` and left with its defect, with no
  design and no operator choice: 2 of 5 in run 2, cases 3 and 4.

The model already reads `@hotpath` and reasons about cost from it, so the marker carries
weight before fix mode supports it. **Decided 2026-10-01:** (b) is a failure too, a silent skip
is not an outcome, and the design step runs on every cost-bearing finding (§2). The gate
counts (a) and (b) together: 3 of 5 in run 2, and step 4 is open. The 3 `3.1.0` defects the
runs exposed are fixed in `3.1.1`, outside this slice: the validator reads the fix-mode audit
trail, fix step 13 writes a regression test only when step 5 found a runner, and scan step 38
merges every finding on 1 file and line.

**The pass bar at step 5**, per run:

- `hot` and `fix_cost` match the key on all 7 cases;
- cases 1, 2, and 7 end in an accepted outcome, and no forbidden outcome is in `git diff`;
- cases 3 and 4 reach the operator as rung 7 designs with both variants and the cost of each;
- cases 5 and 6 are applied as reported, with no `Hot path` line and no `Fix design` line;
- every designed fix carries 2 numbers, each a line of its bench log.

A run that misses the bar is a finding about the wording of §5, not about the agent. Change
the line, record what changed in `RESULTS.md`, and rerun all 3.

All 3 runs on 1 runtime measure how steady the wording is, not how it travels. 1 smoke run on
Codex is worth adding once the 3 pass.

**Order is fixed.** Step 3 before step 4: a red run taken after the build cannot be trusted.
Slices 2 and 3 start only after step 5.

## 10. Decided by the operator, 2026-09-30

1. **The marker name: `@hotpath`.** Greppable, and it does not read as a generic "performance
   matters" tag the way `@perf` would. A project running `eslint-plugin-jsdoc` with
   `check-tag-names` has to declare the tag, which the README section says. Another name
   changes 1 block of `stack-cost.md`.
2. **The version: `3.2.0`.** It rests on the new report line being optional. Mandatory on
   every finding would change the meta-line regex at `validate-report.mjs:152`, and the bump
   would be major.
3. **`hot: unknown` triggers a design.** On a project that marks nothing this is the only
   trigger, and it may fire more often than wanted. Rejected alternative: treat `unknown` as
   `no` until the project marks 1 path, which makes the feature silent on an unmarked project.
   Case 7 stays a cost-bearing case.
4. **Cases 3 and 4 end at rung 7**, handed to the operator with both variants. Rejected
   alternative for case 3: an explicit `out` parameter as a rung 4 design, which needs
   `code-quality.md:41` to stop flagging a documented `out` parameter, or the re-scan of auto
   mode raises it again.
