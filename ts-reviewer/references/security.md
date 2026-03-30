# Security Checklist

This checklist is for pure TypeScript code — no framework-specific issues.
Focus on patterns that are dangerous regardless of runtime environment (Node.js, Deno, Bun, browser).

## Injection

- **`eval()` and `new Function()`** — executing dynamic strings as code.
  Severity: **Highest**. There is almost never a valid reason for this.
  Fix: use a lookup table, strategy pattern, or a safe parser.

- **Template literals in shell commands** — `exec(\`command ${userInput}\`)`.
  Severity: **Highest**.
  Fix: use `execFile` with argument arrays, or a library that handles escaping.

- **Dynamic `import()` with user-controlled paths** — `import(userInput)`.
  Severity: **Highest**.
  Fix: whitelist allowed module paths.

- **SQL/NoSQL injection** — string concatenation in queries.
  Severity: **Highest**.
  Fix: parameterized queries / prepared statements.

- **RegExp constructed from user input** — `new RegExp(userInput)`.
  Severity: **High** (ReDoS + potential injection).
  Fix: escape input with a helper, or use a static regex.

## Prototype Pollution

- `Object.assign(target, untrustedSource)` where source may contain `__proto__` or `constructor`.
  Severity: **High**.
  Fix: use `structuredClone()`, filter keys, or use `Object.create(null)` as target.

- Recursive merge functions that don't guard against `__proto__`, `constructor`, `prototype`.
  Severity: **High**.

- `obj[dynamicKey] = value` where `dynamicKey` comes from external input.
  Severity: **High** — can set `__proto__` properties.
  Fix: validate key against a whitelist or use `Map`.

## Unsafe Deserialization

- `JSON.parse(untrustedInput)` without validation/schema check on the result.
  Severity: **High** (the parsed object can have unexpected shape).
  Fix: validate with a schema library (Zod, io-ts, ajv) immediately after parsing.

- Deserializing YAML, TOML, or other formats from untrusted sources without a safe parser.
  Severity: **High**.

## Path Traversal

- File operations using user-provided paths without normalization/validation.
  Severity: **Highest**.
  Fix: `path.resolve()` + verify the result is within the expected base directory.

- `path.join(base, userInput)` where `userInput` contains `..` — `path.join` does NOT
  prevent traversal. Severity: **Highest**.
  Fix: resolve the full path and check `resolvedPath.startsWith(baseDir)`.

## Secrets and Credentials

- Hardcoded API keys, tokens, passwords, or connection strings in source code.
  Severity: **Highest**.
  Fix: use environment variables or a secrets manager.

- Secrets logged to console (`console.log(config)` where config contains credentials).
  Severity: **High**.

- Secrets in error messages thrown or returned to callers.
  Severity: **High**.

## Cryptography

- Use of `Math.random()` for anything security-sensitive (tokens, IDs, nonces).
  Severity: **Highest**.
  Fix: use `crypto.randomUUID()`, `crypto.getRandomValues()`, or `crypto.randomBytes()`.

- Hardcoded IVs, salts, or seeds. Severity: **High**.

- Use of deprecated/weak algorithms (MD5, SHA1 for security purposes, DES).
  Severity: **High**.

## Timing Attacks

- String comparison for secrets using `===` instead of constant-time comparison.
  Severity: **High** (if comparing tokens, hashes, or API keys).
  Fix: use `crypto.timingSafeEqual()` or equivalent.

## Denial of Service

- **ReDoS** — regular expressions with nested quantifiers on overlapping character classes.
  Severity: **High**.
  Examples of dangerous patterns: `(a+)+`, `(a|a)+`, `(.*a){10}`.
  Fix: simplify regex, add input length limits, or use `re2` library.

- Unbounded data processing — reading entire files/streams into memory without size limits.
  Severity: **Medium**.

- Recursive functions without depth limits on untrusted input.
  Severity: **High**.

## Information Disclosure

- Error messages that expose internal paths, stack traces, or system info to end users.
  Severity: **Medium**.

- `console.log` / `console.debug` left in production code with sensitive data.
  Severity: **Medium**.

- TypeScript source maps shipped to production (if applicable).
  Severity: **Low**.

## Race Conditions (security-relevant)

- TOCTOU (Time-of-check-to-time-of-use) in file operations:
  checking if a file exists, then reading it without atomicity.
  Severity: **High** in security-sensitive contexts.

- Authentication/authorization checks separated from the action they protect
  by an `await` boundary. Severity: **High**.
