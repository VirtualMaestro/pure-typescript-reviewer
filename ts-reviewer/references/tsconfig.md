purpose:
- name the `tsconfig.json` and linter-config settings a review flags, with the severity of each
- load it before the Config analysis pass

read_first:
- `"strict": true` turns on every strict flag below, so check the flags one by one only when `strict` is off
- a sub-flag switched explicitly off under `"strict": true` is flagged at the severity of that flag

checks:
- strict flags — `strictNullChecks` missing: Highest, `null` and `undefined` stay assignable to everything
- strict flags — `strictFunctionTypes` missing: High, parameters lose contravariant checking
- strict flags — `strictBindCallApply` missing: Medium, `bind`, `call`, and `apply` go unchecked
- strict flags — `strictPropertyInitialization` missing: High, an uninitialized class property passes
- strict flags — `noImplicitAny` missing: High, `any` is inferred silently
- strict flags — `noImplicitThis` missing: Medium, an untyped `this` passes
- strict flags — `useUnknownInCatchVariables` missing: Medium, `catch (e)` types `e` as `any` rather than `unknown`
- strict flags — `alwaysStrict` missing: Low, "use strict" is not emitted
- safety flags — `noUncheckedIndexedAccess` not `true`: Medium, `obj[key]` returns `T` instead of `T | undefined`
- safety flags — `noFallthroughCasesInSwitch` not `true`: Medium, an accidental fall-through passes
- safety flags — `noImplicitReturns` not `true`: Medium, a code path returning no value passes
- safety flags — `noImplicitOverride` not `true`: Low, the `override` keyword is not required
- safety flags — `allowUnreachableCode` not `false`: Medium
- target and lib — `target` 2+ ES versions below the minimum runtime named in `engines` or the docs: Medium, the downleveling costs speed and native syntax for nothing
- target and lib — `lib` carrying `dom` in a Node-only project, or the reverse: Low, the wrong globals are available at compile time
- target and lib — no `target` set: Medium, an older config then defaults to ES5, which is almost never intended
- legacy decorators — `experimentalDecorators: true`, with or without `emitDecoratorMetadata`, and no dependency that needs legacy decorators: Medium, migrate to TC39 decorators and drop both flags
- project structure — several packages with independent tsconfigs and no `references` or `composite`: Low, a cross-package type change silently skips rechecking the dependents
- project structure — note: suggest project references only when the packages actually import the source of one another
- project structure — build config drift, where `tsconfig.build.json` excludes files `tsconfig.json` typechecks or the reverse: Medium, `tsc --noEmit` and the build then see different code
- module system — `module` set to none of `"nodenext"`, `"preserve"`, `"esnext"`: Medium
- module system — `moduleResolution` set to none of `"nodenext"`, `"node16"`, `"bundler"`: Medium, the legacy `"node"` and `"node10"` are what to avoid
- module system — `verbatimModuleSyntax` not `true`: Medium, it forces every type-only import to say `import type`, and emits every remaining import exactly as written
- module system — `isolatedModules` not `true`: Medium, esbuild, SWC, Babel, and the TS transpile mode all require it
- module system — `erasableSyntaxOnly` not `true` while the project runs TypeScript through Node type-stripping: Medium, an enum, namespace, or parameter property then fails at runtime
- path configuration — a path alias that does not match the bundler or runtime config: High
- path configuration — an alias pointing at a directory that does not exist: High
- deprecated flags — `suppressImplicitAnyIndexErrors` present: Medium
- deprecated flags — `suppressExcessPropertyErrors` present: Medium
- deprecated flags — `noStrictGenericChecks` present: High
- deprecated flags — `importsNotUsedAsValues` present: Low, `verbatimModuleSyntax` replaced it
- deprecated flags — `preserveValueImports` present: Low, `verbatimModuleSyntax` replaced it
- linter config — no linter configured at all: Medium, recommend adding one
- linter config — the TypeScript parser not configured in ESLint: Medium
- linter config — type-aware rules not enabled, such as `no-floating-promises`: Medium
- linter config — note: for ESLint, check that the config extends `typescript-eslint` `recommendedTypeChecked` or `strictTypeChecked` and sets `parserOptions.projectService` or `project`

non_findings:
- `skipLibCheck: true`: it is standard practice, and checking `node_modules` types is rarely useful
- a missing `exactOptionalPropertyTypes` or `noPropertyAccessFromIndexSignature` in an existing codebase: both are opt-in strictness with real migration cost
- mention those 2 flags once as Low suggestions only in a greenfield project, one with few source files and a young git history
