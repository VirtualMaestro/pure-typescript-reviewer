# Modernization Checklist — TypeScript 5.x

Flag code that uses outdated patterns when a modern TypeScript equivalent exists.
All items here are **Medium** or **Low** severity — these are improvements, not bugs.

## Enums → const Objects or Union Types (Medium)

Traditional `enum` has known problems: numeric enums are not type-safe in reverse mapping,
string enums don't support computed members, and all enums emit runtime JavaScript that
can't be tree-shaken.

```typescript
// OUTDATED
enum Direction { Up, Down, Left, Right }

// MODERN — const object + type extraction
const Direction = {
  Up: 'up',
  Down: 'down',
  Left: 'left',
  Right: 'right',
} as const;
type Direction = (typeof Direction)[keyof typeof Direction];

// MODERN — simple union (when you don't need a runtime object)
type Direction = 'up' | 'down' | 'left' | 'right';
```

Exception: `const enum` in library code that specifically needs inlining — don't flag.

## `namespace` → ES Modules (Medium)

```typescript
// OUTDATED
namespace Utils {
  export function foo() {}
}

// MODERN
export function foo() {}
```

Exception: declaration merging in `.d.ts` files — `namespace` is the correct tool there.

## `/// <reference>` → import (Medium)

Triple-slash references are legacy. Use `import` statements.
Exception: `/// <reference types="..." />` in global `.d.ts` files.

## `satisfies` Operator — TS 5.0+ (Medium)

Flag cases where `as const` or explicit type annotation is used but `satisfies` would
preserve the literal type while still validating against the target type.

```typescript
// BEFORE
const config: Config = { timeout: 5000 }; // loses literal type of 5000

// MODERN
const config = { timeout: 5000 } satisfies Config; // validates AND keeps literal type
```

Also flag `as Type` where `satisfies Type` would work — `satisfies` is safer because
it doesn't silence type errors.

## Explicit Resource Management — `using` / `await using` — TS 5.2+ (Medium)

If the project uses TS 5.2+ and has resources that implement dispose patterns
(file handles, database connections, locks, temp files), flag manual try/finally
cleanup that could use `using`:

```typescript
// BEFORE
const handle = openFile('data.txt');
try {
  // work with handle
} finally {
  handle.close();
}

// MODERN (TS 5.2+)
using handle = openFile('data.txt'); // auto-disposed at end of scope
// work with handle
```

Only flag this if the project's TS version supports it (≥ 5.2) and the target
runtime supports `Symbol.dispose` (or it's polyfilled).

## `const` Type Parameters — TS 5.0+ (Low)

When a generic function infers a literal type from its argument but the caller
wants the literal preserved:

```typescript
// BEFORE (caller must remember `as const`)
function createRoute<T extends string>(path: T) { ... }
createRoute('/api/users' as const);

// MODERN
function createRoute<const T extends string>(path: T) { ... }
createRoute('/api/users'); // literal type preserved automatically
```

## `import type` and `type` Keyword in Imports — TS 5.0+ (Low)

Flag type-only imports that don't use `import type` or inline `type` keyword:

```typescript
// OUTDATED
import { MyInterface, MyClass } from './module';

// MODERN (if MyInterface is only used as a type)
import { type MyInterface, MyClass } from './module';
// or
import type { MyInterface } from './module';
import { MyClass } from './module';
```

This helps bundlers with tree-shaking and makes intent clear.
If `verbatimModuleSyntax` is enabled in tsconfig, this is enforced by the compiler.

## `accessor` Keyword — TS 4.9+ (Low)

Auto-accessor fields in classes — simpler syntax for get/set pairs:

```typescript
// BEFORE
class Foo {
  private _name: string;
  get name() { return this._name; }
  set name(v: string) { this._name = v; }
}

// MODERN (if the getter/setter has no custom logic)
class Foo {
  accessor name: string;
}
```

Only flag when the getter/setter pair has no custom logic beyond reading/writing.

## `Promise` Constructor → `async/await` (Low)

```typescript
// OUTDATED
function getData(): Promise<Data> {
  return new Promise((resolve, reject) => {
    try {
      const result = fetchSync();
      resolve(transform(result));
    } catch (e) {
      reject(e);
    }
  });
}

// MODERN
async function getData(): Promise<Data> {
  const result = fetchSync();
  return transform(result);
}
```

Flag `new Promise()` only when it wraps synchronous code or another async call.
The Promise constructor is still correct for wrapping callback-based APIs.

## `Object.keys()` / `Object.entries()` Typing (Low)

```typescript
// PROBLEM: Object.keys returns string[], not (keyof T)[]
const keys = Object.keys(config); // string[]

// MODERN — helper function
function typedKeys<T extends object>(obj: T): (keyof T)[] {
  return Object.keys(obj) as (keyof T)[];
}
```

Flag only if the code immediately casts or uses `as keyof` after `Object.keys`.

## Module Resolution (Medium)

Flag usage of `require()` in `.ts` files (use `import`).
Flag `module.exports` (use `export`).
Flag `.js` extension missing in imports when `moduleResolution` is `nodenext` or `node16`.

## Deprecated Utility Types (Low)

- Hand-rolled `Nullable<T>` → use `T | null | undefined` directly.
- Custom `DeepPartial` → might be fine, but note that libraries like `type-fest`
  provide well-tested versions.
- Custom `Awaited<T>` → built-in since TS 4.5.
- Custom `NoInfer<T>` → built-in since TS 5.4.

## Iterator Helpers — TS 5.6+ (Low)

If the project targets TS 5.6+ with a modern runtime, flag manual iterator
consumption patterns that could use `.map()`, `.filter()`, `.take()`, `.drop()`
etc. on iterators directly.

## Tuple-based Patterns (Low)

- Functions returning `[error, result]` tuples — consider
  a discriminated union `{ ok: true, value: T } | { ok: false, error: E }` instead.
  Only flag if the pattern is inconsistent across the codebase.

## `Array.isArray()` Narrowing (Low)

TS 5.x improved `Array.isArray()` narrowing for `readonly` arrays.
Flag custom type guards that duplicate this built-in narrowing.
