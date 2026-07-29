purpose:
- name the architecture smells a review flags, with the severity of each, and the shape a deepening proposal takes
- load it only while architecture review is active, under `--arch` or `--full`

scope:
- circular imports and deep relative imports are also flagged by the Code Quality domain in every scan mode, and this file adds the refactoring guidance behind them
- a wire type reaching a domain module is also a `references/boundary-validation.md` check

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

read_first:
- depth is a property of the interface and not of the implementation: a deep module can be internally complex, and what counts is how small its interface is against what it hides
- the deletion test: imagine deleting the module, and if the complexity vanishes it was a pass-through, while if it reappears across the callers it was earning its keep
- tests reach a module through its interface, the same seam its callers use, so a test that reaches past the interface into internals says the module is the wrong shape
- depth is missing as often as it is overdone, so flag a missing abstraction where it already hurts
- dependency direction matters more than layer count: the domain owns the logic, and transport and storage are injected or isolated at the edge
- 1 adapter is a hypothetical seam and 2 adapters are a real seam: do not introduce a port until at least 2 adapters are justified, production and test at the minimum

workflow:
1. grep for feature-module imports inside the `shared`, `common`, `core`, and `utils` directories, which is the inverted direction
2. list the importers of each module, and treat a module whose every export has exactly 1 importer as a pass-through candidate for the deletion test
3. treat an interface or type re-exported unchanged through 3+ files as a pass-through chain
4. check whether the exports of a utility file imported by most modules share 1 domain concept
5. read `git log --name-only` and treat a feature whose commits consistently touch 4+ directories as scattered logic
6. run these checks rather than guessing from file names

checks:
- shallow modules — understanding 1 concept requires bouncing across many tiny modules: Medium
- shallow modules — a module interface nearly as complex as its implementation: Medium
- shallow modules — a pass-through wrapper, manager, helper, or service that hides no complexity: Medium, apply the deletion test
- shallow modules — pure functions extracted for testability alone while the real bugs sit in the orchestration: Medium, the extraction bought no locality
- coupling and seams — coupling leaking across a module interface, where callers have to know implementation details: High
- coupling and seams — tests that reach into module internals, or that mock many neighbours to test 1 thing: High
- coupling and seams — a public API exporting implementation details, config, ordering constraints, or internal error modes: Medium, a caller should not need them
- import and module structure — a barrel-file cycle or a circular import chain that reordering cannot resolve: High
- import and module structure — a deep relative import, `../../../`, marking a module not co-located with what it depends on: Low, suggest a path alias or co-location
- locality — a shared utility module mixing unrelated domain concepts: Medium
- locality — feature logic split by technical layer, a controller, service, and repo per feature, so that 1 feature change touches 4+ files: Medium
- under-engineering — 1 business rule, the same constants and branching, implemented in 2+ modules: Medium, deepen 1 module to own the rule
- under-engineering — 1 module accreting unrelated concerns, importing from many unrelated domains and exporting to disjoint caller groups: Medium, split it along the caller groups
- under-engineering — event or string-keyed indirection between 2 modules that only ever talk to each other: Low, a direct typed call is checkable
- dependency direction — a domain or computation module importing IO directly, `node:fs`, `node:http`, a DB client, or `fetch`, where the classification puts that IO behind a seam: Medium
- dependency direction — a shared or leaf module, `utils/`, `types/`, or `core/`, importing from a feature module: High, the inverted direction is how import cycles start
- dependency direction — a wire or DTO type from an external API imported deep into a domain module instead of mapped at the seam that owns the external contract: Medium

forbidden_behaviors:
- do not invent a domain term: use a function, type, file, or package name that already exists, and prefer one used in adjacent code
- do not keep an old unit test on a shallow module a deepening merged away: delete it, and write the new test at the deepened interface
- do not assert internal state: a test asserts observable behaviour through the interface
- do not expose an internal seam through the interface because a test wants it
- do not accept a test that has to change whenever the implementation changes: it is testing past the interface
- do not touch code for a `needs-confirm` change before showing a diff or a migration plan and getting an explicit go-ahead

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

- **Files:** relative/path/a.ts, relative/path/b.ts
- **Problem:** why this causes friction now (not just a pattern name)
- **Proposed deepening:** plain-English description of what would change
- **Interface shape:** rough sketch of the new interface (types, methods, key invariants)
- **Dependency category:** in-process | local-substitutable | remote-owned | true-external
- **Test strategy:** how tests would improve (what tests survive, what gets deleted, what's new)
- **Benefits:** locality gained, leverage gained, test impact
- **Trade-offs:** what gets harder, what is genuinely uncertain
- **Fixability:** auto | needs-confirm | report-only
```
