# Results

1 row per run.

**Case columns:** a case column holds `P+R` (found by a pass, kept in the report), `P` (found
by a pass and dropped in the merge), `R` (in the report with no pass line, which is the case for
the main agent's own config and dependency findings), or `-` (missed). A lint-owned case found by
the lint reads `L+R`.

**Control columns:** a control holds `ok` or `reported`.

**Token columns:** these are the `tokens.mjs` totals for the run agent and every agent it
started.

**Recall columns:**
- `High+` counts the found cases among the 14 that the key rates High or Highest.
- `All` counts the found cases among the 22.

| Run | Skill | Model | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | C1 | C2 | High+ | All | Agents | Input | Cache write | Cache read | Output | Thinking | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | 3.3.0 + pins (`5ca9790`) | Opus 5.5, high | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | ok | ok | 14/14 | 22/22 | 10 | 146 | 448939 | 4124919 | 80541 | 20205 | cases 10 and 22 kept in a summary table, not a `###` entry; 42 raw findings, 32 in the report |
| B2 | 3.3.0 + pins (`5ca9790`) | Opus 5.5, high | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | - | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | ok | ok | 14/14 | 21/22 | 10 | 188 | 408939 | 5100272 | 60808 | 18548 | case 10 missed by the error-handling pass; 41 raw, 32 in the report |
| B3 | 3.3.0 + pins (`5ca9790`) | Opus 5.5, high | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | ok | ok | 14/14 | 22/22 | 10 | 196 | 411003 | 5798841 | 61922 | 19269 | 45 raw, 35 in the report; the config pass also raised the enum, merged with case 18 |

| G0-1 | 3.4.0 (`e9ddc67`), skill lint declined | Opus 5.5, high | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | ok | ok | 14/14 | 22/22 | 6 | 120 | 315783 | 3674042 | 50868 | 19925 | 5 groups; no operator, so the lint approval read as declined and the filter stayed off; $3.33 API-equivalent |
| G0-2 | 3.4.0 (`e9ddc67`), skill lint declined | Opus 5.5, high | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | ok | ok | 14/14 | 22/22 | 6 | 126 | 302751 | 3982521 | 53927 | 20442 | as G0-1; case 22 in a summary table; $3.39 |
| G0-3 | 3.4.0 (`e9ddc67`), skill lint declined | Opus 5.5, high | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | ok | ok | 14/14 | 22/22 | 6 | 128 | 296503 | 4036294 | 51952 | 19264 | as G0-1; passes wrote slug categories (`security`, `async-patterns`), which the main agent renamed: a template defect, fixed after this series; $3.33 |
| G-1 | 3.4.0 (`877c529`), skill lint approved | Opus 5.5, high | P+R | P+R | L+R | P+R | P+R | L+P+R | P+R | L+R | P+R | - | L+R | P+R | P+R | P+R | P+R | P+R | P+R | L+R | P+R | P+R | L+P+R | P+R | ok | ok | 14/14 | 21/22 | 6 | 118 | 322711 | 3722260 | 66225 | 20848 | async+error filtered to 7 of 27 files; case 10 is the accepted gap; $3.68 API-equivalent, main agent 55% |
| G-2 | 3.4.0 (`877c529`), skill lint approved | Opus 5.5, high | P+R | P+R | L+R | P+R | P+R | L+P+R | P+R | L+R | P+R | - | L+R | P+R | P+R | P+R | P+R | P+R | P+R | L+R | P+R | P+R | L+P+R | P+R | ok | ok | 14/14 | 21/22 | 6 | 120 | 299385 | 3518999 | 64236 | 18938 | as G-1; the main agent rewrote the lint fixes, whose checklist text is not a concrete fix; $3.49 |
| G-3 | 3.4.0 (`877c529`), skill lint approved | Opus 5.5, high | P+R | P+R | L+R | P+R | P+R | L+R | P+R | L+R | P+R | - | L+R | P+R | P+R | P+R | P+R | P+R | P+R | L+R | P+R | P+R | L+P+R | P+R | ok | ok | 14/14 | 21/22 | 6 | 124 | 307737 | 4076671 | 61308 | 17200 | as G-1; $3.58 |
| S-1 | 3.4.0 (`877c529`), skill lint declined, `--scout sonnet` | Opus 5.5 main, Sonnet 5.5 passes, high | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | - | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | ok | ok | 14/14 | 21/22 | 6 | 106 | 324081 | 3481231 | 53907 | 15570 | 1 invalid JSON line in `security.jsonl` (`\w` in a regex), parsed leniently by the main agent; $2.70 API-equivalent, main agent 68% |
| S-2 | 3.4.0 (`877c529`), skill lint declined, `--scout sonnet` | Opus 5.5 main, Sonnet 5.5 passes, high | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | - | P+R | P+R | P+R | R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | ok | ok | 14/14 | 21/22 | 6 | 88 | 293054 | 2745787 | 60776 | 17719 | case 14 (High) missed by the Sonnet config pass, added by the main agent at its own config audit; security pass wrote check groups as categories; $2.57 |
| S-3 | 3.4.0 (`877c529`), skill lint declined, `--scout sonnet` | Opus 5.5 main, Sonnet 5.5 passes, high | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | P+R | ok | ok | 14/14 | 22/22 | 6 | 116 | 293683 | 3680177 | 57160 | 14928 | 2 invalid JSON lines in `security.jsonl`; categories written as check groups (`injection`); $2.67 |
| G′-1 | 3.4.0 (`f953186`), skill lint approved, concrete lint fixes | Opus 5.5, high | P+R | P+R | L+R | P+R | P+R | L+P+R | P+R | L+R | P+R | - | L+R | P+R | P+R | P+R | P+R | P+R | P+R | L+R | P+R | P+R | L+P+R | P+R | ok | ok | 14/14 | 21/22 | 6 | 122 | 321514 | 3968328 | 55674 | 19331 | $3.52 API-equivalent, main agent 52%; problem fields of selector findings were the bare id, rewritten by the main agent |
| G′-2 | 3.4.0 (`f953186`), skill lint approved, concrete lint fixes | Opus 5.5, high | P+R | P+R | L+R | P+R | P+R | L+R | P+R | L+R | P+R | - | L+R | P+R | P+R | P+R | P+R | P+R | P+R | L+R | P+R | P+R | L+P+R | P+R | ok | ok | 14/14 | 21/22 | 6 | 122 | 292910 | 3555475 | 62214 | 19091 | $3.42 |
| G′-3 | 3.4.0 (`f953186`), skill lint approved, concrete lint fixes | Opus 5.5, high | P+R | P+R | L+R | P+R | P+R | L+R | P+R | L+R | P+R | - | L+R | P+R | P+R | P+R | P+R | P+R | P+R | L+R | P+R | P+R | L+P+R | P+R | ok | ok | 14/14 | 21/22 | 6 | 128 | 313010 | 4095877 | 66697 | 19439 | $3.72 |
Run directories: `recall-corpus-XtGdoB` (B1), `recall-corpus-A2KzSC` (B2), `recall-corpus-0cLko1` (B3).

## Reading the baseline (2026-10-03)

**Recall is near the ceiling.** 65 of 66 case-runs were found, every High+ case in every run,
and no control was reported. The gate of §8 step 3 passes: every case is found at least once.
The only miss is case 10, the Medium gap case, in B2.

Two consequences:
- In G a miss of case 10 is not evidence against the filter alone: B misses it too.
- With Opus at the ceiling, run S (Sonnet) is where the corpus can discriminate.

**Duplicate work is visible.** Each run wrote 41–45 raw findings and reported 32–35. 2 passes
each raised cases 6, 12, 19, 20, and 21, and Config and Dependency Hygiene both raised case 17.
These are exactly the pairs §3.2 groups: TS+BV, Mod+CQ, and Config+Dep.

**Where the spend goes.** The figures are cost-weighted at Opus 5.5 list prices (input $4,
5-minute cache write $5, cache read $0.20, output $20 per MTok):

| Run | Total | Main agent | 9 passes | Per pass |
|---|---|---|---|---|
| B1 | $4.68 | $1.91 (41%) | $2.77 | $0.31 |
| B2 | $4.28 | $1.47 (34%) | $2.81 | $0.31 |
| B3 | $4.45 | $1.78 (40%) | $2.67 | $0.30 |

- **A pass costs about $0.30, and most of it is fixed.** Each pass writes 30–39k tokens to
  cache before it reads a line of `src/`: the system prompt, the tool definitions, the
  instruction files the host loads, the template, and the references. On a 27-file project the
  file reads are the small part. So the number of passes is the lever here, and §3.2 cuts 9 to
  5. On a large project the per-file reads that §3.3 targets grow on top of that.
- **Cache write is the largest pass item** (about $0.17 of $0.30). Cache write prices follow
  the tier: Sonnet 5.5 is $2.50 against Opus $5. So run S saves on writes as well as output,
  not on cache reads alone.
- **The main agent is 34–41% of the run, and no lever in §3 touches it.** Its cost is
  discovery, the step 34 re-read, the merge, the report, and validation. In this corpus that
  share is the next target after L, G, and S. Record it before step 4, so the proposal does
  not promise a cut it cannot deliver.

## Series G0: pass groups only (2026-10-03)

The 3 runs had no operator. The skill lint asks for approval before `npx`, so the runs read
silence as declined. G0 therefore measures the pass groups alone, with the filter off, because
no lint ran. Run directories: `recall-corpus-KDRr7v`, `recall-corpus-Tq0NF1`,
`recall-corpus-RaQe4U`.

| | B (mean of 3) | G0 (mean of 3) | Change |
|---|---|---|---|
| Recall, all cases | 65/66 | 66/66 | none lost |
| Recall, High+ | 42/42 | 42/42 | none lost |
| Agents per run | 10 | 6 | −4 |
| API-equivalent, run | $4.47 | $3.35 | −25% |
| API-equivalent, main agent | $1.72 | $1.51 | −12% |
| API-equivalent, passes | $2.75 | $1.84 | −33% |
| `/usage`, series | not measured | session +11%, week +1% | |

**Reading:**
- The pass groups pass the §7 bar on their own: no case is lost, and spend falls by a quarter.
- The main agent is now 45% of the run. That share is the next target.
- The template line `"category": "[the domain whose checklist names the pattern]"` let the passes
  write slugs. It now asks for the exact name from `[DOMAINS]`.
- **Next series:** G with the skill lint approved in the prompt, which is the full 3.4.0 path.
  Then S.

## Series G: pass groups, skill lint, and the filter (2026-10-03)

The prompt approves the `npx` run in advance. Every run ran `lint-skill` (8 findings) and the 5
groups. The filter gave async+error 7 of 27 files. Run directories: `recall-corpus-sbZL0z`,
`recall-corpus-6HjMeR`, `recall-corpus-J7BOmh`.

| | B | G0 | G | G vs G0 |
|---|---|---|---|---|
| Recall, all cases | 65/66 | 66/66 | 63/66 | case 10 missed 3 of 3 |
| Recall, High+ | 42/42 | 42/42 | 42/42 | none lost |
| API-equivalent, run | $4.47 | $3.35 | $3.58 | +7% |
| API-equivalent, main agent | $1.72 | $1.51 | $1.90 | +26% |
| API-equivalent, passes | $2.75 | $1.84 | $1.68 | −9% |
| Main agent output tokens | 55k | 52k | 64k | +23% |
| `/usage`, series | not measured | session +11%, week +1% | session +10%, week +1% | within reading noise |

**Reading:**
- **The bar of §7 holds for High+.** No High+ case is lost.
- **Case 10 is lost in every G run.** It is the Medium gap §3.3 accepts: `ledger.ts` carries no
  marker. B missed it once in 3, and G0, unfiltered, never. The filter costs exactly this case.
- **On this corpus the skill lint does not pay for itself.** It cuts what the passes spend by
  $0.16 and adds $0.39 to the main agent:
  - running `npx` and the converter;
  - merging 8 more findings;
  - rewriting the `fix` field. `lint-pass.mjs` copies the checklist text, which is often a
    reason (`a double cast defeats both checks`) rather than a concrete fix, so the main agent
    rewrites it under "do not report a finding without … a concrete fix".
- **The lint saving should grow with the file count, and its cost should not.** The pass saving
  scales with the files the passes no longer reason over. The main agent's cost is per finding
  and per run. 27 small files is the worst case for it. This is an expectation, not a
  measurement.
- **The §7 token bar** ("each lever lowers the run total against the run before it") fails for
  the lint on this corpus. The operator decides between dropping the lint, keeping it for larger
  projects, or cutting its main-agent cost first.

## Series S: pass groups with Sonnet passes, skill lint declined (2026-10-03)

The configuration is G0's, with `--scout sonnet`. Every pass ran on `claude-sonnet-5-5` at
`high`, the run agent's effort, and the main agent on Opus 5.5. Run directories:
`recall-corpus-8JhYEQ`, `recall-corpus-NovKXj`, `recall-corpus-8G6tJF`.

| | B | G0 | S | S vs G0 |
|---|---|---|---|---|
| Recall in the report, all cases | 65/66 | 66/66 | 64/66 | case 10 missed 2 of 3 |
| Recall in the report, High+ | 42/42 | 42/42 | 42/42 | none lost |
| Recall by the passes, High+ | 42/42 | 42/42 | 41/42 | case 14 missed once, recovered by the main agent |
| API-equivalent, run | $4.47 | $3.35 | $2.65 | −21% (−41% vs B) |
| API-equivalent, main agent | $1.72 | $1.51 | $1.77 | +17% |
| API-equivalent, passes | $2.75 | $1.84 | $0.88 | −52% |
| `/usage`, series | not measured | session +11%, week +1% | week +1%; the session window reset mid-series | |

**Reading:**
- **The scout passes the §7 bar.** Every High+ case is in the report in every run, and the
  run total falls by a fifth against G0.
- **The bar holds only because the main agent verifies.** The Sonnet config pass missed
  `erasableSyntaxOnly` once (case 14, High). The main agent found it at its own config audit
  (steps 9–11). That is the operator's design working: the smaller model finds, the larger one
  checks.
- **The smaller model is sloppier at the contract, and the main agent pays for it:**
  - **invalid JSON:** 3 lines across 2 runs, a regex with `\w` or `\d` in the `fix`
    field;
  - **wrong categories:** check groups (`injection`) written instead of the domain, despite the
    template line fixed after G0.

  The main agent repaired both, and its share grew from 45% to 67%. A strict reader of
  `passes/*.jsonl` would have lost those findings. Candidates:
  - a `tools/` check that validates and repairs the JSONL before step 33;
  - the category filled by the main agent from the pass file name rather than trusted from the
    line.
- **Case 10 (Medium)** is missed in 2 of 3 runs, against 3 of 3 found in G0. It is the hardest
  case: the failure modes live in a callee file.
- **The main agent is now 2/3 of the spend.** The next cut is there.

## Series G′: G with a concrete fix on every lint-owned line (2026-10-03)

The skill is `f953186`. All 49 owner lines carry an action, and the main agent keeps a lint
finding's title and fix as written. Run directories: `recall-corpus-szrcZp`,
`recall-corpus-kc9NJ1`, `recall-corpus-n8RJdj`.

| | G0 | G | G′ | G′ vs G0 |
|---|---|---|---|---|
| Recall, all / High+ | 66/66, 42/42 | 63/66, 42/42 | 63/66, 42/42 | case 10 (filter gap) lost 3 of 3 |
| API-equivalent, run | $3.35 | $3.58 | $3.55 | +6% |
| API-equivalent, main agent | $1.51 | $1.90 | $1.79 | +19% |
| API-equivalent, passes | $1.84 | $1.68 | $1.75 | −5% |
| `/usage`, series | session +11%, week +1% | session +10%, week +1% | session +11%, week +1% | |

**Reading:**
- **The concrete fixes cut the main agent's spend by 6%, not by the 26% that G added.**
- **The rest is not the fix text.** The G′-1 transcript shows the main agent building the report
  through a generated script. One heredoc failed on a quote and was written again, about 18k
  characters of output twice. That cost is a property of how the main agent writes the report.
  It belongs to the next target, the main agent, and not to the lint.
- **Still open: 2 small lint costs**, fixed after this series:
  - the `problem` field of a selector finding was the bare id (`enum`), which the main agent
    rewrote. `lint-pass.mjs` now uses the owner's title there;
  - the `enum` line read as if its reason described the replacement.
- **Verdict on this corpus:** the pass groups pay (−25%). The Sonnet scout pays (−21% more). The
  skill lint does not pay on 27 small files: +6% spend, and through the filter it costs case 10.
  Whether it pays on a large project is not measured.

## A large project: G0 against G′, 1 run each (2026-10-04)

The project is a private pnpm monorepo of 98 `.ts` files and about 17.6k lines in 4 packages,
with Biome on its `recommended` preset. It was cloned to a temp directory, and only the scan ran.
There is no answer key, so recall is compared between the 2 reports, not scored. The skill is
`502b391`.

| | G0 (lint declined) | G′ (lint approved) |
|---|---|---|
| Passes | 21 (4 groups × 5 directory parts + config) | 21, plus `lint-skill` |
| Files of the async+error group | 98 | 58 (the filter) |
| Raw findings | 241 | 344 (233 from the lint) |
| Report | 98 issues, 23 High | 88 issues, 18 High |
| API-equivalent, run | $23.63 | **$21.59 (−8.6%)** |
| API-equivalent, main agent | $4.26 (18%) | $4.17 (19%) |
| API-equivalent, passes | $19.37 | $17.41 (−10%) |
| Output tokens | 355k | 311k (−12.5%) |
| Wall clock | 41 min | 31 min |
| `/usage`, both runs together | | week +7% (78% → 85%); the session window reset in between |

**Reading:**
- **On a large project the skill lint pays.** −8.6% spend, −12.5% output, and 10 minutes less.
  This is the reverse of the corpus, as expected: the passes are now 80% of the run, and the
  lint takes 49 lines off every one of 21 passes.
- **The passes, not the main agent, are the target on a large project.** The main agent is 18–19%
  here, against 45–67% on the corpus. Halving pass cost is what series S showed the Sonnet scout
  does. On this project that is about $8–9 of $21.6, so the scout is the largest lever for large
  projects. It is not measured here.
- **High findings in G0 and not in G′, traced through G′'s raw pass lines:**
  - **1 is lost to lint ownership.** A promise `.catch(() => undefined)` was flagged by G0 under
    `error-handling.md:16` (an empty catch block). In G′ that line is lint-owned, so the pass
    skipped it, and `no-empty` sees only a `catch {}` block, never an empty promise handler.
    The line is narrower in the lint than in a reader's reading. The fix is a separate line
    for a promise `.catch` handler that drops the error.
  - **3 are 1 root.** 3 per-site casts in G0 became 1 finding on the generic helper they all call
    in G′ (`boundary-validation.md:14`).
  - **2 look like run variance.** A test helper cast and an inline asserted type: no G′ pass line
    is near them.
  - **1 is consolidated.** A module-system High is in G′ as a lint line, folded into a pattern.
- **Noise both runs share:** 31–44 High "relative import without `.js`" hits in a Next.js package
  that resolves through its bundler. `modernization.md:53` and its selector assume `nodenext`.
  Gate both on the governing tsconfig's `moduleResolution`.
- **Title mismatch:** `@typescript-eslint/no-unnecessary-type-assertion` reports unnecessary
  `as` too, and its owner line speaks of `!` only. Restrict the owner by `messageId`, or widen
  the line.
- **A stray nested pass** from an earlier corpus series hung about 12 hours on a heredoc waiting
  for input, and the host killed it for low memory. Its file had already been written by a
  second script, so no result changed. Nothing in the skill notices a pass that stops replying.

## The large project with Sonnet passes, and a first Codex run (2026-10-04)

Both runs read the game-trends monorepo at `4ab9ac3`, the commit of the G0 and G′ pair. The skill
is `8dba6a7` (`3.4.0` with the §11.1 fixes). Only the scan ran, in fresh clones under `%TEMP%`:
`gt-s` for Claude Code and `gt-cx` for Codex. The original repository is untouched.

### S′: G′ plus `--scout sonnet`, 1 run

The main agent ran on Opus 5.5 at `high`. 21 passes ran on `claude-sonnet-5-5` at `high`, and the
skill lint ran in the main agent. Prices are list prices per MTok: Opus input $4, cache write $5,
cache read $0.20, output $20; Sonnet at half of each.

| | G0 | G′ | S′ | S′ vs G′ |
|---|---|---|---|---|
| Passes | 21 | 21 + lint | 21 + lint | |
| Skill lint findings | declined | 233 | 129 | the `393ebbb` test and extension fixes |
| Raw findings | 241 | 344 | 263 | |
| Report | 98 issues, 23 High | 88 issues, 18 High | 94 issues, 15 High | |
| API-equivalent, run | $23.63 | $21.59 | **$11.62** | **−46%** |
| API-equivalent, main agent | $4.26 | $4.17 | $3.56 | −15% |
| API-equivalent, passes | $19.37 | $17.41 | $8.06 | −54% |
| Wall clock | 41 min | 31 min | 26 min | |

**Reading:**
- **The Sonnet scout pays on a large project as on the corpus.** It halves the passes, and the
  passes are 69% of the run here.
- **The relative-import noise is gone.** G0 and G′ carried 31–44 High hits on imports without
  `.js` in a bundler-resolved package. S′ has none.
- **6 High sites of G′ are not High in S′.** Traced through the S′ pass lines:
  - **2 are a severity gap in the rules.** Sonnet found both and graded them Medium, and the main
    agent kept Medium. `boundary-validation.md:11` names `JSON.parse`, `res.json()`, env, CLI
    arguments, messages, and files. It names neither a DB query result typed by a generic
    (`sql<{ oid: number }>` in `db/src/infrastructure/db.ts:77`) nor a `JSON.parse` result used
    as `any` with no annotation (`crawler/src/crawl/adapters/poki-adapter.ts:152`). Opus read
    both as the High line and Sonnet did not. S′ is inconsistent with itself: a cast of a count
    row in `db/src/database.test.ts:646` is High, and the `sql<T>` pattern on 4 test reads is
    Medium.
  - **3 look like run variance.** S′ reports a different issue a few lines away in the same file
    (`runtime-core.ts:43` against `:38`, `runtime.ts` import-time state against a `globalThis`
    cast), or nothing (`runtime-core.test.ts:82`, a fixed 10 ms timer).
  - **1 is the removed noise:** a `.js` extension High on `dashboard/src/app/v1/game-growth/route.ts:1`.
- **S′ found High sites G′ did not report:** a dispose failure dropped by a handler that takes no
  error, a test fixture cast to a platform literal, a count-row cast, and every parameter
  property site in the High pattern row.
- **Sonnet's contract slips, repaired by the main agent:** 1 file
  (`async-patterns+error-handling.dashboard.jsonl`) was 1 physical line with the 2 characters
  `\n` between 4 records. No category was wrong this time.
- **A pass can claim files it did not read.** The `security.crawler` agent said it searched rather
  than read and skipped the 10 test files, and its `done` line still says `"files": 23`.
- **The main agent wrote a helper script through a heredoc,** against `SKILL.md:69`.
- **Points the run agent found unclear,** quoted:
  - "split by directory above 20" (step 28): the directory level is not defined; the top level
    left `dashboard` at 40 files;
  - "every group runs as the `ts-reviewer-scout` agent" (`pass_agent:`) beside `--scout` that "is
    not written to the scout file", when no scout file exists;
  - "no row of that table is counted" (`report_format`) beside the validator's comment that
    members "are counted where they sit";
  - step 41 names no grouping key for the leftover findings;
  - "do not check framework code" does not say whether a Next.js package is in scope.

### Codex: `gpt-6-sol` at `high`, stopped by the usage limit

`codex exec` 0.157.1 ran with `-s workspace-write` and network on, from a ChatGPT account.
`gpt-6.1-sol`, the default in the operator's config, is refused for a ChatGPT account (HTTP 400),
so the run took `gpt-6-sol`. After about 25 minutes the account hit its usage limit and the turn
failed with no report.

What ran before the stop:
- **Discovery, `tsc`, Biome, and the audit** all ran. The skill lint gave 129 findings and the
  filter kept 58 of 98 files, the same as S′: the lint step is host-neutral.
- **Codex ran the passes as real sub-agents** (44 collaboration calls). Security, Type Safety and
  Boundary, and Async and Error ran on all 9 parts, and Modernization and Code Quality on 2 of 9.
- **Codex split the directories finer than Claude** (`crawler-src`/`crawler-test`,
  `dashboard-server-a`/`-b`, `db-repositories`/`db-other`): the second reading of step 28.
- **Its native shell hung on short commands** under the Windows `unelevated` sandbox, and it
  moved to the context-mode shell. That is the host, not the skill.
- **Its candidates match S′:** the `embeddedJson` cast, the dropped dispose failure, and a child
  process with no timeout.

`code-smells/passes/queue.md` in `gt-cx` holds the queue, so the run can resume after the reset.
