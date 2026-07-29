purpose:
- name the dependency patterns a review flags in `package.json`, the lockfiles, and the dependency graph, with the severity of each
- load it before the Dependency Hygiene analysis pass

scope:
- `package.json` is already read during discovery: reuse it rather than reading it again
- the `typescript`, `@types/node`, and `engines.node` values belong to `references/tsconfig.md`

workflow:
1. run `npm audit --json 2>/dev/null | head -100`, or the `pnpm`, `yarn`, or `bun` equivalent, picked from the lockfile present
2. run `npm outdated 2>/dev/null | head -50`
3. read the advisories and the version drift from that output, and do not guess
4. recommend `knip` or `depcheck` in the report for unused-dependency detection, and do not run a grep of your own: an import through a config or a bin makes that guess a false positive

checks:
- advisories — a known critical or high advisory in a production dependency: High, Highest once the vulnerable API is actually called in a scoped file
- advisories — an advisory in `devDependencies` alone: Low, the exposure is build-time
- package.json structure — no committed lockfile, neither `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `bun.lock`, nor `bun.lockb`: High, installs are not reproducible
- package.json structure — a wildcard or `latest` version range in the dependencies: High
- package.json structure — a runtime package in `devDependencies`, or a types or build tool in `dependencies`: Medium, it breaks or bloats a production install
- package.json structure — a dependency whose `engines.node` excludes 24: High, the install is unsupported on the stack runtime
- package.json structure — a library package whose `exports` map is missing or disagrees with `main` and `types`: Medium, deep imports stay open and the types fail to resolve under `nodenext`
- dependency choice — 2 dependencies serving 1 purpose, 2 HTTP clients, 2 date libraries, or lodash beside ramda: Medium, pick 1 and name which is used less
- dependency choice — an installed version marked deprecated on npm, or a package abandoned with a maintained successor: Medium
- dependency choice — note: claim a deprecation only from `npm outdated` output, `npm audit` output, or the warnings of the package itself, and do not assert abandonment from memory
- dependency choice — a trivial dependency a few lines or a builtin replaces, `is-odd`, `mkdirp` against `fs.mkdir` with `recursive`, or `rimraf` against `fs.rm`: Low

non_findings:
- a `^` or `~` version range with a lockfile present: that is the normal model
- adding a dependency to fix a finding from another domain, unless that checklist item names one
- a dependency behind by a patch or a minor version
