#!/usr/bin/env node
// Writes the pass queue and 1 prompt file per pass from the plan the main agent writes once
// (SKILL.md workflow step 29). The prompt is `subagent_template` of SKILL.md, filled, so the
// template keeps 1 source and the agent call carries 1 line. A queue already on disk keeps the
// status, attempts, and findings of every pass it holds: that is the resume.
//
//   node pass-prompts.mjs --plan code-smells/passes/plan.json
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SKILL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readSkill() {
  const text = readFileSync(path.join(SKILL, "SKILL.md"), "utf8");
  const template = text.match(/^subagent_template:\n```\n([\s\S]*?)\n```$/m)?.[1];
  if (!template) throw new Error("SKILL.md holds no subagent_template block");
  const refs = new Map();
  for (const [, domain, ref] of text.matchAll(/^\| ([A-Z][\w ]+) \| `(references\/[\w-]+\.md)` \|/gm)) refs.set(domain, ref);
  return { template, refs };
}

// The rows of a queue on disk, by pass id: `| id | domains | files | status | attempts | findings |`.
function readQueue(file) {
  const rows = new Map();
  if (!existsSync(file)) return rows;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const cells = line.split("|").slice(1, -1).map((c) => c.trim());
    if (cells.length === 6 && /^(pending|done|failed)$/.test(cells[3])) rows.set(cells[0], cells);
  }
  return rows;
}

const list = (items) => (items?.length ? items.map((f) => `\n- ${f}`).join("") : "none");

export function passPrompts(plan, root) {
  const { template, refs } = readSkill();
  const dir = path.join(root, "code-smells", "passes");
  const prompts = path.join(dir, "prompts");
  mkdirSync(prompts, { recursive: true });
  const old = readQueue(path.join(dir, "queue.md"));
  const rows = [];
  for (const pass of plan.passes) {
    // A pass file that already ends with its done line, as lint-skill's does, is done.
    const file = path.join(dir, `${pass.id}.jsonl`);
    const last = existsSync(file) ? readFileSync(file, "utf8").trim().split(/\r?\n/).at(-1) : "";
    let done = null;
    try { done = JSON.parse(last)?.done ? JSON.parse(last) : null; } catch { done = null; }
    const kept = old.get(pass.id) ?? (done ? [pass.id, "", "", "done", "1", String(done.findings ?? "")] : undefined);
    rows.push(`| ${pass.id} | ${pass.domains.join(", ")} | ${pass.files.length} | ${kept?.[3] ?? "pending"} | ${kept?.[4] ?? 0} | ${kept?.[5] ?? ""} |`);
    if (pass.id === "lint-skill") continue;
    const missing = pass.domains.filter((d) => !refs.has(d));
    if (missing.length) throw new Error(`${pass.id}: no reference file for ${missing.join(", ")}`);
    const filled = template
      .replaceAll("[DOMAINS]", pass.domains.join(", "))
      .replaceAll("[REFERENCE_PATHS]", pass.domains.map((d) => path.join(SKILL, refs.get(d)).replace(/\\/g, "/")).join(", "))
      .replaceAll("[STACK_COST_PATH]", path.join(SKILL, "references", "stack-cost.md").replace(/\\/g, "/"))
      .replaceAll("[SKILL_LINT_RAN]", plan.lint ? "yes" : "no")
      .replaceAll("[FILE_LIST]", list(pass.files))
      .replaceAll("[CONTEXT_FILE_LIST]", list(pass.context))
      .replaceAll("[full|uncommitted|branch|commits:N]", plan.scope)
      .replaceAll("[OUTPUT_PATH]", `code-smells/passes/${pass.id}.jsonl`);
    const head = `Project root: ${root.replace(/\\/g, "/")}. Every relative path below is relative to it.\nPass id: ${pass.id}\n\n`;
    writeFileSync(path.join(prompts, `${pass.id}.md`), head + filled + "\n");
  }
  writeFileSync(path.join(dir, "queue.md"), [
    "# Pass queue", "", `HEAD: ${plan.head}`, `Scope: ${plan.scope}`, `Agents per wave: ${plan.agents}`,
    `Lint: ${plan.lint ? "yes" : "no"}`, `Pass model: ${[plan.model ?? "default sub-agent", plan.effort].filter(Boolean).join(" ")}`, "",
    "| Pass | Domains | Files | Status | Attempts | Findings |", "|---|---|---|---|---|---|", ...rows, "",
  ].join("\n"));
  return rows.length;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const at = process.argv.indexOf("--plan");
  const planFile = at > 0 ? process.argv[at + 1] : undefined;
  if (!planFile) throw new Error("usage: pass-prompts.mjs --plan code-smells/passes/plan.json");
  const plan = JSON.parse(readFileSync(planFile, "utf8"));
  const root = path.resolve(path.dirname(planFile), "..", "..");
  const count = passPrompts(plan, root);
  console.log(`pass-prompts: ${count} passes in queue.md, prompts in code-smells/passes/prompts/`);
}
