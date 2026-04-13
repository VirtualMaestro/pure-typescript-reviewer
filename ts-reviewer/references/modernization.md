# Modernization Checklist — TypeScript 5.9+

Flag outdated patterns when a modern TypeScript equivalent exists.
All items here are **Medium** or **Low** severity.

## Enums -> const Objects or Union Types (Medium)

```typescript
// OUTDATED
enum Direction { Up, Down, Left, Right }
// MODERN
const Direction = { Up: 'up', Down: 'down', Left: 'left', Right: 'right' } as const;
type Direction = (typeof Direction)[keyof typeof Direction];
// Or simple union: type Direction = 'up' | 'down' | 'left' | 'right';
```
Exception: `const enum` in library code for inlining.
Note: `const enum` is incompatible with `isolatedModules` (used by esbuild, SWC, Babel).
If the project uses a transpiler with `isolatedModules`, flag `const enum` as **Medium**
and recommend `as const` objects instead.

## `namespace` -> ES Modules (Medium)

Flag `namespace` blocks that could be split into separate files with ES module exports.
Exception: declaration merging in `.d.ts` files.

## `/// <reference>` -> import (Medium)

Flag `/// <reference path="..." />` that could be a regular `import`.
Exception: `/// <reference types="..." />` in global `.d.ts` files.

## `satisfies` Operator (Medium)

Flag `as Type` or explicit type annotation where `satisfies` preserves literal types:
```typescript
// BEFORE: loses literal type
const config: Config = { timeout: 5000 };
// MODERN: validates AND keeps literal type
const config = { timeout: 5000 } satisfies Config;
```

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

## `accessor` Keyword (Low)

Flag get/set pairs that simply read/write a backing field — use `accessor` instead.

## `Promise` Constructor -> async/await (Low)

Flag `new Promise()` wrapping an already-async function or another promise.
The promise constructor anti-pattern adds unnecessary nesting.
Fix: use `async/await` directly.
Exception: wrapping callback-based APIs — this is the correct use of the constructor.

## `Object.keys()` / `Object.entries()` Typing (Low)

Flag `as keyof` casts after `Object.keys()` — suggest a typed helper.

## Module Resolution (Medium)

Flag `require()` in `.ts` files, `module.exports`, missing `.js` extensions
when `moduleResolution` is `nodenext`.

## Deprecated Utility Types (Low)

- Custom `Awaited<T>` — built-in since TS 4.5.
- Custom `NoInfer<T>` — built-in since TS 5.4.

## `@ts-expect-error` vs `@ts-ignore` (Low)

Flag `// @ts-ignore` without explanation — recommend `// @ts-expect-error` instead.
`@ts-expect-error` is preferred because it errors if the suppressed error disappears,
preventing stale suppressions from silently hiding future regressions.
