purpose:
- name the security patterns a review flags, with the severity of each
- load it before the Security analysis pass

scope:
- the patterns that stay dangerous under Node 24
- a framework-specific issue is out of scope: the review covers pure TypeScript

read_first:
- every check below assumes the dangerous value is attacker-influenced, so trace where the value comes from before flagging it
- untrusted source: a request body, header, or URL, a CLI argument, an environment variable in a multi-tenant context
- untrusted source: file contents from a user-writable path, a database field ever written from user input, a queue or socket message, a third-party API response
- trusted source: a literal, a constant or config file of this codebase, a value a schema already validated at the boundary, and name where it was validated
- a value that is provably static or internal downgrades the finding to Medium with the reason it still matters, or drops it when the sink is safe by construction
- taint survives transformation: concatenation, template literals, `JSON.parse`, and property access on a parsed object all preserve it
- report at the listed severity when the source cannot be traced in the available files, and state the assumption: "assumes `x` can carry external input"

checks:
- injection — `eval()` and `new Function()` executing a dynamic string: Highest, use a lookup table, a strategy, or a safe parser
- injection — a template literal inside a shell command, `exec(\`cmd ${userInput}\`)`: Highest, use `execFile` with an argument array
- injection — a dynamic `import()` with a user-controlled path: Highest, allow only a fixed list of module paths
- injection — SQL or NoSQL built by string concatenation: Highest, use parameterized queries
- injection — `new RegExp(userInput)`: High, it carries both ReDoS and injection, escape the input or use a static pattern
- ssrf — `fetch()`, `http.request()`, or any HTTP client called with a URL built from external input and no protocol and host allowlist: High
- ssrf — fix: an unallowlisted outbound URL, by parsing it with `new URL()`, checking the protocol is http or https, checking the host against an explicit allowlist, and rejecting redirects into internal ranges
- dom sinks — `element.innerHTML = x`, `insertAdjacentHTML`, or `document.write` where `x` has any non-literal part: High, use `textContent`, or a sanitizer only when HTML is genuinely required
- dom sinks — `location.href = x` or `window.open(x)` from external input: Medium, a `javascript:` URL runs, so validate the protocol with `new URL()`
- dom sinks — note: the 2 checks above apply only in a file whose `lib` carries `dom`
- prototype pollution — `Object.assign(target, untrustedSource)` where the source can carry `__proto__`: High, filter the keys or build the target with `Object.create(null)`
- prototype pollution — note: `structuredClone()` is not a fix here: it copies an own `__proto__` key through, and the `Object.assign` that follows still walks the setter
- prototype pollution — a recursive merge with no guard on `__proto__`, `constructor`, and `prototype`: High
- prototype pollution — `obj[dynamicKey] = value` with an externally supplied key: High, validate the key or use a `Map`
- unsafe deserialization — `JSON.parse(untrusted)` with no schema validation: Medium, validate after parsing
- unsafe deserialization — note: `JSON.parse` executes no code, so the risk is malformed data bypassing business logic, not injection
- unsafe deserialization — YAML or TOML from an untrusted source with no safe parser: High
- path traversal — a file operation on a user-supplied path with no normalization: Highest, use `path.resolve()` and verify the result is inside the base directory
- path traversal — `path.join(base, userInput)`: Highest, it does not stop `..`, so resolve the full path and check containment
- path traversal — a containment check written as `resolved.startsWith(base)`: High, `/base-evil/x` passes it for `/base`, so test `path.relative(base, resolved)` instead and reject a result that is absolute or starts with `..`
- secrets — a hardcoded API key, token, or password in source: Highest
- secrets — a secret written to the console: High
- secrets — a secret carried in an error message: High
- cryptography — `Math.random()` for a security-sensitive value: Highest, use `crypto.randomUUID()` or `crypto.getRandomValues()`
- cryptography — a hardcoded IV, salt, or seed: High
- cryptography — a deprecated algorithm, MD5 or SHA1 for security, or DES: High
- timing attacks — `===` comparing 2 secrets, tokens, MACs, or password hashes under verification: High, use `crypto.timingSafeEqual()`
- unsafe memory — `Buffer.allocUnsafe()` where the buffer is not immediately and fully overwritten: High, it leaks previous memory contents, use `Buffer.alloc()`
- denial of service — ReDoS from nested quantifiers, `(a+)+` or `(a|a)+`: High
- denial of service — data processed with no size limit: Medium
- denial of service — a recursive function with no depth limit on untrusted input: High
- information disclosure — an error message exposing internals to an end user: Medium
- information disclosure — `console.log` or `console.debug` carrying sensitive data in production: Medium
- race conditions — a time-of-check to time-of-use gap in a file operation: High
- race conditions — an auth check separated from the action it protects by an `await`: High

non_findings:
- an ordinary string comparison that merely involves a variable named "token": only a comparison whose result reveals secret equality to an attacker is a finding
