# Modernization Checklist — TypeScript 5.9+

Flag outdated patterns when a modern TypeScript equivalent exists.
All items here are **Medium** or **Low** severity.

**Version gate (applies to every item):** before flagging, confirm the project's TS
version, `target`/`lib`, and runtime support the recommended replacement. Every finding
must state the minimum version required. Never recommend a feature the project cannot use.

## Enums (Medium/Low — scope carefully)

Do NOT blanket-flag every `enum`. Flag these specific cases:

- **Numeric enums** (implicit or explicit numeric values). Severity: **Medium**.
  Reverse mappings pollute the object; any number was assignable pre-TS5 and the
  runtime object invites misuse. Fix: string enum, `as const` object, or union:
  ```typescript
  const Direction = { Up: 'up', Down: 'down', Left: 'left', Right: 'right' } as const;
  type Direction = (typeof Direction)[keyof typeof Direction];
  // Or simple union: type Direction = 'up' | 'down' | 'left' | 'right';
  ```
- **`const enum` when the project uses `isolatedModules`** or transpiles with
  esbuild/SWC/Babel. Severity: **Medium**. Fix: `as const` object.
  Exception: `const enum` in library code for inlining, compiled with tsc only.
- **Any enum when `erasableSyntaxOnly` is set** or the project runs TS natively via
  Node type-stripping. Severity: **Medium** — enums are non-erasable syntax.
- **String enums in a codebase that uses them consistently:** Severity: **Low**,
  report once as a Recurring Pattern with the `as const` alternative — this is a
  style preference, not a defect.

## `namespace` -> ES Modules (Medium)

Flag `namespace` blocks that could be split into separate files with ES module exports.
Exception: declaration merging in `.d.ts` files.

## `/// <reference>` -> import (Medium)

Flag `/// <reference path="..." />` that could be a regular `import`.
Exception: `/// <reference types="..." />` in global `.d.ts` files.

## `satisfies` Operator (Medium)

Flag only when the widening actually matters — NOT every annotated constant:
- `as Type` on an object literal (silently allows excess/missing property mismatches
  that `satisfies` would catch), or
- an explicit annotation where the literal types are consumed downstream
  (keys used as a union, values used as literal types).

```typescript
// BEFORE: loses literal type that IS used downstream
const config: Config = { timeout: 5000 };
// MODERN: validates AND keeps literal type
const config = { timeout: 5000 } satisfies Config;
```
An annotated constant whose literal types are never used is fine — do not flag.

## `??` and `?.` (Medium/Low)

- `x || fallback` where `x` can legitimately be `0`, `''`, or `false`.
  Severity: **Medium** — behavior bug, not style: valid falsy values are replaced.
  Fix: `x ?? fallback`.
- `x || fallback` where `x` is only ever `T | null | undefined` (falsy non-nullish
  impossible per its type). Severity: **Low**. Fix: `??` for intent clarity.
- `a && a.b && a.b.c` chains. Severity: **Low**. Fix: `a?.b?.c`.
- `x !== null && x !== undefined ? x : y`. Severity: **Low**. Fix: `x ?? y`.
- `if (!x) x = y` / `obj.prop = obj.prop ?? init` self-assignment.
  Severity: **Low**. Fix: `x ??= y` (also `||=`, `&&=` where semantics match).

## Mutation-Safe Array Methods (Medium)

- `.sort()`, `.reverse()`, `.splice()` called on a function parameter, shared array, or
  anything not created locally in the same scope. Severity: **Medium** — mutates the
  caller's data. Fix: `toSorted()`, `toReversed()`, `toSpliced()` (ES2023) or copy first.
- `JSON.parse(JSON.stringify(x))` for deep cloning. Severity: **Low** — silently drops
  `undefined`, functions; `Date` becomes string. Fix: `structuredClone(x)`.

## Explicit Resource Management — `using` (Medium)

Flag manual try/finally cleanup for disposable resources:
```typescript
// BEFORE
const handle = openFile('data.txt');
try { /* work */ } finally { handle.close(); }
// MODERN
using handle = openFile('data.txt');
```
Only flag if the runtime supports `Symbol.dispose` (Node.js 20+, Deno 1.38+, Bun 0.6+).

## `const` Type Parameters (Low)

```typescript
// MODERN
function createRoute<const T extends string>(path: T) { ... }
```

## `import type` and Inline `type` (Low)

Flag type-only imports missing `import type` or inline `type` keyword.
If `verbatimModuleSyntax` is enabled, the compiler enforces this — don't double-flag.

## Redundant get/set Pairs (Low)

Flag a get/set pair that only reads/writes a private backing field with no validation,
transformation, or side effect. Fix: replace with a plain public field (or a `readonly`
field + method if only mutation needs control). Mention the `accessor` keyword only if
the class already uses standard decorators that require it.

## Promise Constructor Anti-Pattern

Covered in `references/async-patterns.md` (Promise Anti-Patterns) — do not duplicate here.

## `Object.keys()` / `Object.entries()` Typing (Low)

Flag `as keyof` casts after `Object.keys()` — suggest a typed helper.

## Module Resolution (Medium)

Flag `require()` in `.ts` files, `module.exports`, missing `.js` extensions
when `moduleResolution` is `nodenext`.

## Deprecated Utility Types (Low)

- Custom `Awaited<T>` — built-in since TS 4.5.
- Custom `NoInfer<T>` — built-in since TS 5.4.

## Modern Runtime APIs (Low, version-gated)

Flag the outdated idiom when the target/runtime supports the modern one:

- `arr[arr.length - 1]` -> `arr.at(-1)` (ES2022).
- `Object.prototype.hasOwnProperty.call(obj, k)` -> `Object.hasOwn(obj, k)` (ES2022).
- `str.replace(/x/g, y)` with a literal pattern -> `str.replaceAll('x', y)` (ES2021).
- Manual reduce-into-groups -> `Object.groupBy` / `Map.groupBy` (ES2024).
- Array spread + filter/map chains over large iterables -> iterator helpers
  (`.map`, `.filter`, `.take` on iterators, ES2025).
- Manual set arithmetic loops -> `Set.prototype.union` / `intersection` /
  `difference` (ES2025).
- Manual timeout-promise wiring -> `AbortSignal.timeout(ms)`; combining signals ->
  `AbortSignal.any([...])` (Node 20+).
- Bare builtin imports (`import fs from 'fs'`) -> `node:` prefix
  (`import fs from 'node:fs'`) in Node-targeted code.
- `require('./data.json')` / untyped JSON loading in ESM -> import attributes:
  `import data from './data.json' with { type: 'json' }` (Node 20.10+/TS 5.3+).

## Suppression Directives

Covered in `references/type-safety.md` (Suppression Directives) — do not duplicate here.
