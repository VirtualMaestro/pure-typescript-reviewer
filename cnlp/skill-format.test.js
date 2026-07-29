import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bodyIssues, loadProfile, parseBlocks } from './cnlp.js';

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

const REFERENCE_DIR = 'ts-reviewer/references'; // the checklists and protocols a skill loads by path

const referenceFiles = async () => {
  const dir = path.join(repoRoot, REFERENCE_DIR);
  const names = (await readdir(dir)).filter((n) => n.endsWith('.md')).sort();
  return Promise.all(names.map(async (name) => [name, await readFile(path.join(dir, name), 'utf8')]));
};

test('every reference file conforms to profiles/reference.md', async () => {
  const profile = await loadProfile('reference');
  for (const [name, raw] of await referenceFiles()) {
    const issues = bodyIssues(raw, profile).map((i) => `${name}:${i.line}: ${i.message}`);
    assert.deepEqual(issues, []);
  }
});

// The `checks:` note of profiles/reference.md, which bodyIssues does not see: it checks the
// form of a block, and this is the shape of the lines inside one.
const SEVERITY = /:\s*(Highest|High|Medium|Low)\b/;

test('every checks: line is a pattern with a severity, or a marked qualifier', async () => {
  for (const [name, raw] of await referenceFiles()) {
    const { lines, sections } = parseBlocks(raw);
    const at = sections.find((s) => s.key === 'checks');
    if (!at) continue;
    const patterns = new Set(); // groups holding at least one pattern line
    const groups = new Set();
    const issues = [];
    for (let i = at.line; i < lines.length && !/^[a-z_]+:/.test(lines[i]); i += 1) {
      if (!lines[i].startsWith('- ')) continue;
      const [group, ...rest] = lines[i].slice(2).split(' — ');
      if (rest.length === 0) { issues.push(`${name}:${i + 1}: check line has no "<group> — " prefix`); continue; }
      groups.add(group);
      const qualifier = /^(fix|note):\s/.test(rest.join(' — '));
      // A pattern line carries the severity; a qualifier line says so and is exempt.
      if (qualifier) continue;
      if (SEVERITY.test(lines[i])) patterns.add(group);
      else issues.push(`${name}:${i + 1}: line states no severity and opens with neither "fix:" nor "note:"`);
    }
    for (const g of groups) if (!patterns.has(g)) issues.push(`${name}: group "${g}" has no pattern line`);
    assert.deepEqual(issues, []);
  }
});

test('every profile conforms to profiles/profile.md', async () => {
  const profile = await loadProfile('profile');
  const dir = path.join(repoRoot, 'cnlp', 'profiles');
  for (const name of (await readdir(dir)).sort()) {
    const raw = await readFile(path.join(dir, name), 'utf8');
    const issues = bodyIssues(raw, profile).map((i) => `${name}:${i.line}: ${i.message}`);
    assert.deepEqual(issues, []);
  }
});

