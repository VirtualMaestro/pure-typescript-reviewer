purpose:
- name the `tsconfig.json` and linter-config settings a review flags, with the severity of each
- load it before the Config analysis pass

scope:
- this file owns every version and flag value the `target_stack` of `ts-reviewer/SKILL.md` pins

checks:
- stack — `target` not `"ES2024"`: High
- stack — `lib` not `["ES2024"]` in a Node project: High
- stack — `module` or `moduleResolution` not `"nodenext"`: High
- stack — `"type": "module"` missing from `package.json`: High
- stack — `verbatimModuleSyntax`, `erasableSyntaxOnly`, or `isolatedModules` not `true`: High
- stack — `allowImportingTsExtensions` or `noEmit` set in the build config: High, `tsc` emits the JavaScript Node runs
- stack — a `typescript` range admitting a version outside `5.9.x`, `^5.9.0` among them: High, pin the minor with `~5.9.0`
- stack — an `engines.node` range admitting a major other than 24, `>=24` among them: High, pin the major with `^24.0.0`
- stack — a `@types/node` range admitting a major other than 24: High
- stack — note: read the range, not the string: any range resolving to exactly the pinned major or minor passes
- stack — note: TypeScript 5.9 offers no `node24` module value, and the pinned `5.9.x` freezes what `nodenext` means, so `nodenext` is the stable choice here
- strict flags — `strict` not `true`: Highest, every strict check is then off
- strict flags — any strict sub-flag explicitly `false` under `"strict": true`: Highest, name the flag and the check it removes
- safety flags — `noUncheckedIndexedAccess` not `true`: Medium, `obj[key]` returns `T` instead of `T | undefined`
- safety flags — `noFallthroughCasesInSwitch` not `true`: Medium, an accidental fall-through passes
- safety flags — `noImplicitReturns` not `true`: Medium, a code path returning no value passes
- safety flags — `noImplicitOverride` not `true`: Low, the `override` keyword is not required
- safety flags — `allowUnreachableCode` not `false`: Medium
- legacy decorators — `experimentalDecorators: true`, with or without `emitDecoratorMetadata`: High, use TC39 decorators and drop both flags
- project structure — several packages with independent tsconfigs and no `references` or `composite`: Low, a cross-package type change silently skips rechecking the dependents
- project structure — note: suggest project references only when the packages actually import the source of one another
- project structure — build config drift, where `tsconfig.build.json` excludes files `tsconfig.json` typechecks or the reverse: Medium, `tsc --noEmit` and the build then see different code
- path configuration — a path alias that does not match the bundler or runtime config: High
- path configuration — an alias pointing at a directory that does not exist: High
- removed flags — any of `suppressImplicitAnyIndexErrors`, `suppressExcessPropertyErrors`, `noStrictGenericChecks`, `importsNotUsedAsValues`, `preserveValueImports`, `keyofStringsOnly`, `charset`, `out` present: High, the stack compiler rejects them
- linter config — no linter configured at all: Medium, recommend adding one
- linter config — the TypeScript parser not configured in ESLint: Medium
- linter config — type-aware rules not enabled, such as `no-floating-promises`: Medium
- linter config — note: for ESLint, check that the config extends `typescript-eslint` `recommendedTypeChecked` or `strictTypeChecked` and sets `parserOptions.projectService` or `project`

non_findings:
- `skipLibCheck: true`: it is standard practice, and checking `node_modules` types is rarely useful
- a missing `exactOptionalPropertyTypes` or `noPropertyAccessFromIndexSignature` in an existing codebase: both are opt-in strictness with real migration cost
- mention those 2 flags once as Low suggestions only in a greenfield project, one with few source files and a young git history
