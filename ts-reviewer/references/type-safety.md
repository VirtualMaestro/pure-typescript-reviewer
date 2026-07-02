# Type Safety Checklist

## Suppression Directives

- `// @ts-ignore` without explanation. Severity: **Medium**.
  Recommend `// @ts-expect-error` with a comment explaining why the error is expected.
- `// @ts-expect-error` that no longer suppresses any error (stale). Severity: **Low**.
  The directive should be removed — it was masking nothing.
- `// @ts-ignore` or `// @ts-expect-error` used to hide a type safety issue that could
  be fixed properly. Severity: **Medium**. Fix: address the root cause instead.

## `any` Abuse

- Explicit `any` in function parameters, return types, or variable declarations.
  Severity: **Medium** (internal code), **High** (public API / exported functions).
- Implicit `any` from missing type annotations where TS cannot infer.
  Severity: **Medium**.
- `any[]` where a typed array or generic is possible. Severity: **Medium**.
- `Record<string, any>` — usually should be `Record<string, unknown>` or a proper interface.
  Severity: **Medium**.
- `Function` type — almost always wrong. Use a specific signature. Severity: **High**.
  `Function` bypasses all type checking on arguments and return value.
- `object` type (lowercase) — too broad, prefer a specific interface. Severity: **Low**.

## Unsafe Casts

- `as Type` that narrows a wider type without validation.
  Severity: **High** — a runtime mismatch is a bug waiting to happen.
  Fix: use a type guard, `satisfies`, or a validation function (e.g., Zod, io-ts, hand-written).
- `as unknown as Type` or `as any as Type` — double cast is almost always a red flag.
  Severity: **High**.
- `<Type>value` (angle-bracket cast) — same issue as `as`, plus it conflicts with JSX.
  Severity: **Medium** (prefer `as` syntax, but still flag the underlying safety issue).
- `as const` used correctly is NOT an issue — do not flag it.

## `unknown` Discipline

- `unknown` narrowed with `as` instead of a runtime check. Severity: **High** — this is
  `any` with extra steps. Fix: `typeof` / `instanceof` / `in` guards, or schema validation.
- `catch (e)` handled via `(e as Error).message`. Severity: **Medium**.
  Fix: `e instanceof Error ? e.message : String(e)`.
- Public API returning `unknown` where a generic or a discriminated result type is
  derivable — forces every caller to cast. Severity: **Medium**.

## Structural Typing Traps

- `{}` as a type annotation — means "any non-nullish value", not "empty object" or
  "plain object". Severity: **Medium**. Fix: `Record<string, unknown>`, `object`, or a
  concrete shape.
- Boxed primitive types `String`, `Number`, `Boolean`, `Object` in annotations.
  Severity: **Medium**. Fix: lowercase primitives.
- Method shorthand in interfaces intended as strict callbacks:
  `interface H { handle(e: E): void }` is bivariant even under `strictFunctionTypes`;
  property syntax `handle: (e: E) => void` is checked contravariantly.
  Severity: **Low** internal, **Medium** on public APIs where wrong-argument
  implementations would compile.

## Branded Types (suggestion-level)

- Multiple domain identifiers sharing one primitive type (`userId: string`,
  `orderId: string`) passed across module boundaries — mix-ups compile silently.
  Severity: **Low** (suggest, don't insist). Fix: brand the types:
  `type UserId = string & { readonly __brand: 'UserId' }` plus a constructor function.
  Only flag when the codebase shows 3+ same-primitive IDs crossing function boundaries.

## Non-null Assertions (`!`)

- `value!` where `value` could genuinely be `null | undefined` at runtime.
  Severity: **High**.
- `value!` right after a check that already narrowed the type — redundant, not harmful.
  Severity: **Low** (remove the `!`, the narrowing already handles it).
- `document.getElementById('x')!` — acceptable in DOM code with known IDs,
  but flag if it's in a library or server-side code. Severity: **Medium**.

## Exhaustiveness

- `switch` on a discriminated union missing a `default: assertNever(x)` or equivalent.
  Severity: **High** — adding a new variant to the union won't cause a compile error.
  Fix: add an exhaustive check:
  ```typescript
  function assertNever(x: never): never {
    throw new Error(`Unexpected value: ${x}`);
  }
  ```
- `if/else if` chains on union types without a final `else` that handles the rest.
  Severity: **Medium**.

## Generics

- Unnecessary generics — `function foo<T>(x: T): T` where `T` is never constrained
  and the function doesn't actually use the generic relationship. Severity: **Low**.
- Missing constraints — `<T>` where `<T extends SomeBase>` is needed. Severity: **Medium**.
- Over-constrained generics that accept only one concrete type — just use that type.
  Severity: **Low**.
- Generic with default that hides complexity: `<T = any>`. Severity: **Medium**.

## Discriminated Unions

- Union types that should be discriminated but aren't (no shared literal field).
  Severity: **Medium**.
- Discriminant field is `string` instead of a literal type. Severity: **Medium**.
- Boolean flag soup modeling mutually exclusive states
  (`{ loading: boolean; error?: E; data?: T }` allows impossible combinations).
  Severity: **Medium**. Fix: discriminated union —
  `{ status: 'loading' } | { status: 'error'; error: E } | { status: 'ready'; data: T }`.

## Index Signatures

- `obj[key]` without checking if `key` exists — especially dangerous
  when `noUncheckedIndexedAccess` is disabled. Severity: **Medium** if the flag is off.
- Using `in` operator or `hasOwnProperty` without narrowing. Severity: **Medium**.

## Return Types

- Public/exported functions missing explicit return types. Severity: **Medium**.
  (Internal functions can rely on inference — don't flag those unless the inferred type is `any`.)
- Functions that return different types in different branches without a union return type.
  Severity: **High** — the inferred type might be wider than intended.

## Type Predicates and Assertion Functions

- Type guard functions that return `boolean` instead of `x is Type`.
  Severity: **Low** (works but loses narrowing at call site).
- Assertion functions (`asserts x is Type`) that don't actually throw on failure.
  Severity: **High** — the compiler trusts the assertion.
- Type predicates that lie — the runtime check doesn't match the declared narrowing.
  Severity: **Highest** — this silently causes type mismatches.

## Utility Types

- Hand-rolled types that duplicate built-in utility types
  (`Partial`, `Required`, `Pick`, `Omit`, `Record`, `Readonly`, `ReturnType`,
  `Parameters`, `Awaited`, `NoInfer`). Severity: **Low**.
- `Omit` with a key that doesn't exist in the source type — TS silently allows this,
  which may indicate a typo or stale code. Severity: **Low**.

## Readonly Posture

- Mutable arrays/objects in exported signatures where the function never mutates them —
  `readonly T[]` / `Readonly<T>` communicates the contract and accepts more inputs.
  Severity: **Low**. Public APIs only; don't flag internals.

## Type-level Complexity

- Conditional type > 2 levels deep, or mapped type with nested `infer`, used in only one
  place. Severity: **Low**. Fix: inline or simplify to a union/overloads unless the
  type-level machinery removes real duplication. Clever types are a maintenance cost —
  the next reader must decode them.
