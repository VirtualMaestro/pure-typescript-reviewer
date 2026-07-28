import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bodyIssues, loadProfile } from './cnlp.js';

// Conformance with docs/cnlp-format.md, skills profile. The grammar lives in
// src/artifacts/cnlp.js and the vocabulary in profiles/skill.md; this file only runs them.
// No skill is exempt: reference material declares `workflow: - none` with its reason.

const SKILLS_DIR = '.'; // where this repository keeps skills, relative to its root

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
if (!existsSync(path.join(repoRoot, SKILLS_DIR))) {
  throw new Error(`SKILLS_DIR "${SKILLS_DIR}" does not exist under ${repoRoot} — set it at the top of this file`);
}
// SKILLS_DIR is the repository root here, so an entry is a skill only when it holds a SKILL.md.
const skills = (await readdir(path.join(repoRoot, SKILLS_DIR)))
  .filter((name) => existsSync(path.join(repoRoot, SKILLS_DIR, name, 'SKILL.md')))
  .sort();

test('every skill body conforms to profiles/skill.md', async () => {
  const profile = await loadProfile('skill');
  for (const name of skills) {
    const raw = await readFile(path.join(repoRoot, SKILLS_DIR, name, 'SKILL.md'), 'utf8');
    const issues = bodyIssues(raw, profile).map((i) => `${name}:${i.line}: ${i.message}`);
    assert.deepEqual(issues, []);
  }
});

