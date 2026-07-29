purpose:
- name the type-safety patterns a review flags, with the severity of each
- load it before the Type Safety analysis pass

checks:
- suppression directives — `// @ts-ignore` with no explanation: Medium, recommend `// @ts-expect-error` with a comment saying why the error is expected
- suppression directives — a `// @ts-expect-error` that suppresses no error: Low, remove it, it masks nothing
- suppression directives — either directive hiding a type-safety issue that can be fixed properly: Medium, address the root cause instead
- any abuse — explicit `any` in a parameter, a return type, or a variable declaration: Medium internally, High on a public API or an exported function
- any abuse — implicit `any` from a missing annotation the compiler cannot infer: Medium
- any abuse — `any[]` where a typed array or a generic fits: Medium
- any abuse — `Record<string, any>`: Medium, use `Record<string, unknown>` or a named interface
- any abuse — the `Function` type: High, it bypasses all type checking on the arguments and the return value, use a specific signature
- any abuse — the lowercase `object` type: Low, it is too wide, prefer a specific interface
- unsafe casts — `as Type` narrowing a wider type with no validation: High, a runtime mismatch reaches production unchecked
- unsafe casts — fix: a narrowing cast, with a type guard, `satisfies`, or a validation function such as Zod, io-ts, or a hand-written one
- unsafe casts — `as unknown as Type` or `as any as Type`: High, a double cast defeats both checks
- unsafe casts — `<Type>value`, the angle-bracket form: Medium, it carries the same risk as `as` and conflicts with JSX, prefer `as` and flag the safety issue under it
- unknown discipline — `unknown` narrowed with `as` instead of a runtime check: High, that is `any` with extra steps
- unknown discipline — fix: an unnarrowed `unknown`, with a `typeof`, `instanceof`, or `in` guard, or with schema validation
- unknown discipline — `catch (e)` read through `(e as Error).message`: Medium, use `e instanceof Error ? e.message : String(e)`
- unknown discipline — a public API returning `unknown` where a generic or a discriminated result type is derivable: Medium, it forces every caller to cast
- structural typing traps — `{}` as an annotation: Medium, it means any non-nullish value, use `Record<string, unknown>`, `object`, or a concrete shape
- structural typing traps — the boxed primitives `String`, `Number`, `Boolean`, `Object` in an annotation: Medium, use the lowercase primitives
- structural typing traps — method shorthand in an interface meant as a strict callback: Low internally, Medium on a public API where a wrong-argument implementation would compile
- structural typing traps — note: `interface H { handle(e: E): void }` stays bivariant under `strictFunctionTypes`, and `handle: (e: E) => void` is checked contravariantly
- branded types — several domain identifiers sharing 1 primitive type and crossing module boundaries: Low, a mix-up compiles silently, so suggest it and do not insist
- branded types — note: flag a missing brand only when the codebase shows 3+ same-primitive identifiers crossing function boundaries, and fix it with a brand plus a constructor function
```typescript
type UserId = string & { readonly __brand: 'UserId' };
```
- non-null assertions — `value!` where `value` can genuinely be `null` or `undefined` at runtime: High
- non-null assertions — `value!` right after a check that already narrowed it: Low, redundant rather than harmful, drop the `!`
- non-null assertions — `document.getElementById('x')!`: Medium, acceptable in DOM code with known ids, flag it in library or server-side code
- exhaustiveness — a `switch` on a discriminated union with no `default: assertNever(x)`: High, a new variant of the union raises no compile error
```typescript
function assertNever(x: never): never {
  throw new Error(`Unexpected value: ${x}`);
}
```
- exhaustiveness — an `if`/`else if` chain over a union with no final `else` covering the rest: Medium
- generics — `function foo<T>(x: T): T` where `T` is never constrained and the generic relation is unused: Low
- generics — `<T>` where `<T extends SomeBase>` is needed: Medium
- generics — a generic constrained down to 1 concrete type: Low, use that type
- generics — a generic default that hides complexity, `<T = any>`: Medium
- discriminated unions — a union that wants a discriminant and has no shared literal field: Medium
- discriminated unions — a discriminant typed `string` instead of a literal type: Medium
- discriminated unions — boolean flags modelling mutually exclusive states, `{ loading: boolean; error?: E; data?: T }`: Medium, the impossible combinations are representable
- discriminated unions — fix: flag soup, with `{ status: 'loading' } | { status: 'error'; error: E } | { status: 'ready'; data: T }`
- index signatures — `obj[key]` with no check that `key` exists: Medium when `noUncheckedIndexedAccess` is off
- index signatures — `in` or `hasOwnProperty` used with no narrowing: Medium
- return types — an exported function with no explicit return type: Medium
- return types — a function returning a different type per branch with no union return type: High, the inferred type can be wider than intended
- type predicates — a type-guard function returning `boolean` instead of `x is Type`: Low, it works and loses the narrowing at the call site
- type predicates — an assertion function, `asserts x is Type`, that does not throw on failure: High, the compiler trusts the assertion
- type predicates — a type predicate that lies, where the runtime check does not match the declared narrowing: Highest, it causes silent type mismatches
- utility types — a hand-rolled type duplicating `Partial`, `Required`, `Pick`, `Omit`, `Record`, `Readonly`, `ReturnType`, `Parameters`, `Awaited`, or `NoInfer`: Low
- utility types — `Omit` with a key absent from the source type: Low, the compiler allows it, and it marks a typo or stale code
- readonly posture — a mutable array or object in an exported signature the function never mutates: Low, `readonly T[]` and `Readonly<T>` state the contract and accept more inputs
- type-level complexity — a conditional type deeper than 2 levels, or a mapped type with a nested `infer`, used in 1 place: Low, inline or simplify it to a union or overloads
- type-level complexity — note: keep the type-level machinery only when it removes real duplication: the next reader has to decode it

non_findings:
- `as const` used correctly
- an internal function relying on return-type inference, unless the inferred type is `any`
- readonly posture on an internal signature: it is a public-API check
