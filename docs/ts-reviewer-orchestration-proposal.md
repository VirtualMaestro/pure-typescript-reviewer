# Proposal — run `ts-reviewer` scan in waves, with every pass checkpointed to disk

**Audience:** the agent maintaining the `ts-reviewer` skill repository.
**Status:** applied. §5 is in `SKILL.md`, the profile, and the README as of `3.1.0`; `npm test`
passes. §7 steps 2–5, the interrupted run on an outside project, are still open.
**Decided:** the document came first and the skill edit followed a go-ahead.
The default wave size is 3. The report contract does not change, so the version bump is minor
(`3.1.0`).

**What implementation owns:** copying the CNL-P lines in §5 into `SKILL.md` and
`cnlp/profiles/skill.md`, running `npm test`, and the interrupted-run check in §7.

---

## 1. Diagnosis

`SKILL.md` `workflow:24-25`:

> 24. run only the passes whose domain is in the active domain set, as sub-agents shaped by
> `subagent_template` or one domain at a time
> 25. give every agent all the scoped files when scoped files <= 20, and split by directory
> above that, with the shared types visible to every agent

On a full scan with the default domain set that is 9 sub-agents started at once, and more
than 9 once the directory split applies. Two properties of that shape cause the failure the
operator sees:

| Property | Consequence |
|---|---|
| every pass starts in the same instant | the run burns its token budget as one burst, and a usage limit stops all of them together |
| a pass returns its JSONL **as reply text** to the parent | nothing exists on disk until `workflow:34` writes `report.md`; a stopped parent holds partial replies in its own context, and the next run starts from zero |

The second property is the expensive one. A cap on concurrency without an artifact per pass
only spreads the same loss over a longer wall clock.

The operator's target shape:

```
TASK
 ├─ plan / task queue
 ├─ WAVE 1: agent A, B, C
 ├─ CHECKPOINT: collect, save artifacts, validate, mark DONE
 ├─ WAVE 2: agent D, E, F
 ├─ CHECKPOINT
 └─ …
```

## 2. What the runtimes already offer, and why none of it is the mechanism

Every claim below was checked against the current Claude Code documentation
(`code.claude.com/docs`) during this round.

| Option | Cap | Persistence | Portable | Verdict |
|---|---|---|---|---|
| `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` in `settings.json` → `env` (default 20, Claude Code ≥ 2.1.217) | yes, excess sub-agents queue | none | Claude Code only | the cheap host-side knob for the burst; goes into the README as a tip. It does not reduce the tokens a run spends, and an interrupted run still restarts from zero |
| the Workflow tool (`parallel`, `pipeline`, resume of a run) | fixed at `min(16, CPUs − 2)`, not settable | same session only, keyed on an unchanged prefix of `agent()` calls | Claude Code only, and needs an explicit opt-in per run | not a fit for a skill that also installs into `.agents/` and `.agent/` |
| sub-agent transcripts under `~/.claude/projects/<p>/<session>/subagents/` plus `SendMessage` | none | the transcript persists; resume works inside the same session | Claude Code only | the parent still holds every result in its own context |
| Agent tool `run_in_background` | none | none | Claude Code only | no |
| the skill protocol | whatever the protocol says | whatever the protocol writes | all 3 hosts | **the mechanism** |

`SKILL.md` already owns the fan-out (`workflow:24-25`) and the reply shape
(`subagent_template`). Waves and checkpoints are 6 workflow steps, 3 template lines, 2
prohibitions, and 1 small custom block — all in the layer that reaches every host.

## 3. The design

```
code-smells/
├── passes/
│   ├── queue.md                     the task queue: 1 row per pass, status, attempts, findings
│   ├── tsc.log                      the compiler output of workflow:17, reused on a resume
│   ├── lint.json                    the linter output of workflow:18, reused on a resume
│   ├── security.jsonl               1 pass = 1 file, written by the sub-agent itself
│   ├── type-safety.src-auth.jsonl   a directory-split pass: <domain slug>.<directory slug>
│   └── …
└── report.md                        unchanged
```

**Plan / task queue.** After discovery the parent builds the pass list — 1 pass per active
domain, split by directory above 20 scoped files exactly as today — and writes
`code-smells/passes/queue.md`. The header records the current `HEAD`, the scope mode, and the
wave size. Passes are ordered by domain value, so that an interrupted run has already
checkpointed the passes that matter most: Security, Type Safety, Async Patterns, Error
Handling, Boundary Validation, Config, Dependency Hygiene, Modernization, Code Quality,
Architecture. Architecture is last because its mechanical pre-pass has to finish first.

