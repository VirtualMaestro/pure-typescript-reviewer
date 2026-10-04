# Proposal — cut what a scan spends: a skill lint, pass groups, file rules, and a scout model

**Audience:** the agent maintaining the `ts-reviewer` skill repository.
**Status:** complete as `3.4.0`, merged to `master` on 2026-10-04. Steps 1–5 of §8 ran, and `fixtures/recall-corpus/RESULTS.md` holds every series. On the corpus, B cost $4.47 a run. The pass groups cost $3.35, with no case lost. The Sonnet scout cost $2.65, with every High+ case kept. On a 98-file monorepo the skill lint saved 8.6% and 10 minutes, and the corpus, where it cost 6%, is its worst case. §11 and §11.1 record the build decisions and the fixes. Still open: the Sonnet scout on a large project, a JSONL check for sloppy pass output, and the main agent, which takes 45–67% of a small run.

**Decided** (operator, 2026-10-03):
- **The symptom is the usage limit** (the 5-hour or weekly window), not the main agent's
  context.
- **The proposal is the full package.**
- **Hosts are Claude Code (Anthropic) and Codex (OpenAI).** Antigravity is out of scope, and
  there its passes inherit the main agent's model.
- **1 model and 1 effort serve every pass.** They are asked once and remembered in the scout
  agent file.
- **The Architecture pass is never the scout.** It runs on the main agent's model and effort,
  because a weak model gives no result there.
- **Modernization and Code Quality run as 1 group.**
- **The skill ships its own pinned typescript-eslint config and runs it through `npx -y`.** The
  operator approves it once, as with Knip. A checklist line that this config finds by rule
  leaves the analysis passes.

**Numbering convention:** a step number names a step of `SKILL.md` `workflow:` in `3.3.0`. No
step is inserted or removed below, so no step renumbers.

---

## 1. Diagnosis

The main agent's context is already protected. Since `3.1.0` a pass writes its findings to
`code-smells/passes/<id>.jsonl` and replies with 1 line (`SKILL.md:281-283`). §3 of
`docs/ts-reviewer-orchestration-proposal.md` states the limit of that change: waves spread the
spend over time, and they do not lower it.

### 1.1 What a token costs

Claude prices, checked 2026-10-03 (docs.claude.com/en/docs/about-claude/pricing), per MTok:

| Model | Input | Output | Cache read |
|---|---|---|---|
| Opus 5.5 | $4 | $20 | $0.20 |
| Sonnet 5.5 | $2 | $10 | $0.20 |

3 consequences shape the design:

- **Output costs 5× input, and thinking is output.** At effort `high` a pass spends most of its
  output reasoning over the checklist. Every checklist line the pass reasons about costs output,
  whether or not it finds anything. A line that a deterministic rule decides should never reach
  a pass. That is §3.1.
- **A cache read costs the same on both tiers.** An agent loop re-sends its context on every
  turn, and most of that is cache reads. A smaller pass model halves output and fresh input, and
  leaves the cache reads as they are. The model tier is a real lever, but not the only one. §3.4.
- **File reads are input, multiplied by the passes.** Step 28 gives every one of the 9 default
  passes every scoped file. Each file is read 9 times, and each read is fresh input and then
  cache reads on every later turn of that pass. §3.2 and §3.3.

### 1.2 What a default scan reads, by `SKILL.md`

| Source | Per pass | Default scan |
|---|---|---|
| step 28: 1 pass per active domain, and every pass gets every scoped file | every scoped `.ts` file | 9 passes, so each file is read 9 times |
| `subagent_template`: the domain reference | 27–68 lines | 9 reads |
| `subagent_template`: `references/stack-cost.md` | 1 file | 9 reads |

The checklists' own content makes 3 of the 9 full file reads waste (checked file by file):

| Domain | What its checklist reads | `.ts` files it needs |
|---|---|---|
| Config | `tsconfig*.json`, the configs they extend, `package.json`, the linter config (`tsconfig.md:8-37`) | none. `SKILL.md:36` hands it `.d.ts` files, and no check of `tsconfig.md` uses them |
| Dependency Hygiene | `package.json`, the lockfile, `npm audit`, `npm outdated` (`dependency-hygiene.md:9-13`) | none in general. `:16` greps for 1 package's import, its own targeted search |
| Async Patterns, Error Handling | `.ts` with a promise, a timer, a listener, a `catch`, a `throw`, an error class | only files with a marker, §3.3 |
| Security, Type Safety, Boundary Validation, Modernization, Code Quality | `.ts`, with absence-based checks: a missing exhaustive check, complexity, dead code | every file |

### 1.3 What the linter already decides

The package ships no linter. Step 21 runs the project's own ESLint or Biome when one is
configured. A project without one gets 1 Medium finding (`tsconfig.md:34`), and the passes then
look for every lintable pattern by reasoning.

Each of the 201 severity-bearing check lines of the 7 code-scan references was classified
against ESLint core and typescript-eslint. Every rule name and option was checked on its
docs page, and the selectors were run on a sample project, 2026-10-03:

