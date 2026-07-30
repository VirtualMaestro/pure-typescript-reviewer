#!/usr/bin/env node

import { scaffoldTsReviewerSkill } from "./index.js";
import { multiSelect } from "./prompt.js";
import { AI_PROVIDERS, skillTargetDir, type AiProvider } from "./paths.js";

const SKILL_NAME = "ts-reviewer";
const TARGET_STACK = "TypeScript 5.9.x, ES2024, Node 24";

function printHelp() {
  process.stdout.write(
    [
      "ts-reviewer: install TypeScript review skill\n",
      "\n",
      "Usage:\n",
      "  npx ts-reviewer\n",
      "\n",
      "Options:\n",
      "  -h, --help      show help\n",
    ].join("")
  );
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("-h") || args.includes("--help")) {
    printHelp();
    return;
  }

  const cwd = process.cwd();
  const skillName = SKILL_NAME;

  process.stdout.write(
    [
      "TypeScript Code Reviewer\n",
      `Checks: type safety, security, async patterns, boundary validation, error handling, modernization, code quality, tsconfig, dependency hygiene\n`,
      `Target stack: ${TARGET_STACK}\n`,
      "\n",
    ].join("")
  );

  const selected = await multiSelect(
    "Install for which AI agents? (Space = toggle, Enter = confirm)",
    AI_PROVIDERS
  );

  if (selected.length === 0) {
    process.stdout.write("No agents selected. Exiting.\n");
    return;
  }

  for (const provider of selected as AiProvider[]) {
    const targetDir = skillTargetDir(cwd, provider, skillName);
    const providerLabel = AI_PROVIDERS.find((p) => p.value === provider)!.label;

    process.stdout.write(`\n[${providerLabel}]\n`);

    const result = await scaffoldTsReviewerSkill({ cwd, skillName, targetDir });

    for (const e of result.entries) {
      process.stdout.write(`${e.action}\t${e.relativePath}\n`);
    }
  }
}

main().catch((err) => {
  process.stderr.write((err as Error)?.stack ? String((err as Error).stack) : String(err));
  process.stderr.write("\n");
  process.exitCode = 1;
});
