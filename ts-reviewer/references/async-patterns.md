# Async Patterns Checklist

## Floating Promises

- Calling an async function without `await`, `.then()`, or `.catch()`.
  Severity: **High** — errors silently disappear, execution order is unpredictable.
  ```typescript
  // BAD
  doAsyncWork(); // no await, no .catch()

  // GOOD
  await doAsyncWork();
  // or if intentionally fire-and-forget:
  void doAsyncWork().catch(handleError);
  ```

- Floating promise in array methods: `items.forEach(async (item) => { ... })`.
  Severity: **High** — `forEach` ignores the returned promises entirely.
  Fix: use `for...of` with `await`, or `Promise.all(items.map(...))`.

- Floating promise in constructor — constructors cannot be async, but calling
  async methods in them without handling the promise is a common bug.
  Severity: **High**.
  Fix: use a static factory method (`static async create(): Promise<Foo>`).

- Event handler that's async but the caller doesn't expect a promise.
  Severity: **Medium** — errors won't propagate to the event system.
  Fix: wrap in try/catch inside the handler.

## Error Handling

- `catch(e)` without typing `e` — since TS 4.4, `catch(e: unknown)` is preferred
  with `useUnknownInCatchVariables` (part of strict). If this flag is off, flag it.
  Severity: **Medium**.

- Empty catch blocks: `catch(e) {}` — swallowing errors silently.
  Severity: **High** if no comment explaining why it's intentional.

- `catch` that only logs but doesn't rethrow or handle:
  ```typescript
  catch(e) { console.error(e); }
  // continues executing as if nothing happened
  ```
  Severity: **Medium** — might be intentional, but often masks bugs.

- `.catch()` at the end of a chain that doesn't handle the error meaningfully
  (just logs or does nothing). Severity: **Medium**.

- Missing error handling in `Promise.allSettled()` results — checking
  `.status === 'fulfilled'` but ignoring `'rejected'` entries. Severity: **Medium**.

## Race Conditions

- Multiple async operations modifying shared state without coordination.
  Severity: **High**.
  Look for: class fields written by multiple async methods, module-level
  variables modified in concurrent async calls.

- `Promise.race()` where the losing promise's side effects still execute.
  Severity: **Medium**.

- Read-modify-write patterns with an `await` in the middle:
  ```typescript
  const value = await getValue();
  const newValue = transform(value);
  await setValue(newValue); // another call might have changed value between the two awaits
  ```
  Severity: **High** if this is in a concurrent context.

## Cancellation

- Long-running async operations without `AbortController` / `AbortSignal` support.
  Severity: **Low** for internal utils, **Medium** for public API.

- `AbortSignal` accepted but never checked inside the async work.
  Severity: **Medium** — the API promises cancellation but doesn't deliver.

- Not cleaning up resources (timers, listeners, streams) when an operation is cancelled.
  Severity: **High**.

## Promise Anti-Patterns

- `new Promise((resolve, reject) => { ... })` wrapping an already-async operation.
  Severity: **Low** (redundant, but not harmful — the explicit promise constructor anti-pattern).
  Fix: just use `async/await`.

- `async function foo() { return await bar(); }` — the `await` is unnecessary
  (the returned promise auto-unwraps). Exception: inside try/catch it IS needed.
  Severity: **Low**.

- `Promise.resolve().then(() => { ... })` used to defer execution.
  Severity: **Low**. Fix: use `queueMicrotask()` or just `await`.

- Mixing `await` and `.then()` chains in the same function — inconsistent style.
  Severity: **Low**.

- `await` in a loop when the iterations are independent:
  ```typescript
  for (const item of items) {
    await process(item); // sequential when it could be parallel
  }
  ```
  Severity: **Medium** (performance issue).
  Fix: `await Promise.all(items.map(item => process(item)))` if order doesn't matter.
  Note: flag only when iterations are truly independent. If they depend on
  previous results or share a rate-limited resource, sequential is correct.

## Async Iterators

- `for await...of` on a non-async iterable — works but is misleading and adds
  unnecessary microtask overhead. Severity: **Low**.

- Async generator that never yields and only returns — should be a regular async function.
  Severity: **Low**.

- Missing `break` / `return` handling in async iteration — the generator's `finally`
  block should clean up resources. Severity: **Medium** if resources are involved.

## Timer Patterns

- `setTimeout` / `setInterval` without storing the timer ID for cleanup.
  Severity: **Medium** — potential memory leak.

- `setInterval` for recurring async work — if the async work takes longer than the
  interval, calls stack up. Severity: **High**.
  Fix: use `setTimeout` with recursive scheduling after the async work completes.

- Using `setTimeout(fn, 0)` for async coordination instead of proper async primitives.
  Severity: **Low**.
