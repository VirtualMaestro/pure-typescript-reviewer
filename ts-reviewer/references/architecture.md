purpose:
- name the architecture smells a review flags, with the severity of each, and the shape a deepening proposal takes
- load it only while architecture review is active, under `--arch` or `--full`

scope:
- circular imports and deep relative imports are also flagged by the Code Quality domain in every scan mode, and this file adds the refactoring guidance behind them
- a wire type reaching a domain module is also a `references/boundary-validation.md` check
- state modelling, a discriminated union, and a branded type belong to `references/type-safety.md`, and this file names only the module that owns the state
- the module-scope singleton and the import-time side effect belong to `references/code-quality.md`, and the composition-root check here names where an adapter is built

glossary:
- use these terms in every architecture finding, and do not substitute "component", "service", "API", or "boundary"
- module — anything with an interface and an implementation: a function, a class, a package, a feature slice
- interface — everything a caller has to know: types, invariants, error modes, ordering, config, and not only the TypeScript `interface` keyword
- implementation — the code inside the module
- depth — `leverage` at the interface, where deep means large behaviour behind a small interface, and shallow means an interface nearly as complex as the implementation
- seam — where the interface lives, a place behaviour can be altered without editing in place, and the term to use instead of "boundary"
- adapter — a concrete thing satisfying an interface at a seam
- `leverage` — what a caller gets from depth: more capability per unit of interface it has to learn
- locality — what a maintainer gets from depth: change, bugs, and knowledge concentrated in 1 place

confidence_scale:

| Confidence | Criteria |
|---|---|
| strong | the pain repeats, the owning module is named, and the fix path is safe |
| worth-exploring | the problem is confirmed, and the interface or the migration needs its own design |
| speculative | a signal with no call, history, or test evidence behind it |

read_first:
- depth is a property of the interface and not of the implementation: a deep module can be internally complex, and what counts is how small its interface is against what it hides
- the deletion test: imagine deleting the module, and if the complexity vanishes it was a pass-through, while if it reappears across the callers it was earning its keep
- tests reach a module through its interface, the same seam its callers use, so a test that reaches past the interface into internals says the module is the wrong shape
- depth is missing as often as it is overdone, so flag a missing abstraction where it already hurts
- dependency direction matters more than layer count: the domain owns the logic, and transport and storage are injected or isolated at the edge
- 1 adapter is a hypothetical seam and 2 adapters are a real seam: do not introduce a port until at least 2 adapters are justified, production and test at the minimum
- an architecture finding rests on evidence: named files and symbols, an import or call direction, a repeated change path in `git log`, a duplicated rule, or a test no correct seam can reach
- state the observation apart from the inference drawn from it, and mark a candidate with no evidence behind it as speculative rather than reporting it as a defect
- a defect no test can reach through a correct seam is an architecture finding, and not a reason to write a test past the interface
- before proposing a module, a port, or a container, check in order: drop the need, an existing module in the repository, the standard library, a platform feature, an installed dependency
- design a hard-to-reverse proposal twice: compare 2 different interfaces on caller knowledge, seam placement, and migration cost, then recommend 1
- a cycle is unclear ownership and not a bad graph: move the type or the rule to its owner, and `import type` or a lazy import hides the direction rather than fixing it
- a path alias shortens an import path and is not an architecture boundary: ownership and a controlled export list are
- pick the simplest form a deepened module can take: a pure function for a transformation, a reducer for events over 1 state, a state machine when a command is valid only in some states, a class only when it owns long-lived state

workflow:
1. trace 1 typical scenario end to end before naming a finding: entry point, orchestration, domain rule, storage or external call, response
2. grep for feature-module imports inside the `shared`, `common`, `core`, and `utils` directories, which is the inverted direction
3. list the importers of each module, and treat a module whose every export has exactly 1 importer as a pass-through candidate for the deletion test
4. treat an interface or type re-exported unchanged through 3+ files as a pass-through chain
5. check whether the exports of a utility file imported by most modules share 1 domain concept
6. read `git log --name-only` and use it twice: a feature whose commits consistently touch 4+ directories is scattered logic, and the directories changing most often are where to start
7. name the module owning the rule and the module owning the state for each candidate, and mark the candidate speculative when neither is identifiable
8. run these checks rather than guessing from file names

