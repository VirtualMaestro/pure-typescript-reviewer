#!/usr/bin/env node
// Checks code-smells/report.md against the `report_format` block of SKILL.md, and nothing beyond it:
// the spec is the contract, this script is only the reader that enforces it.
//
//   node validate-report.mjs --repo . --report code-smells/report.md
//
// An error is a defect of the report text, which rewriting the report can correct. A warning names
// an outcome of the mechanical pre-pass, which it cannot — a missing diagram is not a bad report,
// and failing the run over one would burn the two validation attempts the workflow allows.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const DOMAINS = new Set([
  "Type Safety", "Security", "Async Patterns", "Modernization", "Code Quality", "Config",
  "Boundary Validation", "Error Handling", "Dependency Hygiene", "Architecture",
]);
const SEVERITIES = ["Highest", "High", "Medium", "Low"];
// The whole section set, in the order report_format gives it. Anything else is a renamed section.
const SECTIONS = [
  { name: "Summary", required: true },
  { name: "Discovery", required: false },
  { name: "Highest + High Issues", required: true },
  { name: "Medium Issues", required: true },
  { name: "Low Issues", required: true },
  { name: "Recurring Patterns", required: true },
  { name: "Config Issues", required: true },
  { name: "Pre-existing Issues (scoped modes only)", required: false },
  { name: "Architecture Opportunities", required: false },
  { name: "Verification", required: false },
  { name: "Generated artifacts", required: false },
];
const ISSUE_SECTIONS = [
  "Highest + High Issues", "Medium Issues", "Low Issues", "Recurring Patterns", "Config Issues",
  "Pre-existing Issues (scoped modes only)",
];
const SECTION_SEVERITY = { "Medium Issues": "Medium", "Low Issues": "Low" };
const COMMON_ARCH_FIELDS = [
  "Confidence", "Files", "Problem", "Evidence", "Change type", "Proposed change",
  "Test strategy", "Benefits", "Trade-offs", "Fixability",
];
const CONDITIONAL_ARCH_FIELDS = {
  deepening: ["Interface shape", "Dependency category", "Migration"],
  merge: ["Interface shape", "Migration"],
  "ownership move": ["Migration"],
  delete: ["Migration"],
  enforce: ["Rule"],
};

const value = (name, fallback) => {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 && process.argv[at + 1] ? process.argv[at + 1] : fallback;
};
const repo = path.resolve(value("repo", "."));
const reportArg = value("report", "code-smells/report.md");
const report = path.isAbsolute(reportArg) ? reportArg : path.resolve(repo, reportArg);
if (!existsSync(report)) {
  console.error(`${path.relative(repo, report) || report}:1: report does not exist`);
  process.exit(1);
}

const lines = readFileSync(report, "utf8").split(/\r?\n/);
const errors = [];
const warnings = [];
const fail = (line, message) => errors.push({ line: Math.max(1, line), message });
const warn = (line, message) => warnings.push({ line: Math.max(1, line), message });
const insideRepo = (target) => {
  const relative = path.relative(repo, target);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
};
const checkRepoPath = (raw, line) => {
  if (path.isAbsolute(raw)) {
    fail(line, `path must be relative: ${raw}`);
    return null;
  }
  const target = path.resolve(repo, raw);
  if (!insideRepo(target)) { fail(line, `path leaves the repository: ${raw}`); return null; }
  if (!existsSync(target)) { fail(line, `path does not exist: ${raw}`); return null; }
  return target;
};

const firstContent = lines.findIndex((line) => line.trim());
if (lines[firstContent] !== "# TypeScript Code Review Report") fail(firstContent + 1, "expected exact report title");

