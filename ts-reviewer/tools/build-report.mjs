#!/usr/bin/env node
// Builds code-smells/report.md from the pass files and the main agent's decisions (SKILL.md
// workflow step 44). The agent decides, at steps 33-35, which findings stand and at what severity;
// this script applies the mechanics of steps 36-43 and 48-49 and renders `report_format`, so the
// agent writes its decisions, not the report.
//
//   node build-report.mjs --dir code-smells/passes --input code-smells/passes/report.json --out code-smells/report.md
//
// report.json: { project, reviewed, stack, scope, branch?, base?, files, context, archCoverage?,
//   summary, discovery?, config?, architecture?, verification?: [[check, result]],
//   artifacts?: [[file, what it holds]], drop?: [key], edit?: { key: fields }, add?: [finding] }
// A key is "<pass id>:<line number in its .jsonl file>".
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const LEVELS = ["Low", "Medium", "High", "Highest"];
const level = (s) => LEVELS.indexOf(s);
const cap = (s) => LEVELS.find((l) => l.toLowerCase() === String(s).toLowerCase()) ?? "Medium";
const hotEntry = (f) => f.hot && f.hot !== "no" && f.fix_cost && f.fix_cost !== "none";
const oneLine = (s) => String(s ?? "").replace(/\s*\n\s*/g, " ").trim();
const cell = (s) => oneLine(s).replace(/\|/g, "\\|");

// Every finding of every pass whose file ends with its done line, keyed for the decisions.
export function readPasses(dir) {
  const out = [];
  for (const name of readdirSync(dir).filter((f) => f.endsWith(".jsonl")).sort()) {
    const lines = readFileSync(path.join(dir, name), "utf8").split(/\r?\n/);
    const records = lines.map((l) => { try { return l.trim() ? JSON.parse(l) : null; } catch { return null; } });
    if (!records.filter(Boolean).at(-1)?.done) continue;
    records.forEach((r, i) => { if (r && !r.done) out.push({ ...r, key: `${name.slice(0, -6)}:${i + 1}` }); });
  }
  return out;
}

// Steps 38 and 39: 1 entry per file and line, every category named, at the highest severity.
function merge(findings) {
  const byLine = new Map();
  for (const f of findings) {
    const at = `${f.file}:${f.line}`;
    const entry = byLine.get(at);
    if (!entry) { byLine.set(at, { ...f, categories: [f.category], titles: [oneLine(f.title)], problems: [oneLine(f.problem)], fixes: [oneLine(f.fix)] }); continue; }
    const id = f.check ?? f.title;
    if ((entry.check ?? entry.title) === id && entry.titles.includes(oneLine(f.title))) continue;
    if (!entry.categories.includes(f.category)) entry.categories.push(f.category);
    if (!entry.titles.includes(oneLine(f.title))) { entry.titles.push(oneLine(f.title)); entry.problems.push(oneLine(f.problem)); entry.fixes.push(oneLine(f.fix)); }
    if (level(f.severity) > level(entry.severity)) Object.assign(entry, { severity: f.severity, check: f.check, snippet: f.snippet });
    if (hotEntry(f) && !hotEntry(entry)) Object.assign(entry, { hot: f.hot, fix_cost: f.fix_cost });
    entry.auto_fixable &&= f.auto_fixable;
    entry.in_diff ||= f.in_diff;
  }
  return [...byLine.values()].map((e) => ({ ...e, title: e.titles.join(" / "), problem: e.problems.join(" "), fix: e.fixes.join(" Also: ") }));
}

const order = (scoped) => (a, b) =>
  level(b.severity) - level(a.severity) ||
  (scoped ? Number(Boolean(b.in_diff)) - Number(Boolean(a.in_diff)) : 0) ||
  a.categories[0].localeCompare(b.categories[0]) || a.file.localeCompare(b.file) || a.line - b.line;

