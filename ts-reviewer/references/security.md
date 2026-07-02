# Security Checklist

For pure TypeScript code — no framework-specific issues.
Focus on patterns dangerous regardless of runtime (Node.js, Deno, Bun, browser).

## Trust Boundaries — read first

Every item below assumes the dangerous value is *attacker-influenced*. Before flagging,
trace where the value comes from:

**Untrusted sources:** network request bodies/headers/URLs, CLI arguments, environment
variables in multi-tenant contexts, file contents from user-writable paths, database
fields that were ever written from user input, messages from queues/sockets, anything
returned by a third-party API.

**Trusted sources:** literals, values from this codebase's own constants/config files,
values already validated by a schema at the boundary (note where).

Rules:
- Value provably static/internal -> downgrade the finding to **Medium** and say why it
  still matters (fragile pattern), or drop it if the sink is safe by construction.
- Taint survives transformations: concatenation, template literals, `JSON.parse`,
  property access on a parsed object all preserve untrustedness.
- If you cannot trace the source within the files available, report at the listed
  severity but state the assumption: "assumes `x` can carry external input".

## Injection

- **`eval()` and `new Function()`** — executing dynamic strings.
  Severity: **Highest**. Fix: lookup table, strategy pattern, safe parser.
- **Template literals in shell commands** — `exec(\`cmd ${userInput}\`)`.
  Severity: **Highest**. Fix: `execFile` with argument arrays.
- **Dynamic `import()` with user-controlled paths**.
  Severity: **Highest**. Fix: whitelist allowed module paths.
- **SQL/NoSQL injection** — string concatenation in queries.
  Severity: **Highest**. Fix: parameterized queries.
- **RegExp from user input** — `new RegExp(userInput)`.
  Severity: **High** (ReDoS + injection). Fix: escape input or use static regex.

## SSRF

- `fetch()` / `http.request()` / HTTP client call with a URL built from external input,
  without a protocol + host allowlist. Severity: **High**. Fix: parse with `new URL()`,
  check protocol is http(s) and host against an explicit allowlist; reject redirects to
  internal ranges.

## DOM Sinks (browser code)

- `element.innerHTML = x`, `insertAdjacentHTML`, `document.write` where `x` has any
  non-literal part. Severity: **High**. Fix: `textContent` for text; a sanitizer
  (DOMPurify) only when HTML is genuinely required.
- `location.href = x` / `window.open(x)` from external input — `javascript:` URL risk.
  Severity: **Medium**. Fix: validate protocol via `new URL()`.

## Prototype Pollution

- `Object.assign(target, untrustedSource)` where source may contain `__proto__`.
  Severity: **High**. Fix: `structuredClone()`, filter keys, or `Object.create(null)`.
- Recursive merge without guarding `__proto__`, `constructor`, `prototype`.
  Severity: **High**.
- `obj[dynamicKey] = value` with external input key.
  Severity: **High**. Fix: validate key or use `Map`.

## Unsafe Deserialization

- `JSON.parse(untrusted)` without schema validation.
  Severity: **Medium**. Fix: validate with Zod/io-ts/ajv after parsing.
  Note: `JSON.parse` itself does not execute arbitrary code — the risk is accepting
  malformed data that bypasses business logic, not injection.
- YAML/TOML from untrusted sources without safe parser. Severity: **High**.

## Path Traversal

- File operations with user paths without normalization.
  Severity: **Highest**. Fix: `path.resolve()` + verify within base dir.
- `path.join(base, userInput)` — does NOT prevent `..` traversal.
  Severity: **Highest**. Fix: resolve full path, check `startsWith(baseDir)`.

## Secrets and Credentials

- Hardcoded API keys, tokens, passwords in source. Severity: **Highest**.
- Secrets logged to console. Severity: **High**.
- Secrets in error messages. Severity: **High**.

## Cryptography

- `Math.random()` for security-sensitive values. Severity: **Highest**.
  Fix: `crypto.randomUUID()`, `crypto.getRandomValues()`.
- Hardcoded IVs, salts, seeds. Severity: **High**.
- Deprecated algorithms (MD5, SHA1 for security, DES). Severity: **High**.

## Timing Attacks

- String comparison using `===` where both sides are secrets/tokens/MACs/password hashes
  being verified. Severity: **High**. Fix: `crypto.timingSafeEqual()`.
  Do NOT flag ordinary string comparisons that merely involve variables named "token" —
  only comparisons whose result reveals secret equality to an attacker.

## Unsafe Memory

- `Buffer.allocUnsafe()` where the buffer is not immediately and fully overwritten —
  leaks previous memory contents. Severity: **High**. Fix: `Buffer.alloc()`.

## Denial of Service

- **ReDoS** — nested quantifiers: `(a+)+`, `(a|a)+`. Severity: **High**.
- Unbounded data processing without size limits. Severity: **Medium**.
- Recursive functions without depth limits on untrusted input. Severity: **High**.

## Information Disclosure

- Error messages exposing internals to end users. Severity: **Medium**.
- `console.log`/`console.debug` with sensitive data in production. Severity: **Medium**.

## Race Conditions (security-relevant)

- TOCTOU in file operations. Severity: **High**.
- Auth checks separated from protected action by `await`. Severity: **High**.