| Reference | FULL: 1 rule finds exactly the pattern | PARTIAL: superset or subset | NONE: judgment, cross-file, absence | Lines |
|---|---|---|---|---|
| `type-safety.md` | 15 | 8 | 19 | 42 |
| `async-patterns.md` | 6 | 6 | 19 | 31 |
| `error-handling.md` | 3 | 3 | 7 | 13 |
| `modernization.md` | 15 | 8 | 6 | 29 |
| `code-quality.md` | 16 | 12 | 18 | 46 |
| `security.md` | 2 | 12 | 17 | 31 |
| `boundary-validation.md` | 1 | 2 | 6 | 9 |
| **all** | **58** | **51** | **92** | **201** |

58 lines, 29% of the checklists, are decided by a rule. That is 52% of Modernization and 35% of
Code Quality. Appendix A lists every FULL line with its rule.

## 2. What the hosts offer, checked 2026-10-03

| Host | Model per sub-agent | Effort per sub-agent | Agent file reloads | Source |
|---|---|---|---|---|
| Claude Code | `model` per Agent call (`sonnet`, `opus`, `haiku`, `fable`, a full id), or `model:` in the agent file, `inherit` included | `effort:` in the agent file (`low`..`max`), never per call | watched: an edit applies to the next delegation, with no restart. The exception is an `agents` directory created after the session started | code.claude.com/docs/en/sub-agents |
| Codex | requested at spawn, `model` in the agent file, or `agents.default_subagent_model` | requested at spawn, `model_reasoning_effort` in the agent file, or `agents.default_subagent_reasoning_effort` | not stated: the spawn request is the reliable path | developers.openai.com/codex/subagents |

The documented Codex tiers are `gpt-6.1-sol` for demanding work and `gpt-6-luna` for "a faster,
lower-cost option", with effort from Light to Ultra. Which models an account has depends on
the plan (developers.openai.com/codex/models).

The skill cannot switch the model of the running main agent. The operator picks that model
with `/model` and `/effort`. A `model:` field in the skill frontmatter would fix it for every
user. So the skill asks only about the passes, and the discovery summary names the main model.

## 3. The design

### 3.1 The skill lint

The skill ships `tools/eslint.config.mjs`. It holds ESLint core rules and typescript-eslint
rules only, with no plugin to download beyond those 2. It lints type-aware through
`projectService`.

```bash
npx -y -p eslint@10 -p typescript-eslint@8 -p typescript@5.9 eslint -c "$SKILL/tools/eslint.config.mjs" --format json [files] 2>/dev/null > code-smells/passes/lint-skill.json
```

What the trial run established:

| Fact | Consequence |
|---|---|
| `eslint` is at major 10, `typescript-eslint` at major 8, and its peer range is `typescript >=4.8.4 <6.1.0` | pin all 3 to major ranges. `typescript@5.9` is `target_stack`, and npm would otherwise pick 6.0. The config extends no preset and lists every rule, so a minor release adds no rule |
| a plain `import tseslint from 'typescript-eslint'` in a config outside the project fails with `ERR_MODULE_NOT_FOUND`: Node resolves from the config's folder, and the npx cache is not on that path | the config loads it as `createRequire(process.argv[1])('typescript-eslint')`, relative to the ESLint binary npx runs. Tested on ESLint 10.12.0 |
| `tsconfigRootDir` defaults to the config file's directory | the config sets `tsconfigRootDir: process.cwd()`, and the command runs from the project root |
| with `-c`, `files` and `ignores` globs resolve against the cwd | the same: run from the project root |
| typescript-eslint loads TypeScript from its own install in the npx cache | the project needs no `typescript` of its own. A project on TypeScript 7 is linted with 5.9, which `target_stack` already names as the stack |
| npm notices go to stderr | `2>/dev/null` keeps the JSON clean |

**Ownership lives in the reference line.** A FULL line gains the suffix `, lint-owned by
\`<rule>\`` and names the rule that finds it, or `no-restricted-syntax: <message>` for a
selector. The `note:` qualifier is not used for this, because it qualifies a whole group, and
a group mixes owned and unowned lines. So 1 fact lives in 1 file: the reference says which
rule owns the line, and the config holds the rule's options.

**The lint is a pass.** `tools/lint-pass.mjs` converts `lint-skill.json` into
`code-smells/passes/lint-skill.jsonl`, in the pass JSONL shape, with the `done` line. It finds
the owning line by the rule id and, for `no-restricted-syntax`, the selector's message. It takes
`category` from the reference's domain, and `severity` and `fix` from the line. It takes
`snippet` from the file. From there, steps 31–45 treat it like any pass: the re-read, the merge,
the dedupe, the Recurring Patterns. The main agent never reads the raw ESLint JSON, so the
lint costs the main agent 1 line per finding, the same as a pass.