checks:
- shallow modules — understanding 1 concept requires bouncing across many tiny modules: Medium
- shallow modules — a module interface nearly as complex as its implementation: Medium
- shallow modules — a pass-through wrapper, manager, helper, or service that hides no complexity: Medium, apply the deletion test
- shallow modules — pure functions extracted for testability alone while the real bugs sit in the orchestration: Medium, the extraction bought no locality
- shallow modules — a DTO type, a domain type, and a mapper between them, where this repository owns both types and their shapes and meanings are identical: Low, the mapper is a pass-through
- shallow modules — note: a mapper for a type an external contract owns is not a pass-through, whatever the shapes match, and the dependency direction check below owns that case
- coupling and seams — coupling leaking across a module interface, where callers have to know implementation details: High
- coupling and seams — retry, ordering, or compensation decided inside a pure domain computation instead of the orchestrator owning the side effects: Medium
- coupling and seams — tests that reach into module internals, or that mock many neighbours to test 1 thing: High
- coupling and seams — a public API exporting implementation details, config, ordering constraints, or internal error modes: Medium, a caller should not need them
- import and module structure — a barrel-file cycle or a circular import chain that reordering cannot resolve: High
- import and module structure — a deep relative import, `../../../`, marking a module not co-located with what it depends on: Low, suggest a path alias or co-location
- import and module structure — an import reaching into the internal files of another package instead of its declared entry point: Medium, import from the path `package.json#exports` names
- import and module structure — a barrel re-exporting a whole tree with `export *`, so the module owning a symbol is not identifiable at the import: Low, name the exports explicitly
- import and module structure — note: a barrel that also closes a cycle is the barrel-file cycle check above, at High, and it is reported once and not twice
- locality — a shared utility module mixing unrelated domain concepts: Medium
- locality — feature logic split by technical layer, a controller, service, and repo per feature, so that 1 feature change touches 4+ files: Medium
- under-engineering — 1 business rule, the same constants and branching, implemented in 2+ modules: Medium, deepen 1 module to own the rule
- under-engineering — 1 module accreting unrelated concerns, importing from many unrelated domains and exporting to disjoint caller groups: Medium, split it along the caller groups
- under-engineering — event or string-keyed indirection between 2 modules that only ever talk to each other: Low, a direct typed call is checkable
- dependency direction — a domain or computation module importing IO directly, `node:fs`, `node:http`, a DB client, or `fetch`, where the classification puts that IO behind a seam: Medium
- dependency direction — a shared or leaf module, `utils/`, `types/`, or `core/`, importing from a feature module: High, the inverted direction is how import cycles start
- dependency direction — a wire or DTO type from an external API imported deep into a domain module instead of mapped at the seam that owns the external contract: Medium
- state ownership — 2+ modules mutating 1 entity, cache, or record with no single owning module: High, the write paths cannot be tested or reasoned about apart
- state ownership — fix: a shared mutable entity, by naming 1 owning module and turning each write into a named command on it
- composition root — an infrastructure adapter, an HTTP client, a DB client, or a config read, constructed inside a domain module instead of passed in from the entry point: Medium
- composition root — a service locator or a DI container wiring 1 dependency graph: Low, pass the value or the function the module needs
- distributed side effects — a multi-step write path with no idempotency key, no ordering rule, and no compensation, where a retry leaves the effects partly applied: High
- distributed side effects — note: flag it from a named failure scenario, a retry, a timeout, or a crash between 2 steps, and not from the shape of the code

