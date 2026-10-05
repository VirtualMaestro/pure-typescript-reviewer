# Proposal — let the operator pick the domains a scan runs, and make the pick the door for new modules

**Audience:** the agent maintaining the `ts-reviewer` skill repository.
**Status:** approved and built, 2026-10-05, on the branch `large-run-fixes` (§6 holds the commits).

**Decided** (operator, 2026-10-05):
- **The operator can pick what a scan runs**, from a multi-select menu.
- **The menu shows only on request**, not on every run: a question on every scan is friction, and
  a run with no operator would wait on it.
- **A skill-lint finding outside the picked domains is dropped**, so the report holds the pick only.
- **The pick is the door for later modules**, such as a React module: a new module must join the
  menu with no change to the pick itself.
- **The agent builds every step and reruns S′ and Codex unattended.**

---

## 1. Diagnosis

`SKILL.md` `domain_sets:` knows 3 flags (`--arch`, `--full`, `--no-arch`) and a few phrases. An
operator who wants Security alone, or Security and Boundary Validation before a release, runs all 9
domains and reads past the rest. On the 98-file monorepo with Sonnet passes, 1 group costs about
$1.6 of the $8 the passes cost, so a narrow pick pays.

The rest of the machinery already takes any domain set. Step 28 builds 1 pass per `pass_groups` row
holding an active domain, and a group runs only its active domains. Only the input is missing.

Two gaps sit beside it:
- **The skill lint ignores the domain set.** `--arch` alone still runs the lint, and its findings in
  9 domains enter an Architecture-only report.
- **The skill lint runs when no active domain owns a lint line** (Architecture alone, or Config
  and Dependency Hygiene), and costs 1 `npx` approval for nothing.

## 2. The design

### 2.1 2 inputs, 1 result

- **`--domains <slug>,<slug>`** names the active domains by slug (`type-safety`, `security`, ...),
  or by a `pass_groups` group id for every domain of the group. It works on every host and in a run
  with no operator.
- **`--pick`**, or the phrases "pick domains" and "choose domains", asks the operator.

Both end in the same thing the flags give today: an active domain set. Nothing after step 2 changes.

### 2.2 The menu

- **The options are the rows of `pass_groups`,** in row order, and an option names its domains.
  A group is the unit that costs a pass, so the menu prices honestly; `--domains` takes a single
  domain for the operator who wants less.
- **Claude Code** asks with its multi-select question tool, which takes <= 4 options a question:
  the 6 rows are 2 questions.
- **A host with no multi-select** (Codex) lists the groups numbered and reads a reply such as `1,3`.
- **No answer** runs the default set and says so in the discovery summary.

### 2.3 Modules

A module is what the skill already calls a domain: a reference file, a `domains:` row, a
`domain_sets:` default, and a `pass_groups` row with its files rule. Since the menu is read from
`pass_groups`, a module added that way is in the menu and in `--domains` at once. The recipe goes
into `AGENTS.md` `skill_impact`.

A React module needs more than a row, and this proposal does not build it:
- `.tsx` is out of scope today, and `forbidden_behaviors` holds "do not check framework code";
- a framework module needs its own file rule (`.tsx`, the packages that depend on `react`) and must
  lift both lines for its own pass only.

The design leaves the door open: the files rule is already a column of `pass_groups`.

### 2.4 The skill lint

- **Run it only when an active domain owns a lint-owned line.**
- **Pass the active domains to `lint-pass.mjs` as `--domains`,** which drops an owned message whose
  owner's domain is inactive and counts it apart from the unowned ones.

## 3. Changes

| File | Change |
|---|---|
| `ts-reviewer/SKILL.md` `domain_sets:` | the `--domains` and `--pick` rows, and the lines of §2.2 and §2.3 |
| `ts-reviewer/SKILL.md` step 16, `skill_lint:` | the lint runs only for an active owning domain, and passes `--domains` |
| `ts-reviewer/SKILL.md` `discovery_summary` | `Domains:` names the active set and where it came from |
| `ts-reviewer/tools/lint-pass.mjs` | `--domains` filter, and a separate count of the dropped findings |
| `tools.test.mjs` | 1 test of the filter |
| `AGENTS.md` `skill_impact` | the module recipe: a `pass_groups` row puts a module in the menu |
| `README.md` | `--domains` and `--pick` in the domain section, and a 3.5.0 entry |

## 4. Verification

- `npm test` passes, with the new lint filter test.
- **S″:** the large-project rerun on the patched skill, a default scan (`--scout sonnet`): both
  §3.1 boundary sites of the large-run proposal High, `dashboard` out of scope, every pattern row
  with `Locations:`, the `check-passes.mjs` summary in the run.
- **Codex rerun:** the same scan on `gpt-6-sol` at `high`: 1 agent per pass, and analysis findings
  within reach of S″.
- **Pick smoke:** a `--domains security` scan of the recall corpus: 1 Security pass, the lint
  findings of other domains dropped.

## 5. Out of scope

- A React module, and any framework module (§2.3).
- Remembering a pick per project: an operator who wants the same set every time passes the same
  `--domains`.

## 6. Build log

Filled in as the steps land.
