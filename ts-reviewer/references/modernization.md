purpose:
- name the patterns a review flags as below the `target_stack` of `ts-reviewer/SKILL.md`, with the severity of each
- load it before the Modernization analysis pass

scope:
- the promise constructor anti-pattern belongs to `references/async-patterns.md`
- the suppression directives belong to `references/type-safety.md`
- the `tsconfig.json` values the stack pins belong to `references/tsconfig.md`

checks:
- non-erasable syntax — an `enum`, of any kind: High, it emits a runtime object, the numeric form adds reverse mappings, and `erasableSyntaxOnly` rejects it
- non-erasable syntax — fix: an `enum`, with an `as const` object or a union
```typescript
const Direction = { Up: 'up', Down: 'down', Left: 'left', Right: 'right' } as const;
type Direction = (typeof Direction)[keyof typeof Direction];
// or a plain union: type Direction = 'up' | 'down' | 'left' | 'right';
```
- non-erasable syntax — a parameter property, `constructor(private x: T)`: High, declare the field and assign it in the body
- non-erasable syntax — a `namespace` block holding runtime code: High, split it into separate files with ES module exports
- non-erasable syntax — `import x = require(...)` or `export =`: High, use an ES import and export
- non-erasable syntax — an angle-bracket type assertion, `<Type>value`: High, use `value as Type`
- non-erasable syntax — note: `erasableSyntaxOnly` rejects all 5 with TS1294, and each one also breaks a build that transpiles per file
- triple-slash references — `/// <reference path="..." />` that a plain `import` replaces: Medium
- satisfies — `as Type` on an object literal: Medium, it silently allows the excess and missing properties that `satisfies` catches
- satisfies — an explicit annotation whose literal types are consumed downstream, as a union of keys or as literal values: Medium
```typescript
// before: the literal type is lost, and it IS used downstream
const config: Config = { timeout: 5000 };
// modern: validates and keeps the literal type
const config = { timeout: 5000 } satisfies Config;
```
- nullish operators — `x || fallback` where `x` can legitimately be `0`, `''`, or `false`: Medium, it is a behaviour bug and not a style point, the valid falsy value is replaced, use `x ?? fallback`
- nullish operators — `x || fallback` where the type of `x` is only `T | null | undefined`: Low, use `??` to state the intent
- nullish operators — an `a && a.b && a.b.c` chain: Low, use `a?.b?.c`
- nullish operators — `x !== null && x !== undefined ? x : y`: Low, use `x ?? y`
- nullish operators — self-assignment, `if (!x) x = y` or `obj.prop = obj.prop ?? init`: Low, use `x ??= y`, and `||=` or `&&=` where the semantics match
- mutation-safe array methods — `.sort()`, `.reverse()`, or `.splice()` on a parameter, a shared array, or anything not created in the same scope: Medium, it mutates the data of the caller
- mutation-safe array methods — fix: an in-place mutation, with `toSorted()`, `toReversed()`, or `toSpliced()`, or copy first
- mutation-safe array methods — `JSON.parse(JSON.stringify(x))` as a deep clone: Low, it drops `undefined` and functions and turns a `Date` into a string, use `structuredClone(x)`
- explicit resource management — manual try and finally cleanup for a disposable resource: Medium, use `using`
```typescript
// before
const handle = openFile('data.txt');
try { /* work */ } finally { handle.close(); }
// modern
using handle = openFile('data.txt');
```
- const type parameters — a generic that would keep its literal types under `<const T extends string>`: Low
- import type — a type-only import missing `import type` or the inline `type` keyword: Low, and the compiler already enforces it where `verbatimModuleSyntax` is on, so do not flag it twice
- redundant accessors — a get and set pair that only reads and writes a private backing field, with no validation, transformation, or side effect: Low, use a plain public field
- redundant accessors — note: mention the `accessor` keyword only where the class already uses standard decorators that require it
- object keys typing — an `as keyof` cast after `Object.keys()`: Low, suggest a typed helper
- module system — `require()` in a `.ts` file, `module.exports`, or a relative import carrying no `.js` extension: High, the stack is ESM under `nodenext` and Node runs the emitted JavaScript
- module system — note: a relative import naming a `.ts` extension belongs to the type-stripping model, which `target_stack` excludes
- deprecated utility types — a custom `Awaited<T>` or `NoInfer<T>`: Low, both are built in
- modern runtime apis — `arr[arr.length - 1]`: Low, use `arr.at(-1)`
- modern runtime apis — `Object.prototype.hasOwnProperty.call(obj, k)`: Low, use `Object.hasOwn(obj, k)`
- modern runtime apis — `str.replace(/x/g, y)` with a literal pattern: Low, use `str.replaceAll('x', y)`
- modern runtime apis — a manual reduce into groups: Low, use `Object.groupBy` or `Map.groupBy`
- modern runtime apis — manual timeout-promise wiring: Low, use `AbortSignal.timeout(ms)`, and `AbortSignal.any([...])` to combine signals
- modern runtime apis — a bare builtin import, `import fs from 'fs'`: Low, use the `node:` prefix
- modern runtime apis — `require('./data.json')` or untyped JSON loading: Low, use an import attribute, `import data from './data.json' with { type: 'json' }`

non_findings:
- an annotated constant whose literal types are never used downstream
- declaration merging inside a `.d.ts` file: a `namespace` is the only syntax that expresses it
- `/// <reference types="..." />` in a global `.d.ts` file: no `import` replaces a global type reference