// Steps 36, 40, 41, and 43: the Recurring Pattern rows, and the entries that stay.
function consolidate(entries, scoped) {
  const rows = [];
  const keep = [];
  const groups = new Map();
  for (const e of entries) {
    if (hotEntry(e)) { keep.push(e); continue; }
    const id = e.check ?? e.titles[0];
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id).push(e);
  }
  const row = (members, treatment) => rows.push({
    name: `${members[0].titles[0]} [${members[0].categories[0]}]`, count: members.length, treatment,
    sites: members.map((m) => `${m.file}:${m.line}`),
  });
  for (const members of groups.values()) {
    members.sort(order(scoped));
    const top = members[0].severity;
    if (members.length < 3) keep.push(...members);
    else if (level(top) >= level("High")) {
      keep.push(members[0]);
      row(members.slice(1), `${top}, kept: \`${members[0].file}:${members[0].line}\` stands as the full entry (step 40), the other sites are listed here`);
    } else if (members.length >= 5) {
      const to = top === "Low" ? "Low, already the lowest level" : `downgraded ${top} to ${LEVELS[level(top) - 1]}`;
      row(members, `${to} (5+ occurrences, step 36), reported once`);
    } else row(members, `${top}, consolidated (step 40)`);
  }
  // Step 41: a domain holding more than 25 Medium or Low entries keeps its top 15.
  const final = [];
  const byDomain = new Map();
  for (const e of keep.sort(order(scoped))) {
    const low = level(e.severity) < level("High") && !hotEntry(e);
    const n = low ? (byDomain.get(e.categories[0]) ?? 0) + 1 : 0;
    if (low) byDomain.set(e.categories[0], n);
    final.push({ ...e, rank: n });
  }
  const capped = new Set([...byDomain].filter(([, n]) => n > 25).map(([d]) => d));
  const out = [];
  const rest = new Map();
  for (const e of final) {
    if (capped.has(e.categories[0]) && e.rank > 15) {
      const id = e.check ?? e.titles[0];
      if (!rest.has(id)) rest.set(id, []);
      rest.get(id).push(e);
    } else out.push(e);
  }
  for (const members of rest.values()) row(members, `${members[0].severity}, past the top 15 of ${members[0].categories[0]} (step 41)`);
  return { entries: out, rows };
}

function renderEntry(e) {
  const boosted = e.boostedFrom ? ` [boosted, was ${e.boostedFrom} — new code]` : "";
  const lines = [
    `### ${e.title} — ${e.severity}${boosted}`, "",
    `**Category:** ${e.categories.join(", ")} | **File:** \`${e.file}\` | **Line:** ${e.line} | **Auto-fixable:** ${e.auto_fixable ? "Yes" : "No"} | **New code:** ${e.in_diff ? "Yes" : "No"}`,
  ];
  if (hotEntry(e)) lines.push(`**Hot path:** ${e.hot} | **Fix cost:** ${e.fix_cost}`);
  lines.push("", "```typescript", String(e.snippet ?? "").replace(/\s+$/, ""), "```", "", `**Problem:** ${e.problem}`, `**Fix:** ${e.fix}`);
  if (e.reference) lines.push(`**Reference:** ${e.reference}`);
  lines.push("", "---", "");
  return lines.join("\n");
}

const table = (rows) => ["| Issue | Category | Location | Fix |", "|---|---|---|---|",
  ...rows.map((e) => `| ${cell(e.title)} | ${e.categories.join(", ")} | \`${e.file}:${e.line}\` | ${cell(e.fix)} |`), ""].join("\n");