**Wave size.** A request flag `--agents N`, default 3. `--agents 1` is the "one domain at a
time" path the skill already allows: the main agent runs the pass itself and writes the same
file, so a host without sub-agents follows the same protocol. Nine default domains at 3 per
wave is 3 waves.

**The sub-agent writes its own artifact.** `subagent_template` names the output path. The
agent writes every finding as 1 JSONL line to `code-smells/passes/<id>.jsonl`, then appends a
last line `{"done": true, "findings": N, "files": M}`, and replies with 1 line. The file
survives a stopped parent; the reply carries no data. A side effect worth having: the parent's
context now grows by 1 line per pass instead of by every finding, which makes the parent
itself survive compaction.

**Checkpoint.** When every agent of a wave has replied, the parent reads the last line of each
file. A `done` line marks the pass `done` with its counts; a missing file or a missing `done`
line leaves the pass `pending` and increments `Attempts`. The next wave starts only after every
pass of the current wave is marked. A pass still `pending` after 2 attempts is marked
`failed`, named in the discovery summary, and the report carries its domain as not run — the
same rule §7 of the architecture proposal applies to a failed pre-pass: recorded, never
worked around.

**Resume.** When `scan` starts and `code-smells/passes/queue.md` exists, the parent asks once:
resume, or restart. Restart deletes `code-smells/passes/`. Resume skips every `done` pass and
reuses `tsc.log` and `lint.json` when the queue header's `HEAD` matches and the tree is clean;
otherwise it reruns the diagnostics. A `HEAD` mismatch is a warning, not a stop: `workflow:26`
already re-reads the exact lines of every finding before it enters the report, so a stale line
number in a `done` pass is caught there.

**Merge from disk.** The steps that follow the passes — re-read, caller check, downgrade,
boost, dedupe, merge, consolidate, cap — read the `.jsonl` files and never an agent reply. The
report, its validation, and fix mode are unchanged. `passes/` is retained with the other
`code-smells/` artifacts, and `workflow:52` already covers its removal.

**What waves do not do.** They do not lower the total tokens a full scan spends: the same
passes run, in sequence instead of at once. What changes is the size of the loss when a run
stops — at most 1 wave — and the burst the usage limit sees.

## 4. Skipped on purpose

| Skipped | Why, and when to add it |
|---|---|
| a `tools/passes.mjs` helper that reads the queue and the terminators | checking a last line is `tail -n 1`, and a queue of 10 rows is read by eye. Add it when a real run shows the parent marking a pass wrong |
| a smaller split than the 20-file rule, driven by `--agents` | 2 knobs for 1 property. The wave size bounds concurrency; the file rule bounds a pass. Keep them apart |
| a resumable fix mode | working-tree edits and the scratch snapshots of `fix-workflow.md` already persist; a stopped fix run leaves the tree as it is and the report as the plan. Separate proposal if wanted |
| a `running` status | absence of the `done` line already says a pass did not finish; a fourth status is a row the parent has to keep in sync |
| progressive appends inside the sub-agent | a file without its `done` line is rerun whole, so a partial file buys nothing but a second write path |
| changes to `validate-report.mjs` | the report shape is unchanged |

## 5. Exact landing spots in the skill

Each line below is written to pass `npm test` as it stands: digits for thresholds, `<=` for
a bound, no word from the deny-list in `cnlp/cnlp-format.md` §5, under 150 characters.

### `cnlp/profiles/skill.md` — first, per `AGENTS.md` workflow:8

`custom_sections:` gains 1 name, after `subagent_template`:

```
- pass_queue
```

### `SKILL.md` `inputs:` — the existing line 26 changes

```
- the request, which carries the run mode, the domain set, the scope mode, and the wave size
```

### `SKILL.md` `outputs:` — 1 line

```
- `code-smells/passes/`: the pass queue, the cached diagnostics, and 1 JSONL file per pass
```

### `SKILL.md` `forbidden_behaviors:` — 2 lines

```
- do not start a wave before every pass of the previous wave is marked `done`, `pending`, or `failed` in the queue
- do not read a finding from an agent reply: the `.jsonl` file under `code-smells/passes/` is the record, and a reply holds 1 line
```

### `SKILL.md` `workflow:` — the resume ask, after the current step 5

```
6. ask once whether to resume or restart when `code-smells/passes/queue.md` exists, and delete `code-smells/passes/` on restart
7. warn when the `HEAD` in the queue header differs from the current `HEAD` on a resume: the line re-read below catches a stale line
```

### `SKILL.md` `workflow:` — the diagnostics, current steps 17 and 18 change

