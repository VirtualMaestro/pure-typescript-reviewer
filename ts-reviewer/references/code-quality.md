# Code Quality Checklist

## Complexity

- Functions longer than ~50 lines — consider splitting. Severity: **Medium**.
- Cyclomatic complexity > 10 (deeply nested if/else, multiple switch cases with logic).
  Severity: **Medium**.
- Deeply nested callbacks/promises (> 3 levels). Severity: **Medium**.
- God classes — classes with 10+ methods or 500+ lines doing unrelated things.
  Severity: **Medium**.
- Functions with 5+ parameters — consider an options object. Severity: **Low**.
  ```typescript
  // BEFORE
  function send(to: string, subject: string, body: string, cc?: string, bcc?: string) {}

  // BETTER
  interface SendOptions { to: string; subject: string; body: string; cc?: string; bcc?: string; }
  function send(options: SendOptions) {}
  ```

## Dead Code

- Unreachable code after `return`, `throw`, `break`, `continue`. Severity: **Low**.
- Commented-out code blocks (more than 2-3 lines). Severity: **Low**.
  Fix: delete it — version control preserves history.
- Unused private class members. Severity: **Low**.
- Exported symbols that are never imported anywhere in the project. Severity: **Medium**.
  (Check thoroughly before flagging — they might be used by external consumers.)
- Empty files or files with only imports. Severity: **Low**.
- Functions that are defined but never called. Severity: **Medium**.

## Naming

- Misleading names — a variable named `isReady` that contains a string. Severity: **Medium**.
- Single-letter variables outside of trivial loops or lambdas. Severity: **Low**.
- Inconsistent conventions — mixing `camelCase` and `snake_case` for the same kind of thing.
  Severity: **Low**.
- Boolean variables/functions without `is`, `has`, `should`, `can` prefix. Severity: **Low**.
- Abbreviations that hurt readability (`usr`, `msg`, `cfg` in non-obvious contexts).
  Severity: **Low**.
- Class names that don't describe what the class IS (e.g., `Manager`, `Helper`, `Utils`
  without context). Severity: **Low**.

## Error Handling

- Throwing raw strings: `throw "something went wrong"`. Severity: **Medium**.
  Fix: `throw new Error("something went wrong")` — preserves stack trace.
- Custom error classes that don't extend `Error`. Severity: **Medium**.
- Error messages that don't include enough context to debug:
  `throw new Error("not found")` — what wasn't found? Severity: **Low**.
- Missing `cause` chaining (TS 4.6+ / ES2022):
  ```typescript
  // BEFORE
  catch (e) { throw new Error("Failed to load config"); }

  // BETTER
  catch (e) { throw new Error("Failed to load config", { cause: e }); }
  ```
  Severity: **Low**.

## Duplication

- Repeated code blocks (3+ lines identical in 2+ places). Severity: **Medium**.
- Copy-pasted logic with minor variations — extract a parameterized function.
  Severity: **Medium**.
- Multiple functions that do almost the same thing with slightly different signatures.
  Severity: **Medium**.

## Mutability

- `let` where `const` would work (variable never reassigned). Severity: **Low**.
- Mutable function parameters — function modifies an input object/array. Severity: **Medium**.
  Fix: clone the input or return a new object.
- Class fields that should be `readonly` (set only in constructor, never reassigned).
  Severity: **Low**.
- Exporting mutable state from a module (`export let count = 0`). Severity: **High**.
  Fix: encapsulate behind getter/setter or use a function.

## Collections and Iteration

- Using `for (let i = 0; ...)` where `for...of`, `.map()`, or `.filter()` is cleaner.
  Severity: **Low**.
- Using `.reduce()` for complex logic that would be clearer as a `for...of` loop.
  Severity: **Low**.
- Array lookup by value in a hot path — should use `Set` or `Map`. Severity: **Medium**.
- `array.indexOf(x) !== -1` → use `array.includes(x)`. Severity: **Low**.
- `Object.keys(obj).forEach(...)` → use `for (const key of Object.keys(obj))` or
  `Object.entries()`. Severity: **Low**.

## Ad-hoc / Hacky Patterns

These are patterns that suggest a quick fix was applied without proper thought:

- Magic numbers without named constants. Severity: **Low**.
- `setTimeout(() => ..., 100)` as a synchronization mechanism (waiting for something
  to "settle"). Severity: **High** — this is a race condition in disguise.
- Try/catch wrapping an entire function body as a lazy error suppression.
  Severity: **Medium**.
- Multiple `// TODO` or `// FIXME` or `// HACK` comments — collect and list them.
  Severity: **Low** each, but note the total count.
- Boolean parameters: `doSomething(true, false, true)` — unreadable.
  Severity: **Low**. Fix: use an options object.
- String-based type discrimination where a union type should be used:
  `if (type === "foo")` on an untyped string. Severity: **Medium**.
- Platform checks (`typeof window !== 'undefined'`) scattered through the code
  instead of centralized in a platform abstraction layer. Severity: **Low**.

## Module Structure

- Barrel files (`index.ts` re-exporting everything) in large projects — can cause
  circular dependencies and bloat bundle size. Severity: **Low** to **Medium**.
- Circular imports. Severity: **High**.
  Fix: extract shared types/interfaces to a separate module.
- Deep relative imports (`../../../shared/utils/helpers`).
  Severity: **Low**. Fix: configure path aliases in tsconfig.

## Comments

- JSDoc `@param` / `@returns` descriptions that just repeat the type:
  `@param name {string} the name` — adds no value. Severity: **Low**.
- Comments that describe WHAT the code does (obvious from reading it) instead of
  WHY it does it that way. Severity: **Low**.
- Outdated comments that no longer match the code. Severity: **Medium**.
