#!/usr/bin/env node
// Turns the skill lint's ESLint JSON into the pass file `lint-skill.jsonl`, in the shape of
// `subagent_template`. A message becomes a finding only when a reference line owns its rule:
// the line carries "lint-owned by `<rule>`" or "`<rule>: <id>`", and the finding takes its
// category from SKILL.md `domains`, and its severity, title, and fix from that line.
//
//   node lint-pass.mjs --refs <skill>/references --lint lint-skill.json --out lint-skill.jsonl [--in-diff]
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const OWNED = /, lint-owned by ((?:`[^`]+`(?:, )?)+)$/;
const SEVERITY = /: (Highest|High|Medium|Low)\b/;

// Every owner line of every reference: { rule, id, file, line, domain, severity, title, fix }.
export function readOwners(refsDir) {
  const skill = readFileSync(path.join(refsDir, "..", "SKILL.md"), "utf8");
  const domains = new Map();
  for (const [, domain, ref] of skill.matchAll(/^\| ([A-Z][\w ]+) \| `references\/([\w-]+\.md)` \|/gm)) domains.set(ref, domain);
  const owners = [];
  for (const file of readdirSync(refsDir).filter((f) => f.endsWith(".md"))) {
    const lines = readFileSync(path.join(refsDir, file), "utf8").split("\n");
    lines.forEach((text, index) => {
      const owned = text.match(OWNED);
      if (!owned) return;
      const severity = text.match(SEVERITY);
      if (!severity || !domains.has(file)) throw new Error(`${file}:${index + 1}: an owner line needs a severity and a domain`);
      const [, group, rest] = text.match(/^- (.+?) — (.*)$/) ?? [];
      const pattern = rest.slice(0, rest.indexOf(severity[0]));
      const fix = rest.slice(rest.indexOf(severity[0]) + severity[0].length).replace(OWNED, "").replace(/^,\s*/, "");
      for (const [, spec] of owned[1].matchAll(/`([^`]+)`/g)) {
        const [rule, ids] = spec.split(/: (.*)/);
        const name = rule.replace(/^ts\//, "@typescript-eslint/");
        for (const id of ids ? ids.split(", ") : [""]) {
          owners.push({ rule: name, id, file, line: index + 1, domain: domains.get(file), severity: severity[1].toLowerCase(), title: `${group}: ${pattern}`.trim(), fix });
        }
      }
    });
  }
  return owners;
}

function ownerOf(owners, message) {
  const candidates = owners.filter((o) => o.rule === message.ruleId);
  const byId = candidates.find((o) => o.id && (o.id === message.messageId || o.id === message.message || message.message.endsWith(` ${o.id}`)));
  return byId ?? candidates.find((o) => !o.id);
}

export function lintPass(results, owners, inDiff) {
  const findings = [];
  const seen = new Set();
  let dropped = 0;
  const fatal = [];
  for (const result of results) {
    const file = path.relative(process.cwd(), result.filePath).replace(/\\/g, "/");
    let source = null;
    for (const message of result.messages) {
      if (!message.ruleId) {
        if (message.fatal) fatal.push(`${file}: ${message.message}`);
        continue;
      }
      const owner = ownerOf(owners, message);
      if (!owner) { dropped++; continue; }
      const key = `${file}:${message.line}:${owner.file}:${owner.line}`;
      if (seen.has(key)) continue;
      seen.add(key);
      source ??= (result.source ?? readFileSync(result.filePath, "utf8")).split("\n");
      const from = Math.max(0, message.line - 3);
      findings.push({
        category: owner.domain,
        severity: owner.severity,
        title: owner.title,
        file,
        line: message.line,
        snippet: source.slice(from, message.line + 2).join("\n"),
        problem: message.message === owner.id ? owner.title : message.message,
        fix: owner.fix || owner.title,
        auto_fixable: Boolean(message.fix),
        hot: "unknown",
        fix_cost: "none",
        in_diff: inDiff,
        lint: `${message.ruleId} → references/${owner.file}:${owner.line}`,
      });
    }
  }
  return { findings, files: results.length, dropped, fatal };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const arg = (name) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : undefined; };
  const [refs, lint, out] = [arg("--refs"), arg("--lint"), arg("--out")];
  if (!refs || !lint || !out) throw new Error("usage: lint-pass.mjs --refs <dir> --lint <json> --out <jsonl> [--in-diff]");
  let results;
  try {
    results = JSON.parse(readFileSync(lint, "utf8"));
  } catch (error) {
    console.error(`lint-pass: ${lint} is not ESLint JSON: ${error.message}`);
    process.exit(1);
  }
  if (!Array.isArray(results)) { console.error(`lint-pass: ${lint} holds no ESLint result array`); process.exit(1); }
  const { findings, files, dropped, fatal } = lintPass(results, readOwners(refs), process.argv.includes("--in-diff"));
  const lines = findings.map((f) => JSON.stringify(f));
  lines.push(JSON.stringify({ done: true, findings: findings.length, files }));
  writeFileSync(out, lines.join("\n") + "\n");
  console.log(`lint-skill ${findings.length} findings, ${files} files, ${dropped} unowned messages dropped, ${fatal.length} files unparsed`);
  for (const f of fatal) console.log(`  unparsed: ${f}`);
}