// ── sections ────────────────────────────────────────────────────────────────
const h2s = lines.flatMap((line, index) => {
  const match = line.match(/^## (.+)$/);
  return match ? [{ name: match[1], index }] : [];
});
const actualSections = h2s.map(({ name }) => name);
const known = new Set(SECTIONS.map((section) => section.name));
const firstHeading = (h2s[0]?.index ?? 0) + 1;
for (const { name, index } of h2s) if (!known.has(name)) fail(index + 1, `unknown section: ${name}`);
for (const { name, required } of SECTIONS) {
  if (required && !actualSections.includes(name)) fail(firstHeading, `missing section: ${name}`);
}
const present = actualSections.filter((name) => known.has(name));
const expected = SECTIONS.map(({ name }) => name).filter((name) => actualSections.includes(name));
if (present.join("\n") !== expected.join("\n")) {
  fail(firstHeading, `sections are out of order or repeated; expected: ${expected.join(" > ")}`);
}
const sections = new Map(h2s.map((heading, index) => [heading.name, {
  start: heading.index + 1,
  end: h2s[index + 1]?.index ?? lines.length,
  line: heading.index + 1,
}]));

const metadata = ["Project", "Reviewed", "Stack", "Scope", "Files analyzed", "Total issues"];
for (const name of metadata) {
  const matches = lines.flatMap((line, index) => line.startsWith(`**${name}:**`) ? [index] : []);
  if (matches.length !== 1) fail(matches[0] + 1 || 1, `metadata ${name} must appear exactly once`);
}
const totalLine = lines.findIndex((line) => line.startsWith("**Total issues:**"));
const totalMatch = lines[totalLine]?.match(/^\*\*Total issues:\*\* (\d+) \((\d+) highest, (\d+) high, (\d+) medium, (\d+) low\)$/);
if (!totalMatch) fail(totalLine + 1, "Total issues has an invalid shape");

// ── findings ────────────────────────────────────────────────────────────────
// A table in an issue section is read by its header: the summary table of workflow step 39 carries
// issues, and the Recurring Patterns table carries patterns whose members are counted where they sit.
const cells = (line) => line.split("|").slice(1, -1).map((cell) => cell.trim());
const isSummaryTable = (header) => header.includes("Category") && header.includes("Location");
const isPatternTable = (header) => header.includes("Pattern") && header.includes("Occurrences");

const counts = new Map(SEVERITIES.map((severity) => [severity, 0]));
let issueCount = 0;
const duplicates = new Map();
const headingPattern = /^### .+ — (Highest|High|Medium|Low)(?: \[.+\])?$/;

for (const sectionName of ISSUE_SECTIONS) {
  const section = sections.get(sectionName);
  if (!section) continue;
  const headings = [];
  for (let index = section.start; index < section.end; index++) {
    if (lines[index].startsWith("### ")) headings.push(index);
  }
  for (let at = 0; at < headings.length; at++) {
    const index = headings[at];
    const end = headings[at + 1] ?? section.end;
    const heading = lines[index].match(headingPattern);
    if (!heading) {
      fail(index + 1, "finding heading must end with an exact severity");
      continue;
    }
    const severity = heading[1];
    if (sectionName === "Highest + High Issues" && !["Highest", "High"].includes(severity)) fail(index + 1, "severity does not match its section");
    if (sectionName === "Medium Issues" && severity !== "Medium") fail(index + 1, "severity does not match its section");
    if (sectionName === "Low Issues" && severity !== "Low") fail(index + 1, "severity does not match its section");
    counts.set(severity, counts.get(severity) + 1);
    issueCount++;

    const block = lines.slice(index + 1, end);
    const metaAt = block.findIndex((line) => line.startsWith("**Category:**"));
    const meta = block[metaAt]?.match(/^\*\*Category:\*\* (.+?) \| \*\*File:\*\* `([^`]+)` \| \*\*Line:\*\* (\d+) \| \*\*Auto-fixable:\*\* (Yes|No) \| \*\*New code:\*\* (Yes|No)$/);
    if (!meta) {
      fail(index + 1, "finding metadata is missing or has the wrong field names");
      continue;
    }
    const categories = meta[1].split(/\s*(?:,|&)\s*/);
    for (const category of categories) {
      if (!DOMAINS.has(category)) fail(index + metaAt + 2, `unknown category: ${category}`);
    }
    const source = checkRepoPath(meta[2], index + metaAt + 2);
    const sourceLine = Number(meta[3]);
    // Workflow step 31 merges what two domains raise on one file and line into one entry naming
    // both categories, so a second entry on that line is the merge that did not happen.
    const key = `${meta[2]}:${sourceLine}`.toLowerCase();
    if (duplicates.has(key)) fail(index + 1, `duplicate finding; first entry is at line ${duplicates.get(key)}`);
    else duplicates.set(key, index + 1);
    if (!block.some((line) => line.startsWith("**Problem:** "))) fail(index + 1, "finding has no Problem field");
    if (!block.some((line) => line.startsWith("**Fix:** "))) fail(index + 1, "finding has no Fix field");

    const fence = block.findIndex((line) => /^```[^`]*$/.test(line));
    const fenceEnd = fence >= 0 ? block.findIndex((line, at) => at > fence && line === "```") : -1;
    if (fence < 0 || fenceEnd < 0) {
      fail(index + 1, "finding has no fenced snippet");
    } else if (source && statSync(source).isFile()) {
      const sourceLines = readFileSync(source, "utf8").split(/\r?\n/);
      if (sourceLine < 1 || sourceLine > sourceLines.length) fail(index + metaAt + 2, `line is outside the file: ${sourceLine}`);
      else {
        // A snippet runs 3-7 lines and the stated line sits anywhere inside it, so the window is the
        // snippet's own length on either side, and any one of its lines anchors it to the file.
        const snippet = block.slice(fence + 1, fenceEnd).map((line) => line.trim()).filter(Boolean);
        const reach = snippet.length;
        const window = new Set(sourceLines.slice(Math.max(0, sourceLine - 1 - reach), sourceLine + reach).map((line) => line.trim()));
        if (reach && !snippet.some((line) => window.has(line))) {
          fail(index + fence + 2, `snippet matches no line within ${reach} line(s) of line ${sourceLine}`);
        }
      }
    }
  }

  let counting = false;
  let fenced = false;
  for (let index = section.start; index < section.end; index++) {
    if (lines[index].startsWith("```")) { fenced = !fenced; continue; }
    if (fenced) continue;
    if (/^\|[-:| ]+\|$/.test(lines[index])) {
      const header = cells(lines[index - 1] ?? "");
      counting = isSummaryTable(header);
      if (!counting && !isPatternTable(header)) {
        fail(index, "table header must carry Category and Location, or Pattern and Occurrences");
      } else if (counting && !SECTION_SEVERITY[sectionName]) {
        fail(index, "a summary table belongs in Medium Issues or Low Issues");
        counting = false;
      }
      continue;
    }
    if (lines[index].startsWith("|") && lines[index].endsWith("|")) {
      if (!counting) continue;
      const severity = SECTION_SEVERITY[sectionName];
      counts.set(severity, counts.get(severity) + 1);
      issueCount++;
    } else if (lines[index].trim()) counting = false;
  }
}

// ── architecture opportunities ──────────────────────────────────────────────
const architecture = sections.get("Architecture Opportunities");
let architectureEntries = 0;
let topRecommendations = 0;
if (architecture) {
  const headings = [];
  for (let index = architecture.start; index < architecture.end; index++) if (lines[index].startsWith("### ")) headings.push(index);
  if (!headings.length) fail(architecture.line, "Architecture Opportunities has no entries");
  for (let at = 0; at < headings.length; at++) {
    const index = headings[at];
    const end = headings[at + 1] ?? architecture.end;
    const heading = lines[index].match(headingPattern);
    if (!heading) { fail(index + 1, "architecture heading must end with an exact severity"); continue; }
    counts.set(heading[1], counts.get(heading[1]) + 1);
    issueCount++;
    architectureEntries++;
    const fields = new Map();
    for (let line = index + 1; line < end; line++) {
      const match = lines[line].match(/^- \*\*([^*]+):\*\* (.+)$/);
      if (!match) continue;
      if (fields.has(match[1])) fail(line + 1, `duplicate architecture field: ${match[1]}`);
      fields.set(match[1], { value: match[2], line: line + 1 });
    }
    for (const field of COMMON_ARCH_FIELDS) if (!fields.has(field)) fail(index + 1, `missing architecture field: ${field}`);
    const confidence = fields.get("Confidence");
    if (confidence && !["strong", "worth-exploring"].includes(confidence.value)) fail(confidence.line, `invalid Confidence: ${confidence.value}`);
    const change = fields.get("Change type");
    const conditional = change ? CONDITIONAL_ARCH_FIELDS[change.value] : null;
    if (change && !conditional) fail(change.line, `invalid Change type: ${change.value}`);
    for (const field of conditional ?? []) if (!fields.has(field)) fail(index + 1, `missing architecture field: ${field}`);
    const allowed = new Set([...COMMON_ARCH_FIELDS, ...(conditional ?? []), "Top recommendation"]);
    for (const [field, data] of fields) if (!allowed.has(field)) fail(data.line, `field does not apply to ${change?.value ?? "this change"}: ${field}`);
    const fixability = fields.get("Fixability");
    if (fixability && !["auto", "needs-confirm", "report-only"].includes(fixability.value)) fail(fixability.line, `invalid Fixability: ${fixability.value}`);
    if (change?.value === "enforce" && fixability?.value !== "report-only") fail(fixability?.line ?? index + 1, "enforce changes must be report-only");
    if (fields.has("Top recommendation")) topRecommendations++;
    const files = fields.get("Files");
    if (files) for (const file of files.value.split(",").map((item) => item.trim().replaceAll("`", ""))) checkRepoPath(file, files.line);
  }
  if (architectureEntries && topRecommendations !== 1) fail(architecture.line, "architecture findings require exactly one Top recommendation");
}

if (totalMatch) {
  const stated = totalMatch.slice(2).map(Number);
  if (Number(totalMatch[1]) !== issueCount) fail(totalLine + 1, `Total issues says ${totalMatch[1]}, found ${issueCount}`);
  SEVERITIES.forEach((severity, index) => {
    if (stated[index] !== counts.get(severity)) fail(totalLine + 1, `${severity} count says ${stated[index]}, found ${counts.get(severity)}`);
  });
}

// ── linked artifacts ────────────────────────────────────────────────────────
const reportDir = path.dirname(report);
for (let index = 0; index < lines.length; index++) {
  for (const match of lines[index].matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    let link;
    try { link = decodeURI(match[1].replace(/^<|>$/g, "")).split("#")[0]; }
    catch { fail(index + 1, `artifact link has invalid escaping: ${match[1]}`); continue; }
    if (/^(?:https?:|mailto:|#)/.test(link)) continue;
    if (!/\.(?:json|mmd|md|svg)$/i.test(link)) continue;
    const targets = [path.resolve(reportDir, link), path.resolve(repo, link)];
    const target = targets.find((candidate) => insideRepo(candidate) && existsSync(candidate));
    if (!target) fail(index + 1, `linked artifact does not exist: ${link}`);
    else if (path.extname(target) === ".json") {
      try { JSON.parse(readFileSync(target, "utf8")); } catch { fail(index + 1, `linked JSON is invalid: ${link}`); }
    }
  }
}

// ── architecture coverage ───────────────────────────────────────────────────
// The claim the report makes about how much of the tree was analysed is the one number a reader
// trusts when it says there are no cycles, so an overclaim is an error and everything else is not.
const coverageLine = lines.findIndex((line) => line.startsWith("**Architecture coverage:**"));
const coverage = lines[coverageLine]?.match(/^\*\*Architecture coverage:\*\* (\d+)\/(\d+)$/);
const architectureActive = coverageLine >= 0 || Boolean(architecture);
if (architectureActive) {
  if (!coverage) fail(coverageLine + 1 || 1, "Architecture coverage must have the shape successful/selected");
  const at = coverageLine + 1 || 1;
  const core = ["projects.json", "co-change.md", "cruise-summary.md", "metrics.md"];
  for (const artifact of core) if (!existsSync(path.join(reportDir, artifact))) warn(at, `missing architecture artifact: ${artifact}`);
  const graphDir = path.join(reportDir, "graphs");
  const graphFiles = existsSync(graphDir) && statSync(graphDir).isDirectory()
    ? readdirSync(graphDir).filter((file) => file.endsWith(".json")) : [];
  for (const file of graphFiles) {
    try { JSON.parse(readFileSync(path.join(graphDir, file), "utf8")); } catch { warn(at, `invalid graph JSON: graphs/${file}`); }
    const diagram = path.join(reportDir, "diagrams", `${path.basename(file, ".json")}.mmd`);
    if (!existsSync(diagram)) warn(at, `successful graph has no overview diagram: ${path.basename(diagram)}`);
  }
  const projectsPath = path.join(reportDir, "projects.json");
  if (coverage && existsSync(projectsPath)) {
    try {
      const discovery = JSON.parse(readFileSync(projectsPath, "utf8"));
      const projects = Array.isArray(discovery) ? discovery : discovery.projects;
      const [successful, selected] = coverage.slice(1).map(Number);
      if (!Array.isArray(projects)) fail(at, "projects.json must contain a projects array");
      else if (selected !== projects.length) fail(at, `Architecture coverage selects ${selected} of the ${projects.length} discovered projects`);
      if (successful > graphFiles.length) fail(at, `Architecture coverage claims ${successful} analysed project(s) over ${graphFiles.length} graph(s)`);
      else if (successful < graphFiles.length) warn(at, `Architecture coverage claims ${successful} analysed project(s) under ${graphFiles.length} graph(s)`);
    } catch { fail(at, "projects.json is invalid JSON"); }
  }
}

const display = path.relative(repo, report) || path.basename(report);
for (const warning of warnings) console.error(`${display}:${warning.line}: warning: ${warning.message}`);
if (errors.length) {
  for (const error of errors) console.error(`${display}:${error.line}: ${error.message}`);
  process.exitCode = 1;
} else {
  console.log(`Validated ${display}: ${issueCount} issue(s), ${warnings.length} warning(s).`);
}
