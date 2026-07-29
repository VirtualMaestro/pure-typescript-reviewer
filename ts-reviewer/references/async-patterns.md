purpose:
- name the async patterns a review flags, with the severity of each
- load it before the Async Patterns analysis pass

scope:
- errors lost to the async machinery: a floating promise, an unread `allSettled` result
- every catch, throw, and failure-design check belongs to `references/error-handling.md`

checks:
- floating promises — an async function called with no `await`, `.then()`, or `.catch()`: High, use `await doWork()` or `void doWork().catch(handleError)`
- floating promises — `items.forEach(async (item) => ...)`: High, `forEach` drops the returned promise, use `for...of` with `await` or `Promise.all(items.map(...))`
- floating promises — a floating promise in a constructor, which cannot be async: High, use a static factory, `static async create(): Promise<Foo>`
- floating promises — an async event handler whose caller expects no promise: Medium, catch inside the handler
- race conditions — several async operations modifying shared state with no coordination: High, serialize them through a promise chain or an async mutex, or make them idempotent
- race conditions — `Promise.race()` where the side effects of the losing promise still run: Medium
- race conditions — a read-modify-write with an `await` in the middle: High in a concurrent context
- race conditions — overlapping requests writing 1 variable, where the earlier response can arrive last: High in a concurrent context, it clobbers the later write
- race conditions — fix: last-write-wins, by checking a request-sequence token before applying the result, or by aborting the previous request through an `AbortController`
- race conditions — a lazily initialized async singleton where every concurrent first caller runs the initializer: Medium, memoize the promise rather than the resolved value, `init ??= doInit()`
- timeouts — an `await` on network or IO work with no timeout and no `AbortSignal`: Medium in an internal tool, High on a request-handling path where a hung dependency hangs every caller
- timeouts — fix: a missing timeout, with `fetch(url, { signal: AbortSignal.timeout(5000) })`, or with `Promise.race` against a timer cleared in `finally` when the API takes no signal
- timeouts — a timeout built on `Promise.race` where the losing operation keeps running and holds a socket or a lock: Medium, abort the operation rather than abandoning the promise
- retries — a retry loop with no cap on attempts: High, a persistent failure turns it into an infinite loop
- retries — retries with no backoff: Medium, use exponential backoff with jitter rather than a tight loop against a failing dependency
- retries — retrying a non-idempotent operation such as a payment, an email send, or a resource creation: Highest, it duplicates the side effect
- retries — fix: a non-idempotent retry, with an idempotency key or a server-side check-then-act, and otherwise do not retry
- concurrency limits — `Promise.all(items.map(asyncFn))` over an unbounded collection where `asyncFn` does network or disk work: Medium, process in chunks or use a concurrency limiter
- concurrency limits — note: recommend `Promise.all` only with an explicit concurrency cap once the collection can exceed 10 items
- concurrency limits — `Promise.all` where 1 rejection discards the sibling results the caller still needs: Medium, use `Promise.allSettled` and handle the rejected entries
- concurrency limits — note: a later sibling rejection inside `Promise.all` is not unhandled: every input is subscribed to at the call, so this is not the reason to reach for `allSettled`
- concurrency limits — `Promise.allSettled()` results read with no check for `status === 'rejected'`: Medium
- cancellation — a long async operation with no `AbortController` or `AbortSignal` support: Low internally, Medium on a public API
- cancellation — an `AbortSignal` accepted and never checked: Medium
- cancellation — a timer, listener, or stream left uncleaned on cancellation: High
- promise utilities — a manual promise with separate resolve and reject variables where `Promise.withResolvers()` applies: Low, and flag it only when the target is ES2024+ or a polyfill is present
- promise anti-patterns — `new Promise()` wrapping an operation that is already async: Low, use async and await
- promise anti-patterns — `async function() { return await bar(); }` outside a try block: Low, the `await` is unnecessary
- promise anti-patterns — `await` and `.then()` chains mixed in 1 function: Low
- promise anti-patterns — a sequential `await` in a loop over independent iterations of a bounded collection under 10 known items: Medium, use `Promise.all(items.map(...))`
- promise anti-patterns — note: an unbounded collection or network and disk work needs a concurrency cap instead, under concurrency limits
- async iterators — an async generator that never yields: Low, it wants to be a plain async function
- async iterators — no cleanup in the `finally` of an async iteration: Medium
- async iterators — an async iterator with no cleanup on early termination through `break` or `return`: Medium
- timer patterns — `setTimeout` or `setInterval` called with no stored timer id: Medium
- timer patterns — `setInterval` driving async work: High, the calls stack up, use a recursive `setTimeout` after the work completes
- timer patterns — `setTimeout(fn, 0)` used to coordinate async work: Low