**The passes skip owned lines.** The template gains `Skip every checklist line that ends in
"lint-owned by" when this reads yes: [SKILL_LINT_RAN]`. A pass reads the reference whole, and
it reasons over the unowned lines only.

**Fallback.** A declined approval, or a lint that exits without parseable JSON, marks the pass
`lint-skill` `failed`. `[SKILL_LINT_RAN]` is then `no`, and every pass keeps every line, as in
`3.3.0`. A failure costs tokens, never findings.

**What it does not replace.** Step 21 still runs the project's own linter, and step 24 triages
it. The skill lint enforces the checklist, and the project config enforces the project's style.
A rule that the project turns `off` still fires in the skill lint. That changes nothing: the
pass reports the same pattern in `3.3.0`.

**Rules for the build:**
- a rule, or a selector message, owns exactly 1 line;
- where 2 lines share 1 rule, the build keeps 1 owner, and the other line stays with the pass;
- a self-check in `tools.test.mjs` holds the mapping both ways: every rule named in a reference
  exists in the config, and every rule in the config is named by exactly 1 line.

These cases are known now:

| Lines | Shared rule | Build decision |
|---|---|---|
| `type-safety.md:9`, `:11`, `:12` | `@typescript-eslint/no-explicit-any` | `:9` owns. `any[]` and `Record<string, any>` are explicit `any`, so `:9` reports them at its own severity |
| `type-safety.md:18`, `modernization.md:21` | `@typescript-eslint/consistent-type-assertions` | `modernization.md:21` owns at High, and `type-safety.md:18` is removed (operator, 2026-10-03) |
| `modernization.md:33`, `:35` | `@typescript-eslint/prefer-nullish-coalescing`, with different options | `:35` owns with the defaults. `:33` needs `ignorePrimitives` and stays with the pass |
| `type-safety.md:9` | its severity depends on whether the symbol is exported | the tool emits the base severity. The step 34 re-read sees the export and applies the higher level |
| `code-quality.md:26` | "report once per codebase" | step 40 already consolidates 3+ identical issues |

### 3.2 Pass groups

A pass runs a group of 1 or 2 domains. The agent reads each reference of its group, and a
finding keeps the category of the domain whose line raised it. `report_format` and the
`domains` table do not change.

| Group | Domains | Files | Why |
|---|---|---|---|
| `security` | Security | every scoped file | taint tracing through callers is its own way of reading |
| `type-safety+boundary-validation` | Type Safety, Boundary Validation | every scoped file | the same cast question at the same sites (`type-safety.md:15-20`, `boundary-validation.md:11-14`) |
| `async-patterns+error-handling` | Async Patterns, Error Handling | filtered, §3.3 | 1 reading focus split into 2 files on purpose. The `allSettled` line is in both (`:31`, `:12`) |
| `config+dependency-hygiene` | Config, Dependency Hygiene | no `.ts` file | both read project files only |
| `modernization+code-quality` | Modernization, Code Quality | every scoped file | both line-level and mostly Low. After §3.1, Modernization keeps 14 of its 29 lines |
| `architecture` | Architecture | as `references/architecture.md` names | other inputs: the graph, the tools, the history |

The row order is the pass order and keeps the value order of `3.1.0`, after the `lint-skill`
row. A default scan goes from 9 passes to 5, and from 9 reads of every scoped file to 3, plus 1
read of the marked subset. `stack-cost.md` goes from 9 reads to 5.

### 3.3 File rules

A row's `Files` column is its rule. There are 3 rules:

- **every scoped file**, as today;
- **no `.ts` file**: the pass reads the project files its references name;
- **filtered**: the pass takes the scoped files that the `workflow:` command of any of its
  references lists. Each reference owns its marker beside the checks it serves.

The filter has 1 gap that matters. A sync file that calls an imported async function with no
`await` carries no marker, and `async-patterns.md:10` fires there. `no-floating-promises` finds
exactly that site, and §3.1 makes the skill lint own that line. So the filter applies when the
skill lint ran, or when the project linter enables `no-floating-promises`. Otherwise the group
takes every scoped file.

The second gap is `error-handling.md:24`, with the `throw` in a callee. It is a Medium, and it
stays accepted. The discovery summary names the matched count.

The markers over-match on purpose: `Error` and `await` hit comments and strings. A wrong hit
costs 1 file read, and a missed hit costs a finding. They avoid `\b`, which POSIX ERE lacks.
On this repository's 18 committed fixture `.ts` files, the union marker matched 1 file.

### 3.4 The scout model

`ts-reviewer-scout` is the name of an agent definition: 1 small file in the host's agent
directory that holds a model and an effort. The skill starts each pass "as the
`ts-reviewer-scout` agent", and the host applies the file's settings. It is a preset, not a
separate program.

| Host | Scout file | Fields |
|---|---|---|
| Claude Code | `.claude/agents/ts-reviewer-scout.md` | `model`, `effort` |
| Codex | `.codex/agents/ts-reviewer-scout.toml` | `model`, `model_reasoning_effort` |

