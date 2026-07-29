# CLAUDE.md

This repository ships `ts-reviewer`, a TypeScript code-review skill: `ts-reviewer/SKILL.md`
is the protocol, and `ts-reviewer/references/*.md` are the review rules it loads by path.

**Read `AGENTS.md` before editing anything under `ts-reviewer/` or `cnlp/`.**

Those files are written in CNL-P, a structured format an agent reads as executable
instructions, and `npm test` fails on a violation. `AGENTS.md` holds the shape of a check
line, the severity scale, which block takes what, and the line rules. Adding a rule in
ordinary markdown prose breaks the build.
