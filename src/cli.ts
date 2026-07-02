#!/usr/bin/env node

import { scaffoldTsReviewerSkill } from "./index";
import { multiSelect } from "./prompt";
import { AI_PROVIDERS, skillTargetDir, type AiProvider } from "./paths";

const SKILL_NAME = "ts-reviewer";
const TYPESCRIPT_VERSION = "5.9+";

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
      `Target TypeScript: ${TYPESCRIPT_VERSION}\n`,
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
      const suffix = e.detail ? ` (${e.detail})` : "";
      process.stdout.write(`${e.action}\t${e.relativePath}${suffix}\n`);
    }

    if (result.hadConflicts) process.exitCode = 2;
  }
}

main().catch((err) => {
  process.stderr.write((err as Error)?.stack ? String((err as Error).stack) : String(err));
  process.stderr.write("\n");
  process.exitCode = 1;
});