**The ask-once flow:**
1. At scan start, when the scout file is absent, the skill asks 1 question: the model and the
   effort for the passes.
2. It offers the models the host's agent call lists: on Claude Code, the Agent tool's model
   list. On Codex no tool lists them, so it offers the documented tiers and takes any name the
   operator types.
3. It writes the answer to the scout file. The answer "the main agent's model" writes
   `inherit` on Claude Code and leaves `model` out on Codex, so the file exists and the
   question does not come back.
4. It passes the model, and the effort where the call takes one, in each agent call too. Codex
   takes both at spawn. Claude Code takes the model per call, and that covers the session in
   which the `agents` directory did not exist yet.
5. `--scout <model>` in the request wins for 1 run, and the file keeps its value. Deleting the
   file brings the question back.

**Architecture is not a scout.** The `architecture` group runs as the default sub-agent, on the
main agent's model and effort.

**What stays on the main agent:** every step that judges. That is the re-read of step 34, the
caller check of step 35, the merge, the report, investigate, and fix. A smaller model finds,
and the main model verifies.

**Antigravity, and any host without a scout file format,** runs every group as the default
sub-agent, as in `3.3.0`.

The installer is unchanged. The skill writes the scout file after the operator's answer, so
`src/` needs no edit, and a reinstall never resets the operator's choice.

### 3.5 The recall line

A smaller model costs findings in 1 direction only. A false positive dies at step 34 or 35. A
miss never reaches the main agent, and nothing downstream recovers it. The template gains a
line that turns the most common miss, a data flow the pass cannot see, into a finding that the
main agent already knows how to check:

```
Write the problem of a finding whose data flow leaves these files as "if <condition>": the main agent reads the callers.
```

Step 35 reads the callers of such a finding, or caps it at Medium. The line does not conflict
with "do not report a finding you cannot defend from the code in front of you": an "if"
finding defends its condition from that code.

## 4. Skipped on purpose

| Skipped | Why, and when to add it |
|---|---|
| PARTIAL lines as lint-owned | the rule's superset or subset would add noise or drop findings. Those lines stay with the pass. Add one when the corpus shows the rule matches the line |
| PARTIAL rules as hints for the pass | a second input for the pass to read, which is input spent to save input |
| a model question per pass | 5 questions on every run. Architecture is the 1 exception, and it is fixed |
| Biome as the skill linter | `noFloatingPromises` is in nursery, and its type-aware coverage is far below typescript-eslint's |
| unicorn, security, import, and regexp plugins | each is a download, and the 58 FULL lines need none. Add one when a checklist line needs its rule |
| the project's own ESLint binary for the skill config | a version the skill did not pin. The `npx` pin is the contract |
| folding Config into discovery steps 9 and 11 | those steps already audit the config flags, and the Config pass audits them again (§10). Without `.ts` files the pass is the cheap part. Separate proposal |
| an installer-written scout file | the skill writes it from the operator's answer, and the installer keeps 1 job |
| `CLAUDE_CODE_SUBAGENT_MODEL` and `agents.default_subagent_model` as the mechanism | both apply to every sub-agent on the host, not only these passes. README tip |

## 5. Exact landing spots

Each line below passed `node --test cnlp/skill-format.test.js` on a scratch copy.

### `cnlp/profiles/skill.md` — first, per `AGENTS.md` workflow:8

`custom_sections:` gains 3 names, after `pass_queue`:

```
- pass_groups
- pass_agent
- skill_lint
```

### `SKILL.md` `scope:` — the current line 36

```
- `.d.ts` files are reviewed by the Type Safety domain only: a declaration has no runtime behavior
```

### `SKILL.md` `outputs:` — 1 line, after the `code-smells/passes/` line

```
- the scout agent file named in `pass_agent`, written once, after the operator answers the scout question
```

### `SKILL.md` `workflow:` — steps 16 and 28 change, step 32 changes 1 word

```
16. ask once before a pinned-major `npx -y` run: the skill lint always, Knip and dependency-cruiser when Architecture is active and missing locally
28. build the pass list: 1 pass per `pass_groups` row holding an active domain, with the files of its rule, split by directory above 20
```

In step 32, `report its domain as not run` becomes `report its domains as not run`.

### `SKILL.md` `discovery_summary:` — 4 rows, after `Agents per wave`

```
Main agent: <model>
Pass agent: ts-reviewer-scout <model> <effort> / the default sub-agent; Architecture on the main agent
Skill lint: <N> findings / declined / failed: <reason>
Filtered passes: <group> <matched>/<scoped> files, or none
```

### `SKILL.md` `subagent_template:` — 3 lines change, 2 are added

```
You are a specialized TypeScript reviewer focused on [DOMAINS].
Read each reference checklist: [REFERENCE_PATHS]
Skip every checklist line that ends in "lint-owned by" when this reads yes: [SKILL_LINT_RAN]
Write the problem of a finding whose data flow leaves these files as "if <condition>": the main agent reads the callers.
  "category": "[the domain whose checklist names the pattern]",
```

