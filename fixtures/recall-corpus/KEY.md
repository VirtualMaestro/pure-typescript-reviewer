# Answer key

Never copied into a run. A change to the fixture or to this key is recorded in `RESULTS.md`
with the run it first applied to. The design it tests is `docs/ts-reviewer-token-cost-proposal.md`.

Cases 1–22 are seeded, and each is planted against 1 reference line. C1 and C2 are controls,
which the scan drops as it does today. Line numbers are those of `project/` as committed.

**Columns:**
- **Lint** says whether Appendix A of the proposal classes the line FULL, that is, owned by the
  skill lint from run L on.
- **Kind** is the case type:
  - `in-file`: the pattern and its evidence sit in 1 file;
  - `hard`: the data flow crosses files, or the check is absence-based;
  - `project`: the case sits in a project file;
  - `gap`: the file carries no filter marker, so the group of §3.3 skips it once the filter
    applies.

| # | Where | Planted against | Severity | Lint | Kind | Accepted categories | The finding names |
|---|---|---|---|---|---|---|---|
| 1 | `src/files.ts:8` | `security.md:37` | Highest | no | in-file | Security | `path.join` with a query value, no containment check |
| 2 | `src/git.ts:4`, taint from `src/cli.ts:6` | `security.md:20` | Highest | no | hard | Security | a template literal in `execSync`, `branch` from `process.argv` |
| 3 | `src/calc.ts:2` | `security.md:19` | Highest | yes | in-file | Security | `eval` of a string parameter |
| 4 | `src/guards.ts:3..4` | `type-safety.md:56` | Highest | no | in-file | Type Safety | `isOrder` narrows to `Order` and checks only `id` |
| 5 | `src/status.ts:5..11` | `type-safety.md:41` | Medium | no | hard | Type Safety | the chain over `Status` misses `cancelled` and has no final `else` |
| 6 | `src/settings.ts:4` | `type-safety.md:17` | High | yes | in-file | Type Safety, Boundary Validation | `as unknown as Settings` |
| 7 | `src/inventory.ts:13..14` | `async-patterns.md:14` | High | no | in-file | Async Patterns | read, `await`, then write of shared `stock`: concurrent `reserve` calls lose updates |
| 8 | `src/startup.ts:4` | `async-patterns.md:10` | High | yes | gap | Async Patterns | `warmCache()` from `cache.ts` called with no `await` and no `.catch` |
| 9 | `src/payments.ts:12` | `error-handling.md:26` | High | no | in-file | Error Handling | branching on `error.message.includes("declined")` |
| 10 | `src/ledger.ts:3..4` | `error-handling.md:24` | Medium | no | gap, hard | Error Handling | `postEntry` throws 2 failures from `ledger-store.ts` that neither its signature nor a doc names |
| 11 | `src/notify.ts:11` | `error-handling.md:10` | High | yes | in-file | Error Handling | the empty `catch` |
| 12 | `src/orders-api.ts:4` | `boundary-validation.md:11` | High | no | in-file | Boundary Validation, Type Safety | `JSON.parse(body) as Order` |
| 13 | `src/pricing.ts:1`, `:5..11` | `boundary-validation.md:18` | Medium | no | hard | Boundary Validation, Architecture | the DB row `OrderRow` from `db.ts` used as the domain model |
| 14 | `tsconfig.json` | `tsconfig.md:13` | High | no | project | Config | `erasableSyntaxOnly` not set |
| 15 | the project root | `tsconfig.md:34` | Medium | no | project | Config | no linter configured |
| 16 | `package.json:22` | `dependency-hygiene.md:20` | Medium | no | project | Dependency Hygiene | `typescript` in `dependencies` |
| 17 | `package.json:25` | `dependency-hygiene.md:19` | High | no | project | Dependency Hygiene | the wildcard range `"*"` on `@types/node` |
| 18 | `src/roles.ts:1` | `modernization.md:11` | High | yes | in-file | Modernization | `enum Role` |
| 19 | `src/ranking.ts:2` | `modernization.md:37` | Medium | no | in-file | Modernization, Code Quality | `scores.sort` on the parameter |
| 20 | `src/feed.ts:5` | `modernization.md:37` | Medium | no | hard | Modernization, Code Quality | `.reverse()` on the module array `catalog.ts` hands out |
| 21 | `src/sync.ts:15` | `code-quality.md:49` | High | no | in-file | Code Quality, Async Patterns | `setTimeout(…, 100)` waiting for `save` |
| 22 | `src/format.ts:5` | `code-quality.md:20` | Medium | no | hard | Code Quality, Architecture | `formatLegacyId` exported, imported by nothing, not re-exported by `index.ts` |
| C1 | `src/report.ts:5` | `modernization.md:37` | — | — | control | — | no finding: the site comment says the in-place sort is deliberate |
| C2 | `src/config.ts:15` | `boundary-validation.md:11` | — | — | control | — | no finding on `JSON.parse`: the value is `unknown` and the guard checks every field |

## Matching

- A finding matches a case when it names the same file, its line falls in the range given ±2,
  its category is 1 of the accepted ones, and its problem names the pattern in the last
  column.
- A project case (14–17) matches on file and pattern.
- Severity is recorded and not scored. The §7 bar counts by the severity in this key.
- A case is scored twice per run:
  - `pass`: some `code-smells/passes/*.jsonl` line matches it;
  - `report`: some entry of `code-smells/report.md` matches it, a Recurring Patterns row
    included.
  - A `pass` hit with no `report` hit is a merge drop, not a pass miss.
- A control fails when a `report` entry at its file and line names its pattern. Other findings
  in the same file do not fail it.

## What each run expects

| Run | Cases 3, 6, 8, 11, 18 (lint-owned) | Cases 8 and 10 (gap) |
|---|---|---|
| B | found by a pass | found by a pass |
| L | found by the lint, as pass `lint-skill` | 8 by the lint, 10 by a pass |
| G, S | found by the lint | 8 by the lint. 10 may be missed: §3.3 accepts the gap. Record it |

A case no B run finds in any of its 3 runs measures nothing. Fix the fixture before step 4.
