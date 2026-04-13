# tsconfig.json Checklist

## Strict Mode Flags

`"strict": true` enables all below. If off, check each individually.

| Flag | Severity if missing | Why |
|---|---|---|
| `strictNullChecks` | **Highest** | Without it, null/undefined assignable to everything |
| `strictFunctionTypes` | **High** | Contravariant parameter checking |
| `strictBindCallApply` | **Medium** | Type-checks bind/call/apply |
| `strictPropertyInitialization` | **High** | Catches uninitialized class properties |
| `noImplicitAny` | **High** | Prevents silent any inference |
| `noImplicitThis` | **Medium** | Catches untyped this |
| `useUnknownInCatchVariables` | **Medium** | catch(e) types as unknown not any |
| `alwaysStrict` | **Low** | Emits "use strict" |

If `strict: true` set but a sub-flag explicitly OFF — flag as that flag's severity.

## Additional Safety Flags

| Flag | Recommended | Severity | Why |
|---|---|---|---|
| `noUncheckedIndexedAccess` | `true` | **Medium** | obj[key] returns T\|undefined instead of T |
| `exactOptionalPropertyTypes` | `true` | **Medium** | Prevents `{ key: undefined }` from satisfying optional `{ key?: string }` |
| `noFallthroughCasesInSwitch` | `true` | **Medium** | Prevents accidental fall-through |
| `noImplicitReturns` | `true` | **Medium** | Not all code paths return a value |
| `noImplicitOverride` | `true` | **Low** | Requires override keyword |
| `noPropertyAccessFromIndexSignature` | `true` | **Low** | Forces bracket notation |
| `allowUnreachableCode` | `false` | **Medium** | Should not be true |

## Module System

| Setting | Recommendation | Severity |
|---|---|---|
| `module` | `"nodenext"` / `"preserve"` / `"esnext"` | **Medium** |
| `moduleResolution` | `"nodenext"` / `"bundler"` | **Medium** (avoid legacy `"node"` / `"node10"`) |
| `verbatimModuleSyntax` | `true` | **Medium** (enforces `import type`, removes unused imports) |
| `isolatedModules` | `true` | **Medium** (required by esbuild, SWC, Babel, TS transpile mode) |

## Path Configuration

- Path aliases must match bundler/runtime config. Mismatches: **High**.
- Aliases pointing to non-existent dirs: **High**.

## Deprecated Flags

Flag if present:
- `suppressImplicitAnyIndexErrors` — **Medium**
- `suppressExcessPropertyErrors` — **Medium**
- `noStrictGenericChecks` — **High**
- `importsNotUsedAsValues` — **Low** (replaced by verbatimModuleSyntax)
- `preserveValueImports` — **Low** (replaced by verbatimModuleSyntax)

## Linter Config

- No linter configured at all: **Medium** (recommend adding one).
- TypeScript parser not configured in ESLint: **Medium**.
- Type-aware rules not enabled (e.g., `no-floating-promises`): **Medium**.