The 2 new lines go after `Report a pattern even when …`.

### `SKILL.md` `pass_queue:` — 2 lines change, 1 is added, the table names change

```
- the pass id is the group id of `pass_groups`, or `<group id>.<directory slug>` for a split pass
- the pass order is the row order of `pass_groups`, after the row `lint-skill` of `skill_lint`
- a queue holding a pass id absent from `pass_groups` predates pass groups: restart it without the resume ask
```

In the fenced queue, the column `Domain` becomes `Domains`, and the second example row becomes
`| type-safety+boundary-validation.src-auth | Type Safety, Boundary Validation | 12 | pending | 1 | |`.

### `SKILL.md` — 3 new custom blocks, after `pass_queue:`

```
pass_groups:
- a group runs its active domains in 1 pass: the agent reads each reference, and a finding keeps the category of the domain that raised it
- the group id joins the domain slugs with `+`
- every pass reads the shared types as context, whatever the files of its rule
- a filtered group takes the scoped files that the `workflow:` command of any of its references lists
- a filtered group takes every scoped file when the skill lint did not run and the project linter enables no `no-floating-promises`

| Group | Domains | Files |
|---|---|---|
| `security` | Security | every scoped file |
| `type-safety+boundary-validation` | Type Safety, Boundary Validation | every scoped file |
| `async-patterns+error-handling` | Async Patterns, Error Handling | filtered |
| `config+dependency-hygiene` | Config, Dependency Hygiene | no `.ts` file: the project files each reference reads |
| `modernization+code-quality` | Modernization, Code Quality | every scoped file |
| `architecture` | Architecture | the inputs `references/architecture.md` names |

pass_agent:
- every group runs as the `ts-reviewer-scout` agent, except `architecture`, which runs as the default sub-agent on the main agent's model
- the scout file is `.claude/agents/ts-reviewer-scout.md` on Claude Code and `.codex/agents/ts-reviewer-scout.toml` on Codex, in the project root
- ask once for the scout model and effort when the scout file is absent, and write the answer to it
- offer the models the host's agent call lists, or take the name the operator types when the host lists none
- the answer "the main agent's model" writes `inherit` on Claude Code and leaves `model` out on Codex
- pass the scout model, and the effort where the call takes one, in each agent call: a host can load a new agent file late
- `--scout <model>` in the request wins for 1 run, and is not written to the scout file
- a host with no scout file format runs every group as the default sub-agent

skill_lint:
- the config is `tools/eslint.config.mjs` in this skill: ESLint core rules and typescript-eslint rules, pinned by the command below
- a reference line ending in "lint-owned by" names the rule that finds its pattern, and no analysis pass reads that line while the skill lint runs
- run it after step 21, and write its findings as the pass `lint-skill` with `tools/lint-pass.mjs`, which takes category, severity, and fix from the owning line
- a declined or failed run marks the pass `lint-skill` failed, and every analysis pass keeps the lint-owned lines
- the skill lint replaces no project linter: step 21 runs the project config as before
```

The block ends with this fenced command:

```bash
SKILL=<the directory this file was loaded from>
npx -y -p eslint@10 -p typescript-eslint@8 -p typescript@5.9 eslint -c "$SKILL/tools/eslint.config.mjs" --format json [files] 2>/dev/null > code-smells/passes/lint-skill.json
node "$SKILL/tools/lint-pass.mjs" --refs "$SKILL/references" --lint code-smells/passes/lint-skill.json --out code-smells/passes/lint-skill.jsonl
```

### References — the owner suffix, 2 of the 58 lines shown

```
- floating promises — an async function called with no `await`, `.then()`, or `.catch()`: High, use `await doWork()` or `void doWork().catch(handleError)`, lint-owned by `@typescript-eslint/no-floating-promises`
- non-erasable syntax — an `enum`, of any kind: High, it emits a runtime object, the numeric form adds reverse mappings, and `erasableSyntaxOnly` rejects it, lint-owned by `no-restricted-syntax: enum`
```

Both stay under the 250-character limit. A FULL line that a suffix would push past the limit
splits into a pattern line and a `fix:` line, by `AGENTS.md` `check_line_form`.

### `references/async-patterns.md` and `references/error-handling.md` — a `workflow:` block before `checks:`

The profile already declares `workflow:` in that position.

````
workflow:
1. list the scoped files where a check below can fire, when `pass_groups` in `SKILL.md` filters this domain
```bash
grep -lE 'async|await|Promise|\.then\(|\.catch\(|setTimeout|setInterval|Abort(Signal|Controller)|\.on\(|addEventListener|fetch\(' [files]
```
````

````
workflow:
1. list the scoped files where a check below can fire, when `pass_groups` in `SKILL.md` filters this domain
```bash
grep -lE 'catch|throw|Promise\.reject|allSettled|process\.exit|Error|\.message|ok: ?(true|false)' [files]
```
````

