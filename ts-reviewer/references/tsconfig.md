# tsconfig.json Checklist

Check the project's `tsconfig.json` (and any extended configs) against these recommendations.
Every missing flag here is a potential issue — the severity depends on the flag.

## Strict Mode Flags

The `"strict": true` flag enables all of the following. If `strict` is off,
check each flag individually and flag the missing ones.

| Flag | Default (strict) | Severity if missing | Why it matters |
|---|---|---|---|
| `strictNullChecks` | ✅ | **Highest** | Without this, `null` and `undefined` are assignable to everything. The single most important flag. |
| `strictFunctionTypes` | ✅ | **High** | Enables contravariant function parameter checking. Without it, unsound function assignments compile. |
| `strictBindCallApply` | ✅ | **Medium** | Type-checks `bind`, `call`, `apply`. |
| `strictPropertyInitialization` | ✅ | **High** | Catches uninitialized class properties. |
| `noImplicitAny` | ✅ | **High** | Prevents silent `any` inference. |
| `noImplicitThis` | ✅ | **Medium** | Catches untyped `this` in functions. |
| `useUnknownInCatchVariables` | ✅ | **Medium** | Makes `catch(e)` type `e` as `unknown` instead of `any`. |
| `alwaysStrict` | ✅ | **Low** | Emits `"use strict"` — mostly irrelevant with ESM. |

If `strict: true` is set, verify none of these are explicitly turned OFF:
```json
{
  "strict": true,
  "strictNullChecks": false  // ← this overrides strict! Flag as Highest.
}
```

## Additional Safety Flags (not part of `strict`)

| Flag | Recommended | Severity if missing | Why |
|---|---|---|---|
| `noUncheckedIndexedAccess` | `true` | **High** | Without this, `obj[key]` returns `T` instead of `T \| undefined`. One of the most impactful flags after strict. |
| `exactOptionalPropertyTypes` | `true` | **Medium** | Distinguishes between `undefined` value and missing property. |
| `noFallthroughCasesInSwitch` | `true` | **Medium** | Prevents accidental fall-through in switch statements. |
| `noImplicitReturns` | `true` | **Medium** | Catches functions that don't return in all branches. |
| `noImplicitOverride` | `true` | **Low** | Requires `override` keyword when overriding base class methods. |
| `noPropertyAccessFromIndexSignature` | `true` | **Low** | Forces bracket notation for index signature access. |
| `noUnusedLocals` | `true` | **Low** | Catches unused variables. Better handled by linter, but still useful. |
| `noUnusedParameters` | `true` | **Low** | Catches unused function parameters. |
| `allowUnreachableCode` | `false` | **Medium** | Should not be set to `true` — it silences unreachable code errors. |
| `allowUnusedLabels` | `false` | **Low** | Should not be set to `true`. |

## Module System

| Setting | Recommendation | Severity | Notes |
|---|---|---|---|
| `module` | `"nodenext"`, `"node16"`, or `"esnext"` | **Medium** | `"commonjs"` is legacy for new projects. |
| `moduleResolution` | `"nodenext"`, `"node16"`, or `"bundler"` | **Medium** | `"node"` (aka `"node10"`) is outdated. `"bundler"` for bundled projects, `"nodenext"` for Node.js. |
| `verbatimModuleSyntax` | `true` | **Low** | Replaces `esModuleInterop` + `isolatedModules`. Enforces `import type` and `export type` usage. |
| `isolatedModules` | `true` (if not using verbatimModuleSyntax) | **Medium** | Required for transpiler compatibility (esbuild, swc, Babel). |
| `esModuleInterop` | `true` (if not using verbatimModuleSyntax) | **Low** | Fixes CommonJS/ESM interop. Legacy — prefer `verbatimModuleSyntax`. |

## Emit Settings

| Setting | Recommendation | Severity | Notes |
|---|---|---|---|
| `target` | Match your runtime | **Low** | ES2022+ for modern Node.js, ES2020+ for modern browsers. Don't target ES5 unless you need IE11. |
| `declaration` | `true` for libraries | **Low** | Not needed for applications. |
| `declarationMap` | `true` for libraries | **Low** | Enables "go to definition" in consuming projects. |
| `sourceMap` | `true` for development | **Low** | Essential for debugging. |
| `skipLibCheck` | `true` | **Low** | Speeds up compilation by skipping `.d.ts` checks. Common practice, not a problem. |

## Path Configuration

- `"baseUrl"` + `"paths"` for path aliases — check that they match bundler/runtime config.
  Mismatched aliases cause runtime errors while compiling fine. Severity: **High**.
- Path aliases that point to non-existent directories. Severity: **High**.
- `"rootDir"` not matching the actual source root — can cause unexpected output structure.
  Severity: **Medium**.

## Project References

For monorepos using project references (`"references": [...]`):
- `"composite": true` must be set in referenced projects. Severity: **High** if missing.
- Circular project references. Severity: **High**.

## Deprecated / Problematic Flags

Flag these if present:
- `"suppressImplicitAnyIndexErrors"` — deprecated, masks real issues. Severity: **Medium**.
- `"suppressExcessPropertyErrors"` — deprecated. Severity: **Medium**.
- `"keyofStringsOnly"` — legacy, changes semantics of `keyof`. Severity: **Medium**.
- `"noStrictGenericChecks"` — weakens generic type checking. Severity: **High**.
- `"out"` — use `"outDir"` instead. Severity: **Low**.
- `"importsNotUsedAsValues"` — replaced by `verbatimModuleSyntax`. Severity: **Low**.
- `"preserveValueImports"` — replaced by `verbatimModuleSyntax`. Severity: **Low**.

## Linter Config Check

If ESLint / Biome config exists, verify:
- TypeScript parser is configured (`@typescript-eslint/parser` or equivalent).
- Type-aware rules are enabled (e.g., `@typescript-eslint/no-floating-promises`,
  `@typescript-eslint/no-misused-promises`).
- If no linter is configured at all, note it as a **Medium** config issue with
  a recommendation to add one.
