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
| `noFallthroughCasesInSwitch` | `true` | **Medium** | Prevents accidental fall-through |
| `noImplicitReturns` | `true` | **Medium** | Not all code paths return a value |
| `noImplicitOverride` | `true` | **Low** | Requires override keyword |
| `allowUnreachableCode` | `false` | **Medium** | Should not be true |

## Target and Lib

| Check | Severity | Why |
|---|---|---|
| `target` two+ ES versions below minimum runtime in `engines`/docs | **Medium** | Pointless downleveling: slower output, loses native syntax |
| `lib` includes `dom` in a Node-only project (or vice versa) | **Low** | Wrong globals available at compile time |
| No `target` set (defaults to ES5 pre-5.0 configs) | **Medium** | Almost never intended in 2026 |

## Legacy Decorators

- `experimentalDecorators: true` (with or without `emitDecoratorMetadata`) and no
  dependency that requires legacy decorators. Severity: **Medium**.
  Fix: migrate to standard (TC39) decorators, remove both flags.

## Project Structure (monorepos / large codebases)

- Multiple packages with independent tsconfigs but no `references` / `composite` —
  cross-package type changes silently skip rechecking dependents. Severity: **Low**;
  suggest project references only when packages actually import each other's source.
- Build config drift: `tsconfig.build.json` excludes files that `tsconfig.json`
  typechecks (or vice versa) so `tsc --noEmit` and the build see different code.
  Severity: **Medium**.

## Explicit Non-Findings

Do NOT flag:
- `skipLibCheck: true` — standard practice; checking node_modules types is rarely useful.
- Missing `exactOptionalPropertyTypes` / `noPropertyAccessFromIndexSignature` in an
  existing codebase — these are opt-in strictness with real migration cost.
  Mention once as **Low** suggestions only for greenfield projects (few source files,
  young git history).

## Module System

| Setting | Recommendation | Severity |
|---|---|---|
| `module` | `"nodenext"` / `"preserve"` / `"esnext"` | **Medium** |
| `moduleResolution` | `"nodenext"` / `"bundler"` | **Medium** (avoid legacy `"node"` / `"node10"`) |
| `verbatimModuleSyntax` | `true` | **Medium** (enforces `import type`, removes unused imports) |
| `isolatedModules` | `true` | **Medium** (required by esbuild, SWC, Babel, TS transpile mode) |
| `erasableSyntaxOnly` | `true` if the project runs TS via Node type-stripping | **Medium** when type-stripping is used without it (enums/namespaces/parameter properties would fail at runtime) |

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
  For ESLint, actionable check: config extends `typescript-eslint` `recommendedTypeChecked`
  (or `strictTypeChecked`) and sets `parserOptions.projectService` (or `project`).