### `tools/` — 2 new files, plain Node, no dependencies

- `tools/eslint.config.mjs`: the rules and selectors of Appendix A. It loads typescript-eslint
  through `createRequire(process.argv[1])`, and it sets `parserOptions.projectService: true` and
  `tsconfigRootDir: process.cwd()`.
- `tools/lint-pass.mjs`: reads `lint-skill.json` and the references, and writes
  `lint-skill.jsonl` in the pass shape with the `done` line. It exits non-zero on unparseable
  input.
- `tools.test.mjs` gains the mapping self-check of §3.1 and 1 conversion test over a recorded
  `lint-skill.json`.

### `README.md` — 3 short paragraphs

- Under *Scan*: the skill lint, its 1 approval, and its fallback.
- Under *Scan*: the pass groups and the filtered group.
- Under *Tips*: the scout question, the scout file per host, and `--scout`.

## 6. Cost of the change

| Touchpoint | What changes |
|---|---|
| `cnlp/profiles/skill.md` | 3 lines |
| `ts-reviewer/SKILL.md` | 1 scope line, 1 output line, 3 workflow lines, 4 summary rows, 5 template lines, 3 queue lines and the table, 3 custom blocks |
| 7 references | up to 58 lines gain an owner suffix. 2 files gain a `workflow:` block |
| `ts-reviewer/tools/` | `eslint.config.mjs`, `lint-pass.mjs` |
| `tools.test.mjs` | the mapping self-check and the conversion test |
| `package.json` | `3.4.0`. The report contract is unchanged, so the bump is minor |
| `README.md` | 3 paragraphs |
| `src/`, `validate-report.mjs`, `report_format`, `domains`, fix, investigate | untouched |

## 7. Verification — a recall corpus

Every lever here risks a lost finding, and a lost finding leaves no trace in the report it is
missing from. So the gate compares runs against a key, as the cost and intent corpora do.

**Fixture:** `fixtures/recall-corpus/`, in the shape of the 2 existing corpora, with
`prepare.mjs`, `KEY.md`, and `RESULTS.md`. Its cases:
- **per default domain:** 1 in-file case, with the pattern and its evidence in 1 file, and 1
  hard case, where the data flow crosses files or the check is absence-based;
- **lint-owned cases:** at least 1 per reference with FULL lines. The skill lint finds them,
  and no pass spends on them;
- **the filter's own case:** a sync file calling an imported async function with no `await`;
- **2 controls:** a site comment and a guarded value, which the scan drops as today.

**Runs**, 3 each, on the same tree and `HEAD`:

| Run | What runs |
|---|---|
| B | `3.3.0` as it is: the baseline |
| L | B plus the skill lint and the owned-line skip |
| G | L plus the pass groups and the file rules, with `ts-reviewer-scout` at `inherit` |
| S | G with the scout on Sonnet at `high` |

**Measured per run:**
- the seeded cases found and the controls kept out;
- the fresh input, cache write, cache read, output, and thinking tokens of the run agent and of
  every agent it started, summed from the transcripts by `fixtures/recall-corpus/tokens.mjs`.
  The `subagent_tokens` of a task notification is not the spend: it equals the context size of
  the agent's last turn (checked on 3 agents, 2026-10-03).

**Bar:**
- **High and Highest cases:** a case that B finds in 2 of 3 runs is found in 2 of 3 by L, by G,
  and by S.
- **Medium and Low cases:** a lost case is recorded in `RESULTS.md`, and the operator decides.
- **Tokens:** each lever lowers the run total against the run before it, or that lever is
  dropped.

## 8. Plan

| Step | What | Done when |
|---|---|---|
| 1 | the operator answers §9 | answers recorded in this file |
| 2 | build `fixtures/recall-corpus/` | `KEY.md` and `prepare.mjs` committed |
| 3 | runs B ×3 | `RESULTS.md` holds the baseline, and every seeded case is found at least once, or the fixture is fixed |
| 4 | build §5 as `3.4.0` on a branch | `npm test` passes, the mapping self-check included |
| 5 | runs G and S, 3 each. L runs only when G fails the bar, to tell the lint from the groups | the bar of §7. A lever that fails it is dropped from the build |

## 9. Questions for the operator

1. **The default scout once run S passes.** Decided 2026-10-03: the ask-once flow stays with no
   preselected answer. A smaller model is a cost each operator chooses per project.
2. **The npx pins.** Decided 2026-10-03: the pins are major ranges, `eslint@10`,
   `typescript-eslint@8`, and `typescript@5.9` (5.9.x), as `SKILL.md:66` says. Patch and minor
   bugfixes then arrive with no manual bump. The config lists every rule and extends no preset,
   so a minor release adds no rule to the scan, and step 34 re-reads every lint finding.
3. **The angle-bracket conflict.** Decided 2026-10-03: `modernization.md:21` owns
   `consistent-type-assertions` at High, and `type-safety.md:18` is removed.

