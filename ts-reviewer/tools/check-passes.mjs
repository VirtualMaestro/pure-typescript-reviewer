#!/usr/bin/env node
// Checks the pass files of a scan before the main agent reads them (SKILL.md workflow step 33).
// It repairs what a pass agent writes wrong by mechanics alone, and prints what needs a reader:
// - repair: records joined by a literal `\n` on 1 physical line, and an invalid escape such as `\w`;
// - repair: a category outside the pass's domains, when the `check` line names 1 of them;
// - print: a severity that differs from the one its `check` line states;
// - print: a `done` line that claims fewer files than the queue gave the pass: a pass may read
//   context files beyond its list, so more is not a gap.
//
//   node check-passes.mjs --refs <skill>/references --dir code-smells/passes
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const SEVERITY = /: (Highest|High|Medium|Low)\b/;
const slug = (domain) => domain.toLowerCase().replace(/ /g, "-");

// The domain of every reference file, from the `domains:` table of SKILL.md.
function readDomains(refsDir) {
  const skill = readFileSync(path.join(refsDir, "..", "SKILL.md"), "utf8");
  const byFile = new Map();
  for (const [, domain, ref] of skill.matchAll(/^\| ([A-Z][\w ]+) \| `references\/([\w-]+\.md)` \|/gm)) byFile.set(ref, domain);
  return byFile;
}

// The file counts the queue gave each pass: `| <id> | <domains> | <files> | <status> | ...`.
function readQueue(dir) {
  const file = path.join(dir, "queue.md");
  const counts = new Map();
  if (!existsSync(file)) return counts;
  for (const [, id, files] of readFileSync(file, "utf8").matchAll(/^\| ([\w+.-]+) \| [^|]+ \| (\d+) \|/gm)) counts.set(id, Number(files));
  return counts;
}

function parseLine(text) {
  try {
    return { record: JSON.parse(text), repaired: false };
  } catch {
    try {
      return { record: JSON.parse(text.replace(/\\(?!["\\/bfnrtu])/g, "\\\\")), repaired: true };
    } catch {
      return { record: null, repaired: false };
    }
  }
}

export function checkPasses(refsDir, dir) {
  const domainOf = readDomains(refsDir);
  const queue = readQueue(dir);
  const refLines = new Map();
  const refLine = (file, line) => {
    if (!refLines.has(file)) {
      const abs = path.join(refsDir, file);
      refLines.set(file, existsSync(abs) ? readFileSync(abs, "utf8").split("\n") : null);
    }
    return refLines.get(file)?.[line - 1];
  };
  const report = [];
  for (const name of readdirSync(dir).filter((f) => f.endsWith(".jsonl")).sort()) {
    const id = name.slice(0, -".jsonl".length);
    const allowed = id === "lint-skill" ? null : new Set(id.split(".")[0].split("+"));
    const raw = readFileSync(path.join(dir, name), "utf8");
    const notes = [];
    let text = raw;
    if (/\}\\n\{/.test(text)) {
      text = text.replace(/\}\\n\{/g, "}\n{").replace(/\}\\n\s*$/, "}\n");
      notes.push("repaired: records joined by a literal \\n, split into lines");
    }
    const out = [];
    let done = null;
    let unchecked = 0;
    text.split(/\r?\n/).forEach((line, index) => {
      if (!line.trim()) return;
      const { record, repaired } = parseLine(line);
      const at = `line ${index + 1}`;
      if (!record) { notes.push(`unreadable: ${at} is not JSON`); out.push(line); return; }
      if (repaired) notes.push(`repaired: ${at} had an invalid escape`);
      if (record.done) { done = record; out.push(JSON.stringify(record)); return; }
      const [refFile, refAt] = String(record.check ?? "").replace(/^references\//, "").split(":");
      const checkDomain = domainOf.get(refFile);
      if (allowed && !allowed.has(slug(String(record.category)))) {
        if (checkDomain && allowed.has(slug(checkDomain))) {
          notes.push(`repaired: ${at} category ${JSON.stringify(record.category)} set to ${checkDomain}`);
          record.category = checkDomain;
        } else notes.push(`category: ${at} ${JSON.stringify(record.category)} is outside ${id}`);
      }
      if (!record.check) unchecked++;
      else {
        const stated = refLine(refFile, Number(refAt))?.match(SEVERITY)?.[1];
        if (!stated) notes.push(`check: ${at} names ${record.check}, which states no severity`);
        else if (stated.toLowerCase() !== String(record.severity).toLowerCase()) {
          notes.push(`severity: ${at} ${record.file}:${record.line} is ${record.severity}, ${record.check} states ${stated}`);
        }
      }
      out.push(JSON.stringify(record));
    });
    if (unchecked) notes.push(`no check: ${unchecked} of ${out.length - (done ? 1 : 0)} findings name no check line`);
    if (!done) notes.push("no done line");
    else if (done.files < (queue.get(id) ?? 0)) notes.push(`files: the done line claims ${done.files}, the queue gave ${queue.get(id)}`);
    const fixed = out.join("\n") + "\n";
    if (notes.some((n) => n.startsWith("repaired:")) && fixed !== raw) writeFileSync(path.join(dir, name), fixed);
    if (notes.length) report.push({ id, notes });
  }
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const arg = (name) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : undefined; };
  const [refs, dir] = [arg("--refs"), arg("--dir")];
  if (!refs || !dir) throw new Error("usage: check-passes.mjs --refs <dir> --dir <passes dir>");
  const report = checkPasses(refs, dir);
  for (const { id, notes } of report) {
    console.log(id);
    for (const note of notes) console.log(`  ${note}`);
  }
  console.log(`check-passes: ${report.length} pass files with notes`);
}
