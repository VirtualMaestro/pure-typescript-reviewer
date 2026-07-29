purpose:
- name the code-quality patterns a review flags, with the severity of each
- load it before the Code Quality analysis pass

scope:
- lightweight over-engineering checks that stay active in a default scan
- every error-handling check belongs to `references/error-handling.md`
- the full depth framework, the deletion test, seams, and module deepening, belongs to `references/architecture.md`, which loads only under `--arch` or `--full`

checks:
- complexity — function length > 50 lines: Medium
- complexity — cyclomatic complexity > 10: Medium
- complexity — nested callbacks or promises deeper than 3 levels: Medium
- complexity — a god class, methods >= 10 or class length >= 500 lines: Medium
- complexity — parameters >= 5 on 1 function: Low, use an options object
- dead code — code after a `return`, `throw`, or `break`: Low
- dead code — a commented-out block longer than 3 lines: Low, delete it, the history is in version control
- dead code — an unused private class member: Low
- dead code — an exported symbol nothing imports: Medium
- dead code — an empty file or an import-only file: Low
- dead code — a function defined and never called: Medium
- naming — a misleading name, such as `isReady` holding a string: Medium
- naming — a single-letter variable outside a trivial loop: Low
- naming — mixed conventions, camelCase against snake_case: Low
- naming — a boolean with no `is`, `has`, `should`, or `can` prefix: Low, report it once per codebase as a Recurring Pattern
- naming — an opaque abbreviation, `usr`, `msg`, `cfg`: Low
- debug artifacts — a `debugger;` statement in committed code: High, it stops execution under devtools
- debug artifacts — a leftover `console.log` or `console.debug` from a debugging session, dumping locals or printing "here": Low, Medium in library code
- debug artifacts — a committed `.only` or `.skip` in a test file: High, `.only` silently disables the rest of the suite
- import-time side effects — top-level code doing IO, registration, or global mutation in a module that also exports pure logic: Medium, it makes the module untestable and load-order dependent
- import-time side effects — fix: top-level work, by moving it behind an explicit `init()` or into the entry point
- import-time side effects — a singleton constructed at module scope and imported everywhere: Medium, the shared state is hidden and nothing can substitute it in a test
- testability — `Date.now()`, `new Date()`, or `Math.random()` inline in business logic: Medium, inject a clock or a random source, or take the value as a parameter with a default
- testability — logic reachable only through a static call chain nothing can substitute in a test: Low, Medium once tests work around it with module-mocking
- speculative abstraction — an interface with exactly 1 implementation and no test double using it: Low
- speculative abstraction — a factory or builder for a class constructed in exactly 1 place: Low
- speculative abstraction — a config option or parameter whose value is identical at every call site: Low
- duplication — a repeated block of 3+ lines in 2+ places: Medium
- duplication — copy-pasted logic with minor variations: Medium
- mutability — `let` where `const` works: Low
- mutability — a function mutating its input parameter: Medium
- mutability — a class field that wants `readonly`: Low
- mutability — exported mutable state, `export let count = 0`: High
- collections and iteration — `for (let i = 0; ...)` where `for...of` with `.entries()` or `.map()` states the intent: Low
- collections and iteration — an array lookup in a hot path: Medium, use a `Set` or a `Map`
- collections and iteration — `indexOf(x) !== -1`: Low, use `includes(x)`
- hacky patterns — a magic number with no named constant: Low
- hacky patterns — `setTimeout(..., 100)` used as a synchronization mechanism: High, it is a race condition
- hacky patterns — a try block wrapping an entire function body: Medium
- hacky patterns — a TODO, FIXME, or HACK comment: Low each, and report the total count
- hacky patterns — boolean parameters at the call site, `doSomething(true, false, true)`: Low
- hacky patterns — platform checks scattered instead of centralized: Low
- module structure — a circular import, including a cycle through a barrel file: High
- module structure — a deep relative import, `../../../`: Low, use a path alias
- comments — JSDoc repeating the type information: Low
- comments — a comment describing what the code does instead of why: Low
- comments — a comment that no longer matches the code: Medium

non_findings:
- a symbol re-exported from a package entry point or the `exports` map: it is the public API of a library, not dead code
- intentional logging and CLI output
- an index-based loop where the index is genuinely needed for non-sequential access
- a barrel file that causes no cycle