## 10. Found along the way, out of scope

| Where | What |
|---|---|
| `modernization.md:21`, `type-safety.md:18` | an angle-bracket assertion is High in one and Medium in the other. Decided 2026-10-03: Modernization owns it, and the Type Safety line goes |
| `code-quality.md:49`, `async-patterns.md:46` | `setTimeout` used to synchronise is High in one and Low in the other |
| `async-patterns.md:31`, `error-handling.md:12` | the unread `allSettled` result is checked twice. §3.2 runs both in 1 pass, and the duplicate line stays |
| `architecture.md:44`, `code-quality.md:20-22` | Architecture says Dependency Hygiene owns dead code, and Code Quality holds the checks |
| `SKILL.md:133`, `:135`, and the Config pass | the config flags are audited twice, §4 |
| `SKILL.md:66`, step 16 | the lines say "pinned-major", but Knip and dependency-cruiser pinned exact versions, with no recorded reason. Fixed 2026-10-03: `knip@6` (`architecture.md:74`) and `dependency-cruiser@18` (`tools/run-cruise.mjs:15`) |
| `src/paths.ts:17` | Antigravity now defaults to `.agents/skills` and reads `.agent/skills` for backward compatibility (antigravity.google/docs/skills). The installer writes `.agent/` |

## 11. Build decisions (step 4, 2026-10-03)

| Decision | Why |
|---|---|
| 49 lines are lint-owned, not 53–56 | Several Appendix A lines stay with the passes (listed below). `type-safety.md:18` is removed (§9 question 3) |
| the rules live in `tools/lint-rules.mjs` as plain data, and `eslint.config.mjs` imports them | the self-check in `tools.test.mjs` loads the rules with no ESLint installed |
| an owner may name an id after a colon: a `messageId`, a `no-restricted-syntax` message, or a custom message | 1 rule can own several lines. `consistent-type-assertions` owns `modernization.md:21` by `as` and `:24` by `unexpectedObjectTypeAssertion`; the smoke run showed the angle-bracket `messageId` is `as` |
| `modernization.md:53` is split into a pattern line and a `note:` line | the owner suffix took it past 250 characters |
| a lint finding carries `hot: unknown` and `fix_cost: none`, and the main agent sets both at the re-read | the lint cannot read `references/stack-cost.md` |
| a run with no operator answer writes no scout file and runs every group as the default sub-agent. `--scout` skips the question | a sub-agent run cannot answer, and the flag is the answer |
| no installer change | the skill writes the scout file |
| the smoke run on the corpus project found cases 3, 6, 8, 11, and 18 through the lint | a cold `npx` cache took 40 s |

These Appendix A lines stay with the passes:

| Line | Why it stays with the passes |
|---|---|
| `type-safety.md:19` | `no-unsafe-type-assertion` flags every narrowing assertion, not only `unknown as T`. The smoke run showed it |
| `modernization.md:33` | its rule options conflict with those of `:35` |
| `modernization.md:49` | the line itself says not to flag it twice under `verbatimModuleSyntax` |
| `code-quality.md:25`, `:26` | naming noise on a convention the scan treats as a project choice |
| `type-safety.md:11`, `:12`, `async-patterns.md:12` | the rule that owns their sibling line reports them |

### 11.1 Fixes after the large-project pair (2026-10-04)

| Fix | Why |
|---|---|
| a promise `.catch` whose handler takes no error is its own line in `error-handling.md`, kept with the pass | the pass skipped the lint-owned empty-catch line, and `no-empty` sees only a `catch {}` block: 1 High was lost |
| the extension check leaves `modernization.md:53` and the lint, and becomes a `note:` | under `nodenext` the compiler reports it as TS2835, and a bundler-resolved package is the config deviation `tsconfig.md` owns. It raised 31–45 false High hits per run |
| the `no-unnecessary-type-assertion` owner line names `as` beside `!` | the rule reports both, so the title contradicted the snippet |
| `max-lines-per-function` and `complexity` are off in test files | a test suite is 1 long callback: 59 hits on the large project |
| no shell heredoc for a run file, in `forbidden_behaviors` and in the pass template | a pass hung about 12 hours on an unbalanced quote |

On the same project the lint now raises 129 findings, down from 233.

## Appendix A — the FULL lines and their rules

`ts/` is `@typescript-eslint/`, and NRS is core `no-restricted-syntax` with the selector named.
All rule names and options were checked on typescript-eslint.io and eslint.org, 2026-10-03.
The selectors marked † ran on a sample project. In a selector regex, a literal dot is `[.]`,
because `\.` did not match in the trial.

