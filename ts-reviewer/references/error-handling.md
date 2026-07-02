# Error Handling Checklist

Owns all error-handling checks. `code-quality.md` and `async-patterns.md` link here.
Errors lost specifically to async machinery (floating promises) stay in async-patterns.md.

## Silent Failures

- Empty catch block `catch (e) {}` without an explanatory comment. Severity: **High**.
- `catch` that only logs and continues, in a code path whose caller assumes success.
  Severity: **Medium** (High if the swallowed error leaves state partially mutated).
- `Promise.allSettled()` results used without checking `status === 'rejected'` entries.
  Severity: **Medium**.
- Fire-and-forget cleanup (`void cleanup()`) whose failure corrupts subsequent runs.
  Severity: **Medium**.

## Throw Hygiene

- Throwing non-Error values (strings, objects). Severity: **Medium**.
  Fix: `throw new Error(...)` — stack traces and `instanceof` depend on it.
- Custom error classes not extending `Error`. Severity: **Medium**.
- Rethrow that discards the original: `catch (e) { throw new Error(msg) }`.
  Severity: **Medium**. Fix: `throw new Error(msg, { cause: e })` (ES2022).
- Error messages without operational context (what operation, what input id).
  Severity: **Low**.

## Catch Discipline

- Broad `catch` around a large block treating programmer errors (TypeError,
  ReferenceError) the same as expected failures — hides bugs as handled conditions.
  Severity: **Medium**. Fix: narrow the try to the failing operation; re-throw
  unexpected error types.
- `catch (e)` where `e` is used as if typed (`e.message` without narrowing) —
  see type-safety.md `unknown` Discipline. If the project lacks
  `useUnknownInCatchVariables`, flag the config (tsconfig.md), not every catch site.

## Failure Design (public APIs and module seams)

- Expected, recoverable outcomes (not-found, validation failure, conflict) signaled by
  `throw` so every caller needs try/catch for normal control flow. Severity: **Medium**.
  Fix: return a discriminated result: `{ ok: true, value } | { ok: false, error }` —
  exhaustiveness-checkable, contract visible in the signature. Keep `throw` for
  unexpected/unrecoverable failures.
- Exported function's failure modes not derivable from its signature or docs — callers
  can't discriminate errors except by message string matching. Severity: **Medium**.
  Fix: typed error classes or result unions; never promise message-string stability.
- Matching on `e.message` content to branch behavior. Severity: **High** — breaks on
  any wording change.
- `process.exit()` inside library/domain code. Severity: **High** — only entry points
  may decide to terminate.
