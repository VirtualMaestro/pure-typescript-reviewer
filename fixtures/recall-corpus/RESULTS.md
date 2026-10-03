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