| Line | Rule and options |
|---|---|
| `type-safety.md:6` | `ts/ban-ts-comment` `{'ts-ignore':'allow-with-description'}` |
| `type-safety.md:9` (owns `:11`, `:12`) | `ts/no-explicit-any` |
| `type-safety.md:13` | `ts/no-unsafe-function-type` |
| `type-safety.md:14` | `ts/no-restricted-types` `{types:{object:…}}` |
| `type-safety.md:17` | NRS† `TSAsExpression > TSAsExpression.expression[typeAnnotation.type=/^TS(Unknown\|Any)Keyword$/]` |
| `type-safety.md:18` | removed: `modernization.md:21` owns the rule |
| `type-safety.md:19` | `ts/no-unsafe-type-assertion` |
| `type-safety.md:23` | `ts/no-empty-object-type` `{allowInterfaces:'always'}` |
| `type-safety.md:24` | `ts/no-wrapper-object-types` |
| `type-safety.md:33` | `ts/no-unnecessary-type-assertion` |
| `type-safety.md:42` | `ts/no-unnecessary-type-parameters` |
| `type-safety.md:45` | NRS `TSTypeParameter > TSAnyKeyword.default` |
| `type-safety.md:52` | `ts/explicit-module-boundary-types` |
| `async-patterns.md:10`, `:12` | `ts/no-floating-promises`: `:10` owns, and a constructor call is the same rule's site |
| `async-patterns.md:11` | `ts/no-misused-promises` (`checksVoidReturn`) |
| `async-patterns.md:37` | `ts/return-await` `'in-try-catch'` |
| `async-patterns.md:41` | `require-yield` |
| `async-patterns.md:44` | NRS† `ExpressionStatement > CallExpression[callee.name=/^set(Timeout\|Interval)$/]` |
| `error-handling.md:10` | `no-empty` |
| `error-handling.md:14` | `ts/only-throw-error` |
| `error-handling.md:16` | `preserve-caught-error` |
| `modernization.md:11` | NRS `TSEnumDeclaration` |
| `modernization.md:18` | `ts/parameter-properties` |
| `modernization.md:20` | NRS `TSImportEqualsDeclaration[moduleReference.type='TSExternalModuleReference'], TSExportAssignment` |
| `modernization.md:21` | `ts/consistent-type-assertions` `{assertionStyle:'as'}` |
| `modernization.md:24` | `ts/consistent-type-assertions` `{objectLiteralTypeAssertions:'never'}`: the same rule as `:21`, 1 config entry with both options, 2 messages |
| `modernization.md:34` | `ts/prefer-optional-chain` |
| `modernization.md:35` | `ts/prefer-nullish-coalescing` (defaults). `:33` stays with the pass |
| `modernization.md:36` | `logical-assignment-operators` `['always',{enforceForIfStatements:true}]` |
| `modernization.md:39` | NRS† `JSON.parse(JSON.stringify(…))` |
| `modernization.md:49` | `ts/consistent-type-imports`, off when `verbatimModuleSyntax` is on |
| `modernization.md:53` | `ts/no-require-imports`, NRS `module.exports`, and NRS† `ImportDeclaration[source.value=/^[.](?!.*[.](js\|json)$)/]` |
| `modernization.md:55` | NRS `TSTypeAliasDeclaration[id.name=/^(Awaited\|NoInfer)$/]` |
| `modernization.md:57` | `prefer-object-has-own` |
| `modernization.md:61` | `no-restricted-imports` `{paths:[…the bare builtins]}` |
| `code-quality.md:12` | `max-lines-per-function` `{max:50}` |
| `code-quality.md:13` | `complexity` `{max:10}` |
| `code-quality.md:16` | `ts/max-params` `{max:4}` |
| `code-quality.md:17` | `no-unreachable` |
| `code-quality.md:19` | `ts/no-unused-private-class-members` |
| `code-quality.md:25`, `:26` | `ts/naming-convention`: 1 rule with 2 selectors, so the build gives each its own message or keeps `:26` with the pass |
| `code-quality.md:28` | `no-debugger` |
| `code-quality.md:30` | NRS† `.only` and `.skip` on `describe`, `it`, `test` |
| `code-quality.md:41` | `prefer-const` |
| `code-quality.md:44` | NRS† `ExportNamedDeclaration > VariableDeclaration[kind=/^(let\|var)$/]` |
| `code-quality.md:45` | `ts/prefer-for-of` |
| `code-quality.md:47` | `ts/prefer-includes` |
| `code-quality.md:50` | NRS† a `try` that is the whole function body |
| `code-quality.md:51` | `no-warning-comments` `{terms:['todo','fixme','hack'],location:'anywhere'}` |
| `code-quality.md:55` | `no-restricted-imports` `{patterns:[{regex:'^(\\.\\./){3}'}]}` |
| `security.md:19` | `no-eval`, `no-new-func`, `ts/no-implied-eval` |
| `security.md:26` | NRS `innerHTML` and `outerHTML` set from a non-literal, `insertAdjacentHTML`, `document.write` |
| `boundary-validation.md:16` | NRS† `process.env.X` under `!` or `as` |

The table holds the 58 FULL classifications except `modernization.md:33`, which §3.1 leaves with
the pass. After the shared-rule decisions of §3.1, the build owns between 53 and 56 lines.
