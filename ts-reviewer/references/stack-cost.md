purpose:
- fill the slots `references/fix-design.md` reads, for the stack `target_stack` names
- load it with the checklist of every analysis pass, and before fix mode designs a fix

scope:
- `references/fix-design.md` owns the design algorithm, and this file owns every stack term it needs
- a port to another stack rewrites this file block by block, and keeps every block name

hot_marker:
- the JSDoc tag `@hotpath` on a function, a method, or a class marks its body as a hot path
- `@hotpath` in the leading comment of a file marks every function in that file
- an iteration callback is the function passed to `forEach`, `map`, `filter`, `reduce`, `flatMap`, `some`, `every`, `find`, or `sort`
- `hot` is `yes` when a marker covers the snippet
- `hot` is `unknown` when no marker covers the snippet and it sits in a loop body or an iteration callback
- `hot` is `no` in every other case

cost_kinds:

| Kind | What the fix adds to every call or iteration | Examples |
|---|---|---|
| `none` | nothing at run time | `??` for `\|\|`, `satisfies`, a type annotation, `readonly` |
| `alloc` | a heap allocation | `toSorted()`, a spread copy, `structuredClone()`, a closure, a wrapper object |
| `pass` | a traversal of a collection, or a higher complexity class | a second `.filter()`, a lookup inside a loop |
| `check` | a runtime validation or a guard | a schema parse or a type guard in place of `as T` |
| `async` | an `await`, a promise, or a timer | `await` on a synchronous path, a `Promise.all` wrapper |

rung_forms:

| Rung | Form in this stack |
|---|---|
| remove | a branded type, a discriminated union, or a narrowed parameter type, which leaves the cast or the guard nothing to check |
| boundary | 1 schema parse or 1 guard where the value enters: the exported function, the message handler, the module entry |
| hoist | a `const` computed above the loop, a scratch array declared above the loop and refilled in it, or a `RegExp` or a closure lifted to module scope |
| reuse | a module-owned scratch array or object, refilled on every iteration, or a typed array for numeric data |
| dev-only | an assertion behind a module-level `const DEV = process.env.NODE_ENV !== 'production'`, plus the precondition in the JSDoc |
| split | a test for the common case first, such as `length <= 1` or an identity check, then the costly path |
| in-place | the reported fix as written |

measurement:
- a `bench` or `benchmark` script in `package.json` is the measurement, run with the package manager the lockfile names
- the output goes to `$TMPDIR/ts-reviewer-bench-before.log` and `$TMPDIR/ts-reviewer-bench-after.log`, next to the test logs
- the number recorded is the output line naming the changed function or file, and the last output line when no line names it
- a project with neither script has no measurement, and the record reads `unmeasured`
