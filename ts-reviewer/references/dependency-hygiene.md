# Dependency Hygiene Checklist

Audits `package.json`, lockfiles, and the dependency graph. `package.json` is already
read in Phase 1 — reuse it. Run the cheap machine checks; don't guess.

## Machine Checks (run these)

```bash
npm audit --json 2>/dev/null | head -100   # or: pnpm audit / yarn npm audit / bun audit
npm outdated 2>/dev/null | head -50
```

- Known critical/high advisories in production dependencies. Severity: **High**
  (Highest if the vulnerable API is actually called in scoped files).
- Advisories in devDependencies only. Severity: **Low** — build-time exposure.
- For unused-dependency detection, recommend `knip` or `depcheck` in the report rather
  than guessing from grep — imports via configs and bins produce false positives.

## package.json Structure

- No lockfile committed (`package-lock.json`/`pnpm-lock.yaml`/`yarn.lock`/`bun.lock`).
  Severity: **High** — unreproducible installs.
- Wildcard or `latest` version ranges in dependencies. Severity: **High**.
- Runtime packages in `devDependencies` (or types/build tools in `dependencies`).
  Severity: **Medium** — breaks production installs / bloats them.
- Missing `engines.node` when the code uses version-gated APIs (`AbortSignal.timeout`,
  `structuredClone`, `using`). Severity: **Low**.
- Library packages: missing or inconsistent `exports` map vs `main`/`types`
  (deep imports unblocked, types not resolving under `nodenext`). Severity: **Medium**.

## Dependency Choice

- Duplicate-purpose dependencies (two HTTP clients, two date libs, lodash + ramda).
  Severity: **Medium** — pick one; note which is less used.
- Dependency whose installed version is deprecated on npm, or package abandoned with a
  well-known maintained successor. Severity: **Medium**. Only claim deprecation when
  `npm outdated`/`npm audit` output or the package's own warnings show it — do not
  assert abandonment from memory.
- Trivial dependency replaceable by a few lines or a built-in (left-pad class:
  `is-odd`, `mkdirp` on Node 10+, `rimraf` vs `fs.rm`). Severity: **Low**.

## Non-Findings

- Do NOT flag version ranges (`^`/`~`) with a lockfile present — that's the normal model.
- Do NOT recommend adding dependencies to fix findings from other domains unless the
  checklist item explicitly names one.
- Do NOT flag a dependency as outdated for being behind by a patch/minor version.
