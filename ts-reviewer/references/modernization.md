purpose:
- name the outdated patterns a review flags where a TypeScript 5.9+ equivalent exists, with the severity of each
- load it before the Modernization analysis pass

scope:
- every item here is Medium or Low severity
- the promise constructor anti-pattern belongs to `references/async-patterns.md`
- the suppression directives belong to `references/type-safety.md`

read_first:
- the version gate applies to every check below: confirm the TypeScript version, `target`, `lib`, and runtime of the project support the replacement before flagging
- every finding states the minimum version its replacement needs
- do not recommend a feature the project cannot use

checks:
- enums — a numeric enum, with implicit or explicit values: Medium, the reverse mappings pollute the object and the runtime object invites misuse
- enums — fix: a numeric enum, with a string enum, an `as const` object, or a union
```typescript
const Direction = { Up: 'up', Down: 'down', Left: 'left', Right: 'right' } as const;
type Direction = (typeof Direction)[keyof typeof Direction];
// or a plain union: type Direction = 'up' | 'down' | 'left' | 'right';
```
- enums — a `const enum` in a project using `isolatedModules`, or transpiling with esbuild, SWC, or Babel: Medium, use an `as const` object
- enums — any enum where `erasableSyntaxOnly` is set, or the project runs TypeScript through Node type-stripping: Medium, an enum is non-erasable syntax
- enums — string enums in a codebase that uses them consistently: Low, report it once as a Recurring Pattern with the `as const` alternative, it is a style preference and not a defect
- namespaces — a `namespace` block that splits into separate files with ES module exports: Medium
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
- mutation-safe array methods — fix: an in-place mutation, with `toSorted()`, `toReversed()`, or `toSpliced()`, all ES2023, or copy first
- mutation-safe array methods — `JSON.parse(JSON.stringify(x))` as a deep clone: Low, it drops `undefined` and functions and turns a `Date` into a string, use `structuredClone(x)`
- explicit resource management — manual try and finally cleanup for a disposable resource: Medium, and flag it only where the runtime supports `Symbol.dispose`, Node.js 20+, Deno 1.38+, or Bun 0.6+
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
- module resolution — `require()` in a `.ts` file, `module.exports`, or a missing `.js` extension where `moduleResolution` is `nodenext`: Medium
- deprecated utility types — a custom `Awaited<T>`: Low, it is built in since TS 4.5
- deprecated utility types — a custom `NoInfer<T>`: Low, it is built in since TS 5.4
- modern runtime apis — `arr[arr.length - 1]`: Low, use `arr.at(-1)`, ES2022
- modern runtime apis — `Object.prototype.hasOwnProperty.call(obj, k)`: Low, use `Object.hasOwn(obj, k)`, ES2022
- modern runtime apis — `str.replace(/x/g, y)` with a literal pattern: Low, use `str.replaceAll('x', y)`, ES2021
- modern runtime apis — a manual reduce into groups: Low, use `Object.groupBy` or `Map.groupBy`, ES2024
- modern runtime apis — array spread with filter and map chains over a large iterable: Low, use the iterator helpers `.map`, `.filter`, and `.take`, ES2025
- modern runtime apis — a manual set-arithmetic loop: Low, use `Set.prototype.union`, `intersection`, or `difference`, ES2025
- modern runtime apis — manual timeout-promise wiring: Low, use `AbortSignal.timeout(ms)`, and `AbortSignal.any([...])` to combine signals, Node 20+
- modern runtime apis — a bare builtin import, `import fs from 'fs'`, in Node-targeted code: Low, use the `node:` prefix
- modern runtime apis — `require('./data.json')` or untyped JSON loading in ESM: Low, use an import attribute, `import data from './data.json' with { type: 'json' }`, Node 20.10+ and TS 5.3+

non_findings:
- an annotated constant whose literal types are never used downstream
- every `enum` as a class: flag only the specific enum cases listed above
- a `const enum` in library code compiled with tsc alone: it is inlining on purpose
- declaration merging inside a `.d.ts` file: a `namespace` is the only syntax that expresses it
- `/// <reference types="..." />` in a global `.d.ts` file: no `import` replaces a global type reference
