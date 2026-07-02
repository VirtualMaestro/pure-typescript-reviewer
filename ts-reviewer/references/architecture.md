# Architecture Review Checklist

Loaded only when architecture review is active (`--arch` or `--full` flag).

## Glossary

Use these terms in all architecture findings. Don't substitute "component", "service", "API", "boundary".

- **Module** — anything with an interface and an implementation: function, class, package, feature slice.
- **Interface** — everything a caller must know: types, invariants, error modes, ordering, config. Not just the TypeScript `interface` keyword.
- **Implementation** — the code inside the module.
- **Depth** — leverage at the interface. Deep = large behaviour behind small interface. Shallow = interface nearly as complex as implementation.
- **Seam** — where the interface lives; a place behaviour can be altered without editing in place. Prefer over "boundary".
- **Adapter** — a concrete thing satisfying an interface at a seam.
- **Leverage** — what callers get from depth: more capability per unit of interface they must learn.
- **Locality** — what maintainers get from depth: change, bugs, and knowledge concentrated in one place.

## Principles

- **Depth is a property of the interface, not the implementation.** A deep module can be internally complex — what matters is how small its interface is relative to what it hides.
- **Deletion test.** Imagine deleting the module. If complexity vanishes → it was a pass-through. If complexity reappears across callers → it was earning its keep.
- **The interface is the test surface.** Callers and tests cross the same seam. If tests must reach past the interface into internals, the module is the wrong shape.
- **One adapter = hypothetical seam. Two adapters = real seam.** Don't introduce a port unless at least two adapters are justified (production + test at minimum). Single-adapter seams are just indirection.

## Smell Checklist

### Shallow Modules

- Understanding one concept requires bouncing across many tiny modules. Severity: **Medium**.
- Module interface is nearly as complex as its implementation (shallow). Severity: **Medium**.
- Pass-through wrapper / manager / helper / service that adds no hidden complexity. Severity: **Medium**. Apply deletion test.
- Pure functions extracted only for testability, but real bugs hide in orchestration — no locality. Severity: **Medium**.

### Coupling and Boundaries

- Tight coupling leaks across module interfaces (callers must know implementation details). Severity: **High**.
- Tests must reach into module internals or mock too many neighbors to test one thing. Severity: **High**.
- Public API exports implementation details, config, ordering constraints, or internal error modes that callers should not need to know. Severity: **Medium**.

### Import and Module Structure

*Note: circular imports and deep relative imports are also flagged by the Code Quality domain in all scan modes. Architecture domain provides deeper refactoring guidance when Code Quality flags them.*

- Barrel-file cycles or circular import chains that can't be resolved by reordering. Severity: **High**.
- Deep relative imports (`../../../`) indicating modules not co-located with what they depend on. Severity: **Low**. Suggest path aliases or co-location.

### Locality

- Shared utility module mixes unrelated domain concepts (a grab-bag util). Severity: **Medium**.
- Feature logic split by technical layer (e.g. controller / service / repo per feature) in a way that destroys locality — change to one feature requires touching 4+ files. Severity: **Medium**.

### Under-Engineering

Depth cuts both ways — flag missing abstraction where it already hurts:

- Identical business rule (same constants/branching) implemented in 2+ modules.
  Severity: **Medium**. Under-abstraction; deepen one module to own the rule.
- One module accreting unrelated concerns (imports from many unrelated domains, exports
  serving disjoint caller groups). Severity: **Medium**. Split along caller groups.
- Event/string-keyed indirection between two modules that only ever talk to each other —
  a direct typed call would be simpler and checkable. Severity: **Low**.

## Dependency Direction and Layering

Direction matters more than layer count. Detect and flag:

- Domain/computation modules importing IO directly (`node:fs`, `node:http`, DB clients,
  `fetch`) when the dependency classification says the IO belongs behind a seam.
  Severity: **Medium**. The domain owns logic; transport/storage is injected or
  isolated at the edge.
- Shared/leaf modules (`utils/`, `types/`, `core/`) importing from feature modules —
  inverted direction; the "shared" code now depends on a specific feature.
  Severity: **High** — this is how import cycles start.
- Wire/DTO types from an external API imported deep into domain modules rather than
  mapped to domain types at the boundary. Severity: **Medium**.
  Cross-reference: `references/boundary-validation.md`.

## Detection Heuristics

Run these — don't guess from file names:

- Grep feature-module imports inside `shared|common|core|utils` directories
  (inverted dependency direction).
- For each module, list its importers. A module whose every export has exactly one
  importer is a pass-through candidate — apply the deletion test.
- An interface/type re-exported through 3+ files unchanged marks a pass-through chain.
- A utility file imported by the majority of modules is a grab-bag candidate — check
  whether its exports share a domain concept.
- Change-set locality: in `git log --name-only`, do commits touching one feature
  consistently touch 4+ directories? That feature's logic is scattered.

## Dependency Classification

When proposing a deepening fix, classify the dependency to determine test strategy:

**1. In-process** — pure computation or in-memory state, no I/O.
- Strategy: merge modules, test through the deepened interface directly. No adapter needed.

**2. Local-substitutable** — DB, filesystem, etc. with usable local stand-ins (PGLite, in-memory filesystem).
- Strategy: deepen using the stand-in in tests. The seam is internal; no port at the external interface.

**3. Remote but owned** — internal services across a network boundary.
- Strategy: define a port (TypeScript interface) at the seam. Production adapter + in-memory adapter for tests.
- The deep module owns the logic; only the transport is injected.

**4. True external** — third-party services (Stripe, Twilio, etc.) you don't control.
- Strategy: inject a port; provide a mock adapter for tests.

**Rule:** don't introduce a port unless at least two adapters are justified. A single-adapter seam is indirection without benefit.

## Candidate Report Format

Each architecture finding uses this format in the `## Architecture Opportunities` section:

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

## Severity Mapping for Architecture

| Level | Architecture criteria |
|---|---|
| **Highest** | Architecture issue directly causing a security vulnerability, data loss, or production correctness bug |
| **High** | Circular imports or cross-module coupling that blocks reliable tests or causes recurring defects |
| **Medium** | Shallow modules, scattered domain logic, pass-through abstractions, hard-to-test orchestration |
| **Low** | Small interface leaks, minor naming drift between module interface and what it exposes |

## Fixability Mapping

| Fixability | Meaning | Fix mode behavior |
|---|---|---|
| `auto` | Local change: import path cleanup, narrow circular-import break, local module merge with co-located tests | Applied in normal fix loop |
| `needs-confirm` | Interface change, dependency inversion, test replacement, feature-slice reorganization | Shown to user, NOT applied automatically |
| `report-only` | Broad migration, ambiguous domain model, change requiring product/domain decision | Never applied, left as documentation |

## Naming Guidance

Use names that already exist in the codebase (function names, type names, file names, package names). Don't invent domain terms. If a deepened module needs a name, prefer a name already used in adjacent code.

## Architecture Fix Rules

When applying `auto` fixability architecture findings:

- Write new tests at the deepened module's interface. Old unit tests on shallow modules that are now merged become redundant — delete them.
- Tests assert observable behavior through the interface, not internal state.
- Don't expose internal seams through the interface just because tests need them.
- Tests that have to change when the implementation changes are testing past the interface.
- For large architecture changes classified `needs-confirm`, show a diff/migration plan and wait for explicit go-ahead before touching code.
