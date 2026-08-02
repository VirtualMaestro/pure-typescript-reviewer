purpose:
- state how a review rule is added, changed, or removed in this repository
- read it before editing anything under `ts-reviewer/` or `cnlp/`, because those files are written in CNL-P and a check enforces the format

file_map:

| File | What it holds | Who owns it |
|---|---|---|
| `ts-reviewer/references/*.md` | the review rules themselves, 1 file per domain | you |
| `ts-reviewer/SKILL.md` | the review protocol: modes, scope, workflow, report shape | you |
| `ts-reviewer/tools/*.mjs` | the mechanical pre-pass and report validator: plain Node, no CNL-P, no dependencies | you |
| `tools.test.mjs` | the self-check for the pre-pass and report validator, run by `npm test` with the format check | you |
| `cnlp/profiles/reference.md` | which blocks a `references/` file may use, in which order, in which form | you |
| `cnlp/profiles/skill.md` | the same, for `SKILL.md` | you |
| `cnlp/profiles/guide.md` | the same, for this file | you |
| `cnlp/cnlp-format.md` | the standard: forms, line rules, lexicon, the no-restatement rule | upstream, do not edit |
| `cnlp/skill-format.test.js` | the check that runs all of the above | upstream |

read_first:
- a profile states values: the block names, their order, their form
- the standard states rules: what a line may hold, how long it runs, which words are out
- ask the profile what a block should look like, and the standard whether it is allowed at all
- 1 fact lives in 1 file: the standard forbids restating it, and 2 copies drift apart

domain_map:

| Domain | File |
|---|---|
| Type Safety | `references/type-safety.md` |
| Security | `references/security.md` |
| Async Patterns | `references/async-patterns.md` |
| Modernization | `references/modernization.md` |
| Code Quality | `references/code-quality.md` |
| Config | `references/tsconfig.md` |
| Boundary Validation | `references/boundary-validation.md` |
| Error Handling | `references/error-handling.md` |
| Dependency Hygiene | `references/dependency-hygiene.md` |
| Architecture | `references/architecture.md` |
| the fix-mode protocol | `references/fix-workflow.md` |

workflow:
1. pick the file from `domain_map`, and put the rule in the file that already owns the topic rather than in a second one
2. add 1 line to the `scope:` block of the borrowing file when a reader of it has to know which neighbour owns the topic
3. pick the block from `block_choice`, since a rule that is not a pattern to flag does not belong in `checks:`
4. write the line in the shape `check_line_form` gives, reusing an existing group name where one fits
5. pick the severity from `severity_scale`, and take the criteria there rather than the feel of the pattern
6. read `line_rules` before the line is final: the limit, the numbers, and the words are all checked
7. name a new domain in `ts-reviewer/SKILL.md` as `skill_impact` describes, since a file nothing points at is never loaded
8. edit `cnlp/profiles/reference.md` first when the content fits no declared block, and add the block name there before the text
9. run the command in `verification`, and read the file and line it names

check_line_form:
- every line of a `checks:` block opens with its group name and an em dash
- a pattern line carries the severity, and a qualifier line says `fix:` or `note:` and carries none
```
- <group> — <pattern>: <Severity>, <reason and fix>
- <group> — fix: <what to do about the pattern above>
- <group> — note: <rationale, or the gate that decides when the check applies>
```
- the same 3 lines as they stand in `references/security.md`
```
- injection — `eval()` and `new Function()` executing a dynamic string: Highest, use a lookup table, a strategy, or a safe parser
- ssrf — fix: an unallowlisted outbound URL, by parsing it with `new URL()` and checking the host against an explicit allowlist
- unsafe deserialization — note: `JSON.parse` executes no code, so the risk is malformed data bypassing business logic, not injection
```
- the test holds 3 invariants: every line opens with `<group> — `, a line without `fix:` or `note:` carries a severity, and every group holds at least 1 pattern line
- split a check into a pattern line and a `fix:` line when 1 line would run past the limit, and not to shorten a line that already fits

severity_scale:

| Severity | Criteria |
|---|---|
| Highest | active bugs, security vulnerabilities, data loss |
| High | bugs waiting to happen, edge-case failures |
| Medium | tech debt to clean up in context |
| Low | style, to improve when convenient |

block_choice:

| What you are writing | Block |
|---|---|
| a pattern to flag | `checks:` |
| a pattern the reader would flag but should not, with the reason | `non_findings:` |
| a term or a gate a check depends on, without which the check misfires | `read_first:` |
| a command to run to find the patterns | `workflow:` |
| what this file owns, and which file owns a neighbouring topic | `scope:` |
| a prohibition, where the file drives a change rather than a review | `forbidden_behaviors:` |

line_rules:
- 250 characters is the hard limit and 150 is the target: a longer line is holding more than 1 idea
- write the exact number, `> 50 lines` and not `> ~50 lines`, and `<= 5` rather than `at most 5`
- these words are out: `surface`, `sharpen`, `weigh`, `leverage`, `robust`, `sanity-check`, `ensure`
- these comparatives are out, each because it hides the condition that triggers the rule: `better`, `faster`, `cleaner`, `significantly`, `substantially`
- so are these, for the same reason: `flexible`, `scalable`, `extensible`, `where possible`, `if needed`, `as appropriate`, `should probably`, `may want to`
- backticks take a term out of the lexicon check, which is how `leverage` survives as a domain term in the architecture glossary
- a fenced code block is exempt from every rule above, and sits inside a `checks:` or `workflow:` block attached to the line it belongs to

skill_impact:
- a new domain is named in 2 blocks of `ts-reviewer/SKILL.md`
- the `domains:` table takes the file path and the focus
- the `domain_sets:` table takes whether it joins the default set, and the flag that loads it otherwise

forbidden_behaviors:
- do not write a rule as prose or under a `##` heading: the blocks are the structure of a `references/` file
- do not restate a fact another file already states: put the owner in `scope:` instead
- do not invent a severity outside the 4 in `severity_scale`
- do not add a block `cnlp/profiles/reference.md` does not declare: edit the profile first
- do not change the frontmatter of `ts-reviewer/SKILL.md`: the runtime parses `name` and `description` for discovery and routing
- do not edit `cnlp/cnlp-format.md` or `cnlp/cnlp.js`: they are upstream, and a local edit is lost on the next unpack

verification:
- `npm test` runs the typecheck, the format check, and the pre-pass self-check together
- `node --test cnlp/skill-format.test.js` runs the format check alone, as 5 tests
- `node --test tools.test.mjs` runs 13 tool tests, and 2 are skipped without `ARCH_TOOLS_NETWORK=1`, which lets them reach `npx`
- every issue is an error and none is a warning: these files are read as executable instructions, so there is no draft state
- the failure message names the file and the line
