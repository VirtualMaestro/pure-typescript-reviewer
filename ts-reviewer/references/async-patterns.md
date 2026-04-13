# Async Patterns Checklist

## Floating Promises

- Async function called without `await`, `.then()`, or `.catch()`.
  Severity: **High**. Fix: `await doWork()` or `void doWork().catch(handleError)`.
- `items.forEach(async (item) => ...)` — forEach ignores returned promises.
  Severity: **High**. Fix: `for...of` with `await`, or `Promise.all(items.map(...))`.
- Floating promise in constructor (cannot be async).
  Severity: **High**. Fix: static factory `static async create(): Promise<Foo>`.
- Async event handler where caller doesn't expect promise.
  Severity: **Medium**. Fix: try/catch inside handler.

## Error Handling

- `catch(e)` without typing as `unknown` (requires `useUnknownInCatchVariables`).
  Severity: **Medium**.
- Empty catch blocks: `catch(e) {}`. Severity: **High** (unless commented).
- `catch` that only logs without rethrowing. Severity: **Medium**.
- `Promise.allSettled()` ignoring `'rejected'` entries. Severity: **Medium**.

## Race Conditions

- Multiple async ops modifying shared state without coordination.
  Severity: **High**.
- `Promise.race()` where losing promise's side effects still execute.
  Severity: **Medium**.
- Read-modify-write with `await` in the middle. Severity: **High** in concurrent contexts.

## Cancellation

- Long async ops without `AbortController`/`AbortSignal` support.
  Severity: **Low** (internal), **Medium** (public API).
- `AbortSignal` accepted but never checked. Severity: **Medium**.
- Missing cleanup on cancellation (timers, listeners, streams). Severity: **High**.

## Promise Utilities

- Manual promise + resolve/reject variables where `Promise.withResolvers()` (ES2024) applies.
  Severity: **Low**. Fix: `const { promise, resolve, reject } = Promise.withResolvers()`.
  Note: only flag if TS target is ES2024+ or polyfill is available.

## Promise Anti-Patterns

- `new Promise()` wrapping async operation (explicit promise constructor anti-pattern).
  Severity: **Low**. Fix: use async/await.
- `async function() { return await bar(); }` — unnecessary await (except in try/catch).
  Severity: **Low**.
- Mixing `await` and `.then()` chains in same function. Severity: **Low**.
- Sequential `await` in loop when iterations are independent.
  Severity: **Medium**. Fix: `Promise.all(items.map(...))` if order doesn't matter.

## Async Iterators

- Async generator that never yields — should be regular async function. Severity: **Low**.
- Missing cleanup in async iteration `finally` block. Severity: **Medium**.
- Async iterator without proper cleanup on early termination (break/return). Severity: **Medium**.

## Timer Patterns

- `setTimeout`/`setInterval` without storing timer ID. Severity: **Medium**.
- `setInterval` for async work (calls stack up). Severity: **High**.
  Fix: recursive `setTimeout` after async work completes.
- `setTimeout(fn, 0)` for async coordination. Severity: **Low**.
