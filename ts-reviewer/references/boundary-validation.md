# Boundary Validation Checklist

Runtime boundaries and data contracts: the places where untyped data from outside the
process becomes typed. Design rule — **parse, don't validate**: one place where external
data is checked and converted into a typed value, after which no re-checking anywhere.
The compiler only knows what happens inside the process; every claim about outside data
is a promise the code must earn at the boundary.

## Lying to the Compiler at Boundaries

- `as T` (or a typed variable annotation) on `JSON.parse(...)`, `await res.json()`,
  `process.env.X`, CLI args, queue/socket messages, file contents.
  Severity: **High** — the canonical unverified-boundary pattern; the type is a wish.
  Fix: validate at the boundary with a schema (Zod/Valibot/ArkType/ajv) or a hand-written
  guard, then use the *inferred* type from the schema.
- `fetch` wrapper generic `get<T>(url): Promise<T>` that casts internally — moves the
  lie into a helper every caller trusts. Severity: **High**.
- Validation library already in dependencies while boundaries still cast.
  Severity: **Medium** — the tool exists; wire it in.

## Environment and Config

- `process.env.X` read scattered through the codebase (with `!` or `as string`).
  Severity: **Medium**. Fix: validate all env vars once at startup into a typed,
  frozen config object; everything else imports the config.
- Missing-required-config discovered deep at first use instead of at startup.
  Severity: **Medium** — fail fast at boot with a clear message.

## DTO / Domain Separation

- External wire types (API response shapes, DB row types, third-party SDK types)
  imported into deep domain modules and used as the domain model. Severity: **Medium** —
  couples core logic to a contract someone else can change; renames/nullability ripple
  everywhere. Fix: map wire types to domain types at the boundary module; domain code
  never imports wire types.
- Internal entities returned directly as API responses (response shaping by leaking the
  storage/domain object). Severity: **Medium** — leaks fields added later, couples wire
  format to storage. Fix: explicit response DTO + mapping at the edge.

## Contract Visibility

- Public API boundary (exported package function, HTTP handler, message consumer) whose
  input constraints exist only as runtime checks deep inside — not visible in the
  signature or schema. Severity: **Medium**. Fix: schema/type at the boundary is the
  contract; derive both the static type and the runtime validation from it.
- Two independent definitions of the same contract (a TypeScript type AND a separate
  schema, maintained by hand in parallel). Severity: **Medium** — they will drift.
  Fix: derive the type from the schema (`z.infer`) or generate both from one source.

## Non-Findings

- Do NOT flag missing validation on data that never leaves the process (internal
  function calls, module-to-module) — that's what static types are for. Boundary
  validation at every layer is over-engineering, not safety.
- Do NOT demand a specific validation library; hand-written guards are fine when the
  shape is small. Flag the missing check, not the missing dependency.
