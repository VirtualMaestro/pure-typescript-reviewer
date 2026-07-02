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

All catch/throw/failure-design checks live in `references/error-handling.md` — do not
duplicate them here. This domain only flags errors *lost to the async machinery*
(floating promises above, allSettled below).

## Race Conditions

- Multiple async ops modifying shared state without coordination.
  Severity: **High**. Fix: serialize via a promise chain / async mutex, or make the
  operations idempotent so ordering doesn't matter.
- `Promise.race()` where losing promise's side effects still execute.
  Severity: **Medium**.
- Read-modify-write with `await` in the middle. Severity: **High** in concurrent contexts.
- Overlapping requests writing to the same variable/state where the earlier response
  can arrive last (last-write-wins clobbering). Severity: **High** in concurrent contexts.
  Fix: request-sequence token check before applying the result, or abort the previous
  request via AbortController.
- Lazily-initialized async singleton where concurrent first callers each run the
  initializer. Severity: **Medium**. Fix: memoize the *promise*, not the resolved value:
  `init ??= doInit(); return init;`

## Timeouts

- `await` on network/IO (fetch, DB call, queue op) with no timeout and no AbortSignal.
  Severity: **Medium** (internal tools), **High** (request-handling / server paths —
  a hung dependency hangs every caller).
  Fix: `fetch(url, { signal: AbortSignal.timeout(5000) })`, or `Promise.race` with a
  timer for APIs without signal support (clear the timer in `finally`).
- Timeout implemented with `Promise.race` but the losing operation keeps running and
  holds resources (sockets, locks). Severity: **Medium**. Fix: abort the operation,
  don't just abandon the promise.

## Retries

- Retry loop without a max-attempt cap. Severity: **High** (infinite loop under
  persistent failure).
- Retries without backoff (tight loop hammering a failing dependency). Severity: **Medium**.
  Fix: exponential backoff with jitter.
- Retrying a non-idempotent operation (payment, email send, resource creation).
  Severity: **Highest** — duplicate side effects. Fix: idempotency key or check-then-act
  on the server side; otherwise don't retry.

## Concurrency Limits

- `Promise.all(items.map(asyncFn))` where `items` is unbounded (user data, file lists,
  API pages) and `asyncFn` does network/disk work. Severity: **Medium**.
  Fix: process in chunks or use a concurrency limiter. Do NOT recommend converting
  sequential awaits to unbounded `Promise.all` — recommend it only with an explicit
  concurrency cap when the collection can exceed ~10 items.
- `Promise.all` where one rejection should not discard sibling results, or where
  siblings' later rejections become unhandled. Severity: **Medium**.
  Fix: `Promise.allSettled` + explicit handling of `rejected` entries.
- `Promise.allSettled()` results used without checking `status === 'rejected'` entries.
  Severity: **Medium**.

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
- Sequential `await` in loop when iterations are independent AND the collection is small
  and bounded (< ~10 known items). Severity: **Medium**. Fix: `Promise.all(items.map(...))`.
  If the collection is unbounded or does network/disk work, require a concurrency cap
  instead — see Concurrency Limits.

## Async Iterators

- Async generator that never yields — should be regular async function. Severity: **Low**.
- Missing cleanup in async iteration `finally` block. Severity: **Medium**.
- Async iterator without proper cleanup on early termination (break/return). Severity: **Medium**.

## Timer Patterns

- `setTimeout`/`setInterval` without storing timer ID. Severity: **Medium**.
- `setInterval` for async work (calls stack up). Severity: **High**.
  Fix: recursive `setTimeout` after async work completes.
- `setTimeout(fn, 0)` for async coordination. Severity: **Low**.
