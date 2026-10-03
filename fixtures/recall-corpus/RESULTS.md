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