export function buildReport(dir, input) {
  const scoped = input.scope !== "full";
  const drop = new Set(input.drop ?? []);
  const findings = [...readPasses(dir), ...(input.add ?? []).map((f, i) => ({ ...f, key: `add:${i + 1}` }))]
    .filter((f) => !drop.has(f.key))
    .map((f) => ({ ...f, ...(input.edit?.[f.key] ?? {}) }))
    .map((f) => ({ ...f, severity: cap(f.severity), line: Number(f.line), file: String(f.file).replace(/\\/g, "/") }));
  const merged = merge(findings);
  // Step 37: a scoped mode boosts a finding on new code by 1 level.
  if (scoped) for (const e of merged) if (e.in_diff && e.severity !== "Highest") { e.boostedFrom = e.severity; e.severity = LEVELS[level(e.severity) + 1]; }
  const { entries, rows } = consolidate(merged, scoped);
  const pre = scoped ? entries.filter((e) => !e.in_diff) : [];
  const live = scoped ? entries.filter((e) => e.in_diff) : entries;
  const high = live.filter((e) => level(e.severity) >= level("High"));
  // Step 49: past 15 Medium and Low entries, the top 10 stay full and the rest go to tables.
  const lower = live.filter((e) => level(e.severity) < level("High"));
  const full = new Set(lower.length > 15 ? lower.filter((e, i) => i < 10 || hotEntry(e)) : lower);
  const section = (sev) => ({
    entries: lower.filter((e) => e.severity === sev && full.has(e)),
    rest: lower.filter((e) => e.severity === sev && !full.has(e)),
  });
  const medium = section("Medium");
  const low = section("Low");
  const arch = input.architecture && existsSync(input.architecture) ? readFileSync(input.architecture, "utf8").trim() : "";
  const counted = [...high, ...medium.entries, ...medium.rest, ...low.entries, ...low.rest, ...pre];
  const tally = Object.fromEntries(LEVELS.map((l) => [l, counted.filter((e) => e.severity === l).length]));
  for (const [, sev] of arch.matchAll(/^### .+ — (Highest|High|Medium|Low)\b/gm)) tally[sev]++;
  const total = LEVELS.reduce((n, l) => n + tally[l], 0);
  const scopeLine = { full: "Full", uncommitted: "Uncommitted", branch: `Branch \`${input.branch}\` vs \`${input.base}\`` }[input.scope]
    ?? `Last ${String(input.scope).split(":")[1]} commits`;
  const configCount = counted.filter((e) => e.categories.some((c) => c === "Config" || c === "Dependency Hygiene")).length;
  const out = [
    "# TypeScript Code Review Report", "",
    `**Project:** ${input.project}`, `**Reviewed:** ${input.reviewed}`,
    `**Stack:** TypeScript 5.9.x / ES2024 / Node 24 — ${input.stack}`, `**Scope:** ${scopeLine}`,
    `**Files analyzed:** ${input.files} (+ ${input.context ?? 0} context)`,
    ...(input.archCoverage ? [`**Architecture coverage:** ${input.archCoverage}`] : []),
    `**Total issues:** ${total} (${tally.Highest} highest, ${tally.High} high, ${tally.Medium} medium, ${tally.Low} low)`,
    ...(scoped ? [`**Severity-boosted:** ${counted.filter((e) => e.boostedFrom).length}`] : []), "",
    "## Summary", "", oneLine(input.summary), "",
    ...(input.discovery ? ["## Discovery", "", String(input.discovery).trim(), ""] : []),
    "## Highest + High Issues", "", ...(high.length ? high.map(renderEntry) : ["No Highest or High issue.", ""]),
    "## Medium Issues", "", ...medium.entries.map(renderEntry), ...(medium.rest.length ? [table(medium.rest)] : []),
    ...(medium.entries.length || medium.rest.length ? [] : ["No Medium issue.", ""]),
    "## Low Issues", "", ...low.entries.map(renderEntry), ...(low.rest.length ? [table(low.rest)] : []),
    ...(low.entries.length || low.rest.length ? [] : ["No Low issue.", ""]),
    "## Recurring Patterns", "",
    ...(rows.length ? ["| Pattern | Occurrences | Severity treatment |", "|---|---|---|",
      ...rows.map((r) => `| ${cell(r.name)} | ${r.count} | ${cell(r.treatment)}. Locations: ${r.sites.map((s) => `\`${s}\``).join(", ")} |`), ""]
      : ["No recurring pattern.", ""]),
    "## Config Issues", "",
    input.config ? oneLine(input.config) : `The ${configCount} Config and Dependency Hygiene findings sit in the severity sections above.`, "",
    ...(scoped ? ["## Pre-existing Issues (scoped modes only)", "", ...(pre.length ? pre.map(renderEntry) : ["No pre-existing issue.", ""])] : []),
    ...(arch ? ["## Architecture Opportunities", "", arch, ""] : []),
    ...(input.verification?.length ? ["## Verification", "", "| Check | Result |", "|---|---|",
      ...input.verification.map(([c, r]) => `| ${cell(c)} | ${cell(r)} |`), ""] : []),
    ...(input.artifacts?.length ? ["## Generated artifacts", "", ...input.artifacts.map(([f, w]) => `- \`${f}\` — ${oneLine(w)}`), ""] : []),
  ];
  return { text: out.join("\n"), total, rows: rows.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const arg = (name) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : undefined; };
  const [dir, inputFile, out] = [arg("--dir"), arg("--input"), arg("--out")];
  if (!dir || !inputFile || !out) throw new Error("usage: build-report.mjs --dir <passes dir> --input <report.json> --out <report.md>");
  const { text, total, rows } = buildReport(dir, JSON.parse(readFileSync(inputFile, "utf8")));
  writeFileSync(out, text);
  console.log(`build-report: ${total} issues, ${rows} pattern rows, written to ${out}`);
}
