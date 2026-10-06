# Proposal — ask the operator 3 questions at the start of a scan: domains, skill lint, model

**Audience:** the agent maintaining the `ts-reviewer` skill repository.
**Status:** approved and built as 3.7.0, 2026-10-06, with every proposed point confirmed by the
operator.

**Decided** (operator, 2026-10-06):
- **A scan started by the operator opens with 3 questions, in this order:** which domains, whether
  to run the skill lint, which model runs the passes. This replaces the 2026-10-05 decision that the
  domain menu shows only on `--pick` (see `ts-reviewer-domain-pick-proposal.md`).
- **The scan is rare and heavy, so the questions are cheap:** a person spends seconds on them. An
  agent that starts the skill for the operator passes `--defaults` and gets no question.
- **The domain menu has 2 pages, and nothing is pre-checked:** the operator ticks every group by
  hand, which is clearer than a default that a question tool cannot show.
  - Page 1: the 4 cheap groups — Type Safety + Boundary Validation, Async Patterns + Error Handling,
    Config + Dependency Hygiene, Modernization + Code Quality.
  - Page 2: the 2 expensive groups — Security, Architecture.
- **The model is asked on every run.** The previous answer is offered first.
- **A question is skipped when its answer is already known:** a flag gives it, a resume holds it, or
  the lint has nothing to decide for the picked domains.
- **`--defaults`** skips all 3 questions. A flag next to it still wins for its own question.

**Confirmed** (operator, 2026-10-06):
- **The default set drops Security**, so it matches the menu: the 4 groups of page 1, 8 domains.
  Today it is 9 domains with Security. Architecture is already off by default. Security then runs
  only when picked, named by `--domains security`, or with `--full`.

---

## 1. Diagnosis

The 3 choices exist today, but each is hidden:
- **Domains:** the menu shows only on `--pick`. Without it, a scan runs the 9 default domains
  silently. The operator forgot the flag existed, which is the point: a flag nobody remembers is a
  menu nobody sees.
- **Skill lint:** asked at workflow step 16, after discovery has read configs and run tools. The
  question comes mid-run, not at the start.
- **Model:** asked once per project, then stored in the scout file
  (`.claude/agents/ts-reviewer-scout.md`, `.codex/agents/ts-reviewer-scout.toml`). Changing it later
  means deleting the file or remembering `--scout`.

The machinery behind each choice stays as it is: `--domains` slugs, `pass_groups`, the lint
skipping itself when no active domain owns a lint line, and the scout file.

## 2. The design

### 2.1 The flow

