purpose:
- name the boundary-validation patterns a review flags, with the severity of each
- load it before the Boundary Validation analysis pass

read_first:
- a runtime boundary is where untyped data from outside the process becomes typed data
- the design rule is parse, do not validate: 1 place checks external data and converts it into a typed value, and nothing re-checks it afterwards
- the compiler knows only what happens inside the process, so every claim about outside data is a promise the code earns at the boundary

checks:
- lying to the compiler — `as T` or a typed annotation on `JSON.parse(...)`, `await res.json()`, `process.env.X`, a CLI argument, a queue or socket message, or file contents: High
- lying to the compiler — note: the unverified boundary is the canonical case: the type is a claim nothing checks
- lying to the compiler — fix: an unverified boundary, by validating it with a schema or a hand-written guard, then using the type the schema infers
- lying to the compiler — a fetch wrapper generic, `get<T>(url): Promise<T>`, that casts internally: High, it moves the lie into a helper every caller trusts
- lying to the compiler — a validation library already in the dependencies while the boundaries still cast: Medium, the tool is there, wire it in
- environment and config — `process.env.X` read across the codebase with `!` or `as string`: Medium, validate every variable once at startup into a typed frozen config every module imports
- environment and config — a missing required setting discovered deep at first use: Medium, fail at boot with a message naming it
- dto and domain separation — an external wire type, an API response shape, a DB row, or a third-party SDK type used as the domain model in a deep module: Medium
- dto and domain separation — note: a wire type in the domain couples core logic to a contract someone else owns, so a rename or a nullability change ripples everywhere
- dto and domain separation — fix: a wire type in the domain, by mapping it to a domain type in the boundary module, and let no domain module import a wire type
- dto and domain separation — an internal entity returned directly as an API response: Medium, it leaks fields added later and couples the wire format to storage, so map to an explicit response DTO at the edge
- contract visibility — a public boundary, an exported package function, an HTTP handler, or a message consumer, whose input constraints live only as runtime checks deep inside: Medium
- contract visibility — fix: a hidden contract, by putting the schema or type at the boundary, and deriving both the static type and the runtime validation from it
- contract visibility — 2 independent definitions of 1 contract, a TypeScript type and a separate schema maintained by hand: Medium, they drift
- contract visibility — fix: a duplicate contract, by deriving the type from the schema with `z.infer`, or by generating both from 1 source

non_findings:
- missing validation on data that never leaves the process, an internal call or a module-to-module call: static types cover it, and validating at every layer is over-engineering
- the absence of a specific validation library: a hand-written guard is fine for a small shape, so flag the missing check and not the missing dependency
