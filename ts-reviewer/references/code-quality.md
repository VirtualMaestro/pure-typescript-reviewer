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
- Empty files or import-only files. Severity: **Low**.
- Defined but never called functions. Severity: **Medium**.

## Naming

- Misleading names (`isReady` containing a string). Severity: **Medium**.
- Single-letter variables outside trivial loops. Severity: **Low**.
- Inconsistent conventions (mixing camelCase/snake_case). Severity: **Low**.
- Booleans without `is`/`has`/`should`/`can` prefix. Severity: **Low**.
- Opaque abbreviations (`usr`, `msg`, `cfg`). Severity: **Low**.

## Error Handling

- Throwing raw strings. Severity: **Medium**. Fix: `throw new Error(...)`.
- Custom errors not extending `Error`. Severity: **Medium**.
- Error messages without context. Severity: **Low**.
- Missing `cause` chaining (ES2022):
  `catch(e) { throw new Error("msg", { cause: e }); }`. Severity: **Low**.

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

- Barrel files causing circular dependencies. Severity: **Low** to **Medium**.
- Circular imports. Severity: **High**.
- Deep relative imports (`../../../`). Severity: **Low**. Fix: path aliases.

For deeper architectural refactors (shallow modules, dependency seams, module deepening, coupling),
load `references/architecture.md` — available only when architecture review is enabled (`--arch` or `--full`).

## Comments

- JSDoc repeating the type info. Severity: **Low**.
- Comments describing WHAT instead of WHY. Severity: **Low**.
- Outdated comments not matching code. Severity: **Medium**.
