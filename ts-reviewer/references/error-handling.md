purpose:
- name the error-handling patterns a review flags, with the severity of each
- load it before the Error Handling analysis pass

scope:
- every catch, throw, and failure-design check, which `references/code-quality.md` and `references/async-patterns.md` both link here
- an error lost specifically to the async machinery stays in `references/async-patterns.md`

checks:
- silent failures — an empty catch block, `catch (e) {}`, with no comment explaining it: High
- silent failures — a `catch` that logs and continues on a path whose caller assumes success: Medium, High when the swallowed error leaves state partly mutated
- silent failures — `Promise.allSettled()` results read with no check for `status === 'rejected'`: Medium
- silent failures — fire-and-forget cleanup, `void cleanup()`, whose failure corrupts the next run: Medium
- throw hygiene — throwing a non-Error value, a string or an object: Medium, stack traces and `instanceof` both depend on a real Error
- throw hygiene — a custom error class that does not extend `Error`: Medium
- throw hygiene — a rethrow discarding the original, `catch (e) { throw new Error(msg) }`: Medium, use `throw new Error(msg, { cause: e })`
- throw hygiene — an error message with no operational context, naming neither the operation nor the input id: Low
- catch discipline — a broad `catch` around a large block treating a `TypeError` or `ReferenceError` as an expected failure: Medium, it hides a bug as a handled condition
- catch discipline — fix: a broad catch, by narrowing the try to the failing operation and rethrowing the unexpected error types
- catch discipline — note: `catch (e)` where `e` is read as if typed, `e.message` with no narrowing: see the unknown discipline checks in `references/type-safety.md`
- catch discipline — note: flag the missing `useUnknownInCatchVariables` against the config in `references/tsconfig.md` rather than against every catch site
- failure design — an expected, recoverable outcome such as not-found, validation failure, or conflict signalled by `throw`: Medium, every caller then needs a try block for normal control flow
- failure design — fix: a thrown expected outcome, with a discriminated result, `{ ok: true, value } | { ok: false, error }`, and keep `throw` for the unexpected and unrecoverable
- failure design — an exported function whose failure modes are derivable from neither its signature nor its docs: Medium, callers can only tell errors apart by matching the message string
- failure design — fix: an opaque failure mode, with a typed error class or a result union, and do not promise message-string stability
- failure design — branching on the content of `e.message`: High, any wording change breaks it
- failure design — `process.exit()` inside library or domain code: High, only an entry point may decide to terminate
