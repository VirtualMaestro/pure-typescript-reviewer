# Answer key

Never copied into a run. A change to the fixture or to this key is recorded in `RESULTS.md`
with the run it first applied to.

Cases 1–4 and 7 are cost-bearing; 5 and 6 are controls that must *not* trigger a design.

| # | File and shape | Flagged by | Reported fix | `hot` | `fix_cost` | Accepted outcome | Forbidden outcome |
|---|---|---|---|---|---|---|---|
| 1 | `src/frame.ts`, `@hotpath updateFrame(entities, opts)` calling `entities.sort(cmp)` on the parameter, and the walk after it depends on the order | Modernization | `toSorted()` | yes | alloc | rung 4: copy into a module-owned scratch array, sort that. Or rung 7, handed to the operator | `toSorted()` or a spread copy inside the function |
| 2 | `src/particles.ts`, `@hotpath step(raw: unknown[], dt)` with `item as Particle` in the loop | Type Safety | a type guard | yes | check | rung 1: type the parameter `Particle[]`. Or rung 2: 1 guard where the array enters | a guard call inside the loop |
| 3 | `src/physics.ts`, `@hotpath integrate(body, dt)` returning the speed and writing `body.position` and `body.velocity` as an undocumented side effect | Code Quality | return a new object | yes | alloc | rung 7, handed to the operator with both variants: an `out` parameter is a parameter the checklist mutates and re-flags, and a module-owned result object changes what the caller holds | a new object or a spread applied silently; a silent skip with no variants |
| 4 | `src/socket.ts`, `@hotpath onMessage(data)` with `JSON.parse(data) as SocketMessage` | Boundary Validation | a schema parse | yes | check | rung 7, handed to the operator with both variants: the handler is the boundary, so rung 2 pays inside the hot path, and outside data closes no rung 5 | a schema parse applied silently; a silent skip with no variants |
| 5 | `src/report.ts`, cold `buildReport(rows)` calling `rows.sort(byName)`, no loop, no marker | Modernization | `toSorted()` | no | alloc | the reported fix, applied as today, no `Hot path` line, no `Fix design` line | any design step |
| 6 | `src/frame.ts`, inside the same `@hotpath` function: `opts.cmp \|\| byDepth` where `cmp?: Comparator<Entity>` | Modernization | `??` | yes | none | the reported fix, applied as today, no `Hot path` line | any design step |
| 7 | `src/unmarked.ts`, no marker: `for (const batch of batches) { batch.items.sort(ascending); ... }`, reading the median afterwards | Modernization | `toSorted()` | unknown | alloc | rung 4: a module-owned scratch array refilled per batch. Or rung 7, handed to the operator | `toSorted()` inside the loop with no design record |

Case 6 is typed so that `modernization.md:33` fires, the Low line, and not `:32`: a
`Comparator` is never falsy, so `??` for `||` keeps the behaviour. `bench.ts` supplies `cmp` on
every second frame, so `code-quality.md:37` (an option identical at every call site) does not
fire on the same line and swallow the `??` fix in a merge.

## Project-wide rules

- The fixture has a `bench` script, so every designed fix carries 2 numbers, and each number is
  a line of the matching bench log. Any "no regression" or "no impact" without a number fails
  the run.
- The design runs inside the fix attempt, so a case the scan marks `Auto-fixable: No` is never
  designed and misses the bar.
- A case the scan does not flag at all is a defect of the fixture, not of the skill: fix the
  fixture, rerun, and only then read the gate or the bar.

## Red run gate (`3.1.0`, 1 run)

The scan flags all 7 cases, and >= 3 of the 5 cost-bearing cases show their forbidden outcome.
Fewer means the model already avoids the costly fix unprompted: stop, record, reconsider.

## Pass bar (`3.2.0`, each of 3 runs)

- `hot` and `fix_cost` match this key on all 7 cases;
- cases 1, 2, and 7 end in an accepted outcome, and no forbidden outcome is in `git diff`;
- cases 3 and 4 reach the operator as rung 7 designs with both variants and the cost of each;
- cases 5 and 6 are applied as reported, with no `Hot path` line and no `Fix design` line;
- every designed fix carries 2 numbers, each a line of its bench log.
