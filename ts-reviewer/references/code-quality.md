# Code Quality Checklist

## Complexity

- Functions > ~50 lines. Severity: **Medium**.
- Cyclomatic complexity > 10. Severity: **Medium**.
- Deeply nested callbacks/promises (> 3 levels). Severity: **Medium**.
- God classes (10+ methods or 500+ lines). Severity: **Medium**.
- Functions with 5+ parameters — use options object. Severity: **Low**.

## Dead Code

- Unreachable code after return/throw/break. Severity: **Low**.
- Commented-out code blocks (> 2-3 lines). Severity: **Low**. Fix: delete (VCS has history).
- Unused private class members. Severity: **Low**.
- Exported symbols never imported anywhere. Severity: **Medium**.
  Exception: symbols re-exported from package entry points or the `exports` map are the
  public API surface of a library, not dead code — do not flag.
- Empty files or import-only files. Severity: **Low**.
- Defined but never called functions. Severity: **Medium**.

## Naming

- Misleading names (`isReady` containing a string). Severity: **Medium**.
- Single-letter variables outside trivial loops. Severity: **Low**.
- Inconsistent conventions (mixing camelCase/snake_case). Severity: **Low**.
- Booleans without `is`/`has`/`should`/`can` prefix. Severity: **Low**.
  Report once per codebase as a Recurring Pattern, never per variable.
- Opaque abbreviations (`usr`, `msg`, `cfg`). Severity: **Low**.

## Error Handling

All error-handling checks live in `references/error-handling.md` — do not duplicate here.

## Debug Artifacts

- `debugger;` statement in committed code. Severity: **High** — blocks execution under
  devtools; never ship.
- Leftover `console.log`/`console.debug` from debugging sessions (dumps of local
  variables, "here", "test") in non-CLI code. Severity: **Low**; **Medium** in library
  code. Don't flag intentional logging or CLI output.
- Committed `.only` / `.skip` in test files. Severity: **High** — `.only` silently
  disables the rest of the suite.

## Import-time Side Effects

- Module top-level code performing IO, registrations, or global mutation while the
  module also exports pure logic. Severity: **Medium** — makes the module untestable
  and load-order-dependent. Fix: move behind an explicit `init()` or the entry point.
- Singleton constructed at module scope and imported everywhere. Severity: **Medium** —
  hidden shared state; nothing can substitute it in tests.

## Testability

- `Date.now()` / `new Date()` / `Math.random()` inline in business logic.
  Severity: **Medium** — untestable nondeterminism. Fix: inject a clock/rng, or accept
  the value as a parameter with a default.
- Logic reachable only through static call chains that cannot be substituted in tests.
  Severity: **Low**; escalate to **Medium** if tests already work around it with
  module-mocking hacks.

## Speculative Abstraction

Lightweight over-engineering checks, active in default scans. For the full framework
(deletion test, seams, depth) load `references/architecture.md` (`--arch` / `--full`).

- Interface with exactly one implementation and no test double using it. Severity: **Low**.
- Factory/builder for a class constructed in exactly one place. Severity: **Low**.
- Config option/parameter whose value is identical at every call site. Severity: **Low**.

## Duplication

- Repeated code blocks (3+ lines in 2+ places). Severity: **Medium**.
- Copy-pasted logic with minor variations. Severity: **Medium**.

## Mutability

- `let` where `const` works. Severity: **Low**.
- Functions mutating input parameters. Severity: **Medium**.
- Class fields that should be `readonly`. Severity: **Low**.
- Exported mutable state (`export let count = 0`). Severity: **High**.

## Collections and Iteration

- `for(let i=0;...)` where `for...of` with `.entries()` or `.map()` is cleaner.
  Severity: **Low**. (Don't flag when the index is genuinely needed for non-sequential access.)
- Array lookup in hot path — use `Set`/`Map`. Severity: **Medium**.
- `indexOf(x) !== -1` -> `includes(x)`. Severity: **Low**.

## Ad-hoc / Hacky Patterns

- Magic numbers without named constants. Severity: **Low**.
- `setTimeout(..., 100)` as sync mechanism. Severity: **High** (race condition).
- Try/catch wrapping entire function body. Severity: **Medium**.
- Collect TODO/FIXME/HACK comments — note total count. Severity: **Low** each.
- Boolean parameters: `doSomething(true, false, true)`. Severity: **Low**.
- Platform checks scattered instead of centralized. Severity: **Low**.

## Module Structure

- Circular imports (including cycles through barrel files). Severity: **High**.
  A barrel file that causes no cycle is not a finding by itself.
- Deep relative imports (`../../../`). Severity: **Low**. Fix: path aliases.

For deeper architectural refactors (shallow modules, dependency seams, module deepening, coupling),
load `references/architecture.md` — available only when architecture review is enabled (`--arch` or `--full`).

## Comments

- JSDoc repeating the type info. Severity: **Low**.
- Comments describing WHAT instead of WHY. Severity: **Low**.
- Outdated comments not matching code. Severity: **Medium**.
