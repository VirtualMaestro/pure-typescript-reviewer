# Pure TypeScript Reviewer

A Claude Code skill for deep code review and auto-fix of pure TypeScript codebases. Finds bugs, type safety holes, security vulnerabilities, async anti-patterns, outdated practices, and code smells — then fixes them with regression tests and verification.

Built for **TypeScript 5.9+** without any framework-specific checks (no React, Vue, Angular, etc.).

## What It Does

Three modes, one skill:

| Mode | What happens |
|---|---|
| **scan** | Analyzes the codebase and writes a prioritized report to `code-smells.md` |
| **fix** | Reads the report and applies fixes file-by-file with tsc/lint/test verification |
| **auto** | Runs scan, asks you to confirm, fixes everything, deletes the report if clean |

The review covers six domains, each with its own detailed checklist:

| Domain | Examples |
|---|---|
| **Type Safety** | `any` abuse, unsafe casts, non-null assertions, missing exhaustive checks |
| **Security** | Injection, prototype pollution, ReDoS, path traversal, hardcoded secrets |
| **Async Patterns** | Floating promises, race conditions, missing error propagation, `forEach(async...)` |
| **Modernization** | `enum` → `as const`, missing `satisfies`, `using` keyword, `import type` |
| **Code Quality** | Dead code, complexity, duplication, hacky patterns, error handling |
| **Config** | tsconfig.json strict flags, module resolution, deprecated options |

## Installation

### Claude Code (recommended)

Copy the `ts-reviewer/` folder into your project's skill directory:

```bash
# From the repo root
cp -r ts-reviewer /path/to/your/project/.claude/skills/
```

Or install it globally so it's available in all your projects:

```bash
cp -r ts-reviewer ~/.claude/skills/
```

### Other Claude interfaces

The skill works in Claude.ai and other Claude interfaces too — sub-agents won't be available, so analysis runs sequentially instead of in parallel, but everything else works the same. Copy the skill folder and reference it in your prompt or project instructions.

## Usage

### Scan — find issues

Just ask Claude to review your code:

```
Review my TypeScript code
```
```
Find issues in this project
```
```
Audit the codebase for security and type safety problems
```

Claude will analyze the project and write a report to `code-smells.md` in the project root (or `.claude/code-smells.md` if that directory exists).

### Fix — apply fixes from the report

After reviewing the scan report, ask Claude to fix the issues:

```
Fix the issues from the report
```
```
Apply fixes from code-smells.md
```

The fix workflow:
1. Parses the report as a work plan
2. Runs existing tests to capture a baseline (knows what was already failing)
3. Fixes issues file-by-file, writes regression tests, runs `tsc` after each file
4. Runs linter, fixes lint errors
5. Runs full test suite, compares with baseline, fixes any regressions it caused
6. Repeats verification up to 5 iterations
7. Updates the report: if all fixed → deletes `code-smells.md`; if some remain → keeps it as an audit trail with BEFORE/AFTER diffs for every fix

**Important:** fix never commits or stages anything. You review the changes and decide what to keep.

### Auto — scan + fix in one pass

```
Review and fix my TypeScript code
```
```
Auto-fix code smells
```

Runs scan, shows you the summary, asks if you want to proceed with fixes, then runs the full fix cycle. If everything is clean afterward, the report is deleted.

## Scope Modes

By default the entire codebase is reviewed. You can narrow the scope:

| What you say | What gets reviewed |
|---|---|
| *"review my code"* | Full codebase |
| *"review my changes"*, *"check uncommitted"* | Staged + unstaged + untracked `.ts` files |
| *"review my PR"*, *"diff against main"* | All changes on current branch vs base |
| *"review last commit"*, *"check last 3 commits"* | Last N commits |

### Diff-aware severity boost

In scoped modes, issues on **new/modified lines** get their severity boosted by one level (Low→Medium, Medium→High, etc.). A Medium code smell in a three-year-old file is tech debt; the same smell in code you wrote today should be fixed before merging.

Issues on unchanged lines are listed separately as pre-existing tech debt — informational, not blocking.

## Severity Scale

| Level | Meaning |
|---|---|
| **Highest** | Active bugs, security vulnerabilities, data loss risks |
| **High** | Bugs waiting to happen, will break under edge cases |
| **Medium** | Tech debt — clean up when you're already editing that file |
| **Low** | Style and conventions — improve when convenient |

## Project Structure

```
ts-reviewer/
├── SKILL.md                          # Main skill file — mode routing, workflow orchestration
└── references/
    ├── type-safety.md                # Checklist: any, casts, !, exhaustiveness, generics
    ├── security.md                   # Checklist: injection, pollution, ReDoS, traversal
    ├── async-patterns.md             # Checklist: floating promises, races, cancellation
    ├── modernization.md              # Checklist: TS 5.9+ idioms, satisfies, using, as const
    ├── code-quality.md               # Checklist: complexity, dead code, naming, duplication
    ├── tsconfig.md                   # Checklist: strict flags, module resolution, deprecated
    └── fix-workflow.md               # Complete fix protocol: tests, verification, rollback
```

**SKILL.md** (349 lines) is the orchestrator — it routes between scan/fix/auto modes, defines scope detection, severity scale, and report format. It stays under the 500-line recommended limit for Claude skills.

**Reference files** contain the detailed checklists and protocols. Each analysis agent reads only the reference file relevant to its domain, keeping context focused. The fix workflow is in its own reference file because it's a complex multi-step protocol.

## How It Works Under the Hood

### Scan mode

1. **Discovery** — maps the project, reads tsconfig.json, detects linter and test runner
2. **Diagnostics** — runs `tsc --noEmit`, linter, and LSP diagnostics (if available)
3. **Analysis** — six specialized passes (sub-agents in Claude Code, sequential in Claude.ai), each with its own checklist
4. **Report** — deduplicates, applies severity boost (scoped modes), consolidates recurring patterns, writes `code-smells.md`

### Fix mode

1. Parses `code-smells.md` as the work plan
2. Captures test baseline (runs tests before changes)
3. Applies fixes bottom-to-top within each file (so line numbers don't shift)
4. Writes regression tests for each testable fix
5. Runs `tsc --noEmit` after each file
6. Full verification loop: tsc + linter + test suite (max 5 iterations)
7. Compares test results with baseline — only fixes regressions it caused
8. Updates or deletes the report

## Tips

- **Add `code-smells.md` to `.gitignore`** — it's a review artifact, not part of your source code.

- **Commit before running fix** — so you can `git diff` to review changes and `git checkout -- .` to revert if needed.

- **Edit the report before fix** — since fix uses `code-smells.md` as its work plan, you can delete issues you don't want fixed, change severities, or add notes before running fix.

- **Scoped review for PRs** — `"review my branch against main"` is the most practical mode for day-to-day use. Full codebase audits are better suited for periodic health checks.

## Requirements

- TypeScript 5.9+ project
- Git repository (for scoped modes and safe revert during fix)
- Node.js with `npx` available (for tsc, linter)
- Claude Code (recommended) or any Claude interface with skill support

## License

MIT