non_findings:
- a module with exactly 1 importer that hides an ordering, an invariant, or a decision: 1 importer starts the deletion test and is not a finding by itself
- a layer count: the direction of the dependencies is the finding, and a layer holding a real rule is not
- a port with 1 production adapter whose test double checks the same contract: the double is the second adapter
- formatting, import ordering, and file naming: `references/code-quality.md` owns them, and they are not architecture findings

forbidden_behaviors:
- do not invent a domain term: use a function, type, file, or package name that already exists, and prefer one used in adjacent code
- do not keep an old unit test on a shallow module a deepening merged away: delete it, and write the new test at the deepened interface
- do not assert internal state: a test asserts observable behaviour through the interface
- do not expose an internal seam through the interface because a test wants it
- do not accept a test that has to change whenever the implementation changes: it is testing past the interface
- do not touch code for a `needs-confirm` change before showing a diff or a migration plan and getting an explicit go-ahead
- do not recommend microservices, event sourcing, CQRS, hexagonal architecture, or DDD tactical patterns without a named defect, change scenario, or failure the current shape caused
- do not propose a rewrite when a staged migration reaches the same shape
- do not leave a new structure standing beside the old one: every proposal names the step deleting what it replaces
- do not propose a change contradicting a decision under `docs/adr/` silently: name the ADR and the conflict, and leave the decision to the operator
- do not report architecture candidates without naming 1 top recommendation and the reason it goes first
- do not add an import-linting dependency for 1 rule: use `package.json#exports`, the linter the project already runs, or the workspace layout

dependency_classification:

| Category | What it is | Test strategy |
|---|---|---|
| in-process | pure computation or in-memory state, no IO | merge the modules and test through the deepened interface, no adapter needed |
| local-substitutable | a DB, a filesystem, anything with a usable local stand-in such as PGLite or an in-memory filesystem | deepen using the stand-in in tests, the seam is internal and the external interface needs no port |
| remote-owned | an internal service across a network seam | define a port at the seam, a production adapter plus an in-memory adapter for tests, and inject only the transport |
| true-external | a third-party service you do not control, Stripe or Twilio | inject a port and provide a mock adapter for tests |

severity_mapping:

| Severity | Architecture criteria |
|---|---|
| Highest | an architecture issue directly causing a security vulnerability, data loss, or a production correctness bug |
| High | circular imports or cross-module coupling that blocks reliable tests or causes recurring defects |
| Medium | shallow modules, scattered domain logic, pass-through abstractions, hard-to-test orchestration |
| Low | a small interface leak, or naming drift between a module interface and what it exposes |

fixability:

| Fixability | Meaning | Fix mode behaviour |
|---|---|---|
| `auto` | a local change: import path cleanup, a narrow circular-import break, a local module merge with co-located tests | applied in the normal fix loop |
| `needs-confirm` | an interface change, a dependency inversion, a test replacement, a feature-slice reorganization | shown to the operator, not applied automatically |
| `report-only` | a broad migration, an ambiguous domain model, a change needing a product or domain decision | left as documentation, never applied |

report_format:
```md
### TITLE — Severity

- **Confidence:** strong | worth-exploring | speculative
- **Files:** relative/path/a.ts, relative/path/b.ts
- **Problem:** why this causes friction now (not just a pattern name)
- **Evidence:** the imports, callers, `git log` path, or test the finding rests on
- **Proposed deepening:** plain-English description of what would change
- **Interface shape:** rough sketch of the new interface (types, methods, key invariants)
- **Dependency category:** in-process | local-substitutable | remote-owned | true-external
- **Test strategy:** how tests would improve (what tests survive, what gets deleted, what's new)
- **Migration:** prefactor | vertical slices | expand-contract, and the step deleting the replaced code
- **Benefits:** locality gained, leverage gained, test impact
- **Trade-offs:** what gets harder, what is genuinely uncertain
- **Fixability:** auto | needs-confirm | report-only
- **Top recommendation:** on exactly 1 entry in the report, the reason this candidate goes first
```
