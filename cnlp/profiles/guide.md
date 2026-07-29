---
name: guide
description: The CNL-P profile of a repository guide — the sections AGENTS.md uses to tell an agent how to edit this repository, in order.
---

format: cnlp/cnlp-format.md

mood: imperative

headings:
- none: a guide is one flat run of sections, and the file name carries the title

frontmatter_fields:
- none: a guide is read by path, so it carries no routing contract to restate

lexicon_exempt:
- none: a guide has no frontmatter, so nothing is exempt

sections:
- key: purpose
  form: bullet-list
  required: yes
  note: what the file governs, and when to read it
- key: read_first
  form: bullet-list
  required: no
  note: what an editor has to understand before the first edit, such as which file is the authority on what
- key: workflow
  form: numbered-list
  required: no
  note: the order of work for the edit this guide governs
- key: forbidden_behaviors
  form: bullet-list
  required: no
  note: what an edit never does, each with the reason it breaks something
- key: verification
  form: bullet-list
  required: no
  note: the command that proves the edit conforms, and how its output is read

custom_sections:
- file_map
- domain_map
- check_line_form
- severity_scale
- block_choice
- line_rules
- skill_impact

enforcement:
- `node --test cnlp/skill-format.test.js`, over the guide its `GUIDE_FILES` names
- any issue is an error: a guide is read before an agent edits the corpus, so a wrong guide corrupts every file that follows
- a repository without Node holds this profile by review against the standard instead
