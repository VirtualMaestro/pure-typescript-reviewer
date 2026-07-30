---
name: reference
description: The CNL-P profile of a reference file — the sections a review checklist or a protocol under references/ uses, in order.
---

format: cnlp/cnlp-format.md

mood: imperative

headings:
- none: a reference file is one flat run of sections, and the file name carries the title

frontmatter_fields:
- none: a reference file is read by path, so it carries no routing contract to restate

lexicon_exempt:
- none: a reference file has no frontmatter, so nothing is exempt

sections:
- key: purpose
  form: bullet-list
  required: yes
  note: what the file is loaded for, and when
- key: scope
  form: bullet-list
  required: no
  note: what this file owns, and which file owns a neighbouring topic
- key: read_first
  form: bullet-list
  required: no
  note: the terms and gates a check depends on, when reading a check alone would misfire
- key: workflow
  form: numbered-list
  required: no
  note: how to find the patterns, before the block that names them; a checklist with nothing to run deletes this block
- key: checks
  form: bullet-list
  required: no
  note: "a pattern line reads `<group> — <pattern>: <severity>, <fix>`, a qualifier line reads `<group> — fix:` or `<group> — note:` and carries no severity, and every group holds at least 1 pattern line"
- key: non_findings
  form: bullet-list
  required: no
  note: patterns the reader would otherwise flag, each with the reason it is not a finding
- key: forbidden_behaviors
  form: bullet-list
  required: no
  note: when the file drives a change rather than a review

custom_sections:
- glossary
- severity_mapping
- fixability
- dependency_classification
- confidence_scale
- baseline_verdicts
- report_format
- test_runners

enforcement:
- `node --test cnlp/skill-format.test.js`, over every file in the directory its `REFERENCE_DIR` names
- any issue is an error: a reference file is read as executable instructions, so there is no draft state to warn about
- a repository without Node holds this profile by review against the standard instead