```
19. run `npx tsc --noEmit 2>&1 | head -200` over the full project into `code-smells/passes/tsc.log`, and report only the errors in the scoped files
20. run the linter into `code-smells/passes/lint.json`: `npx eslint [files] --format json` or `npx biome check [files] --reporter json`
21. reuse `tsc.log` and `lint.json` on a resume when the queue `HEAD` matches and the tree is clean, and rerun both otherwise
```

### `SKILL.md` `workflow:` — current steps 24 and 25 become 6 steps

```
26. build the pass list: 1 pass per active domain, split by directory when scoped files > 20, with the shared types visible to every pass
27. write `code-smells/passes/queue.md` in the shape of `pass_queue`, in its domain order, and skip a pass marked `done` on a resume
28. run the pending passes in waves of the wave size, as sub-agents shaped by `subagent_template`, or in the main agent when the wave size is 1
29. wait for every agent of a wave, then mark each pass `done` when the last line of its file is the `done` line, and `pending` otherwise
30. mark a pass `failed` after 2 attempts without a `done` line, name it in the discovery summary, and report its domain as not run
31. read the findings of every `done` pass from its `.jsonl` file before the re-read below
```

The steps that follow renumber; none of them changes.

### `SKILL.md` `subagent_template:` — 3 lines, after `Scope mode:`

```
Write every finding as 1 JSONL line to: [OUTPUT_PATH]
Append 1 last line when every file is reviewed: {"done": true, "findings": N, "files": M}
Reply with 1 line: the pass id, the findings count, the files count. The file is the result; the reply is not.
```

### `SKILL.md` `discovery_summary:` — 2 rows, after `Files in scope`

```
Agents per wave: <N>
Resumed: <done>/<total> passes from code-smells/passes/queue.md, or no
```

### `SKILL.md` — the new custom block `pass_queue:`, placed after `subagent_template:`

```
pass_queue:
- `--agents N` in the request sets the wave size, and the default is 3
- `--agents 1` runs 1 pass at a time in the main agent, with no sub-agent
- the pass id is the domain slug, or `<domain slug>.<directory slug>` for a split pass
- the domain order: Security, Type Safety, Async Patterns, Error Handling, Boundary Validation, Config, Dependency Hygiene, Modernization, Code Quality, Architecture
- a status is `pending`, `done`, or `failed`, and `Attempts` counts the waves the pass ran in
```markdown
# Pass queue

HEAD: <sha>
Scope: <mode>
Agents per wave: <N>

| Pass | Domain | Files | Status | Attempts | Findings |
|---|---|---|---|---|---|
| security | Security | 42 | done | 1 | 7 |
| type-safety.src-auth | Type Safety | 12 | pending | 1 | |
```
```

### `README.md` — 3 short paragraphs

Under *Scan*: the `--agents N` flag, default 3, and that each pass writes its own file under
`code-smells/passes/`. Under *Tips*: an interrupted scan is resumed by running it again, and
the skill asks before skipping the finished passes. Under *Tips*, for Claude Code users: the
`CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` env var in `settings.json` caps sub-agents host-wide,
and is independent of the wave size.

## 6. Cost of the change

| Touchpoint | What changes |
|---|---|
| `cnlp/profiles/skill.md` | 1 line in `custom_sections` |
| `ts-reviewer/SKILL.md` | 1 input line, 1 output line, 2 prohibitions, 11 workflow lines (6 replace 2), 3 template lines, 2 summary rows, 1 custom block |
| `README.md` | 3 paragraphs |
| `package.json` | `3.1.0`; the report contract is unchanged, so no user has a broken path |
| `dist/` | rebuilt |
| `validate-report.mjs`, `tools.test.mjs`, `references/*.md` | untouched |

## 7. Verification, after the go-ahead

1. `npm test` — the format check over the new lines.
2. A real `scan --agents 2` on an outside project. Stop the run after the first checkpoint.
   `code-smells/passes/queue.md` holds 2 `done` rows and the rest `pending`; each `done` row
   has a `.jsonl` file ending in its `done` line.
3. Run `scan` again. The skill asks resume/restart; on resume the discovery summary reads
   `Resumed: 2/9`, the 2 done passes do not start, and `tsc.log` and `lint.json` are reused.
4. Compare the final `report.md` against a clean uninterrupted `scan` of the same tree:
   the same findings, the same counts.
5. Kill a sub-agent mid-pass. Its row stays `pending` with `Attempts: 1`, it reruns in the
   next wave, and no finding from the killed attempt reaches the report.