1. The run mode is `scan` or `auto`. `fix` and `investigate` run no passes and ask none of this.
2. **Resume first:** when `code-smells/passes/queue.md` exists, ask resume or restart (today's step 6).
   A resume takes all 3 answers from the plan and asks nothing more.
3. **Domains:** page 1, then page 2.
4. **Skill lint:** asked only when an active domain owns a "lint-owned by" line. The same approval
   covers Knip and dependency-cruiser when Architecture is active and they are missing locally, as
   step 16 does today.
5. **Model:** the models the host's agent call lists, the previous answer first, plus "the main
   agent's model".
6. Discovery and the passes run as today, with no question left mid-run.

### 2.2 The domain menu

- Each page is 1 multi-select question. Page 1 has 4 options, which fits the 4-option limit of a
  Claude Code question. Page 2 has 2 options.
- Nothing is pre-checked. The question text says which groups a usual scan ticks.
- The options come from `pass_groups`, as `--pick` reads them today. A row gains a `page` column:
  `1` or `2`. A later module, such as React, joins a page through its row.
- No group ticked on either page: the scan stops and asks again. An empty scan is never what the
  operator meant.
- A host with no multi-select asks a numbered list per page, read from a reply such as `1,3`.
- No answer at all, e.g. the operator is away: the default set runs, and the discovery summary says so.

### 2.3 Flags

| Flag | Question it answers |
|---|---|
| `--domains <slugs>`, `--arch`, `--full`, `--no-arch`, and their phrases | domains |
| `--lint` / `--no-lint` (new) | skill lint |
| `--scout <model>` | model, for 1 run, as today |
| `--defaults` (new) | all 3: the default set, the lint on, the model in the scout file or the default sub-agent |

`--pick` goes away: the menu now shows without it. A request that still carries it gets the menu, as
any other request.

### 2.4 The model

- Asked every run. The answer is written to the scout file, so the next run offers it first, and an
  agent call that reads the file gets it.
- `--defaults` with no scout file runs every group as the default sub-agent, as a run with no answer
  does today.

### 2.5 Resume

The plan `code-smells/passes/plan.json` already holds `lint` and the domains of every pass. It gains
`model` and `effort`. `pass-prompts.mjs` writes them into the queue header next to `Scope:` and
`Agents per wave:`, so a resume reads all 3 answers from the queue.

### 2.6 A host with no question tool (3.7.1)

Asked by the operator after 3.7.0 was staged: does the flow work on Codex? On Codex in default mode
there is no question modal: `request_user_input` is gated to Plan mode, and the flag
`default_mode_request_user_input` that opens it in default mode is under development. 3.7.0 fell
back to a numbered list per question, which costs 4 chat round trips, each ending the agent's turn.

3.7.1 asks every pending start question in 1 message on such a host:
- the 2 pages as 1 numbered list, 1..6 in `pass_groups` row order per page, page 1 first;
- the skill lint as yes or no, when it is asked at all;
- the pass model, the scout file's model first.

1 reply answers all of them, e.g. `1-4,6; lint yes; sonnet high`. Only a part the reply leaves
unreadable is asked again. A question tool that takes 1 choice per question gets each page as a
numbered list in the question text. `codex exec` has no operator to answer: pass `--defaults`.

Codex smoke on the recall corpus (codex-cli 0.160.0, 2026-10-06), driven by `codex exec` and
`codex exec resume`:
- prose rules alone gave 1 message, but no numbered list and a ready-made "defaults" answer; a
  literal message template in `start_questions` fixed both;
- with the template: the 6 groups numbered, nothing offered in advance; the reply
  `1,2; lint no; main model` gave 4 domains "from the menu", the lint declined, the main model;
- `--defaults --no-lint`: no question, the 8 default domains, the default sub-agent.

## 3. Changes

All under `assets/skills/ts-reviewer/` unless named otherwise.

| Where | Change |
|---|---|
| `SKILL.md` `domain_sets` | the menu on every operator scan, 2 pages, the `page` column, `--defaults`; drop `--pick`; the default set (§ Proposed) |
| `SKILL.md` `pass_groups` | add the column `page` |
| `SKILL.md` `workflow` | the 3 questions right after the resume ask, step 16 keeps only running what was approved |
| `SKILL.md` `skill_lint` | `--lint` / `--no-lint`; asked at the start; a decline stays as today |
| `SKILL.md` `pass_agent` | ask every run, previous answer first, write the scout file |
| `SKILL.md` `pass_queue` | `model` and `effort` in the plan |
| `SKILL.md` `discovery_summary` | `Domains:` names the menu / a flag / `--defaults` / no answer |
| `SKILL.md` frontmatter `description` | drop `--pick`, add `--defaults` |
| `tools/pass-prompts.mjs` | write `Lint:` and `Pass model:` into the queue header |
| `README.md` | the start questions, the flags, `--defaults` for agents |
| `tools.test.mjs` | the queue header lines |

`npm test` holds the CNL-P format of every edited line.

## 4. Verification

- `npm test` green.
- A manual scan on the recall corpus (`fixtures/recall-corpus/`), started by hand on Claude Code:
  the 3 questions come in order, before discovery; page 2 ticked empty runs no Security pass; the
  discovery summary names the source of each answer.
- The same corpus with `--defaults`: no question, the default set, the lint on.
- An interrupted run, resumed: no question, the same groups and model.
- 1 Codex run with `--defaults`: no question on a host that may lack a multi-select.

## 5. Out of scope

- Asking the wave size (`--agents N`) or the scope mode: both keep their flags and defaults.
- Any change to what a pass checks, or to the report.
