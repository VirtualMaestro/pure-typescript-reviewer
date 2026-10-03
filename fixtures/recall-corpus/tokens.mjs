#!/usr/bin/env node
// Sums the tokens of 1 corpus run from Claude Code sub-agent transcripts: the run agent and every
// agent it started, found by the spawn's tool-use id in the parent transcript. Prints 1 line per
// agent and a total, split into fresh input, cache write, cache read, output, and thinking.
//
//   node fixtures/recall-corpus/tokens.mjs <session dir>/subagents <run agent id>
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const [dir, runId] = process.argv.slice(2);
if (!dir || !runId) throw new Error("usage: tokens.mjs <subagents dir> <run agent id>");

const read = (file) => readFileSync(path.join(dir, file), "utf8");
const metas = new Map(
  readdirSync(dir)
    .filter((f) => f.endsWith(".meta.json"))
    .map((f) => [f.slice("agent-".length, -".meta.json".length), JSON.parse(read(f))]),
);

function usage(id) {
  // A streamed message is written as several entries with 1 id; the last carries the final count.
  const last = new Map();
  for (const line of read(`agent-${id}.jsonl`).split("\n")) {
    if (!line) continue;
    const entry = JSON.parse(line);
    if (entry.type === "assistant" && entry.message?.usage) last.set(entry.message.id, entry);
  }
  const sum = { model: "", effort: "", input: 0, cacheWrite: 0, cacheRead: 0, output: 0, thinking: 0 };
  for (const { message, effort } of last.values()) {
    const u = message.usage;
    sum.model ||= message.model;
    sum.effort ||= effort ?? "";
    sum.input += u.input_tokens ?? 0;
    sum.cacheWrite += u.cache_creation_input_tokens ?? 0;
    sum.cacheRead += u.cache_read_input_tokens ?? 0;
    sum.output += u.output_tokens ?? 0;
    sum.thinking += u.output_tokens_details?.thinking_tokens ?? 0;
  }
  return sum;
}

function children(id) {
  const text = read(`agent-${id}.jsonl`);
  return [...metas].filter(([, m]) => m.toolUseId && text.includes(m.toolUseId)).map(([child]) => child);
}

if (!existsSync(path.join(dir, `agent-${runId}.jsonl`))) throw new Error(`no transcript for ${runId} in ${dir}`);
const rows = [];
const walk = (id, depth) => {
  rows.push({ id, depth, description: metas.get(id)?.description ?? "", ...usage(id) });
  for (const child of children(id)) walk(child, depth + 1);
};
walk(runId, 0);

const fields = ["input", "cacheWrite", "cacheRead", "output", "thinking"];
const total = Object.fromEntries(fields.map((f) => [f, rows.reduce((n, r) => n + r[f], 0)]));
for (const r of rows) {
  console.log(`${"  ".repeat(r.depth)}${r.id} ${r.model} ${r.effort} "${r.description}" ` + fields.map((f) => `${f}=${r[f]}`).join(" "));
}
console.log(`total agents=${rows.length} ` + fields.map((f) => `${f}=${total[f]}`).join(" "));
