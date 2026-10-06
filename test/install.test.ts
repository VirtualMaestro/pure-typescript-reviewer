// The installer itself is tested in ts-ai-tool-template; this checks it ships this skill whole.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { runInstallerCommand } from "../src/installer/index.ts";
import { TOOL } from "../src/tool.ts";

test("a global install puts the whole skill in the user directories of both agents", async () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "ts-reviewer-"));
  const home = path.join(base, "home");
  const project = path.join(base, "project");
  fs.mkdirSync(home);
  fs.mkdirSync(project);
  const opts = { home, cwd: project, env: {}, interactive: false, log: () => {}, latestVersion: async () => undefined };

  const code = await runInstallerCommand("install", ["--global", "--agents", "claude-code,codex"], TOOL, opts);
  assert.equal(code, 0);
  for (const dir of [".claude/skills/ts-reviewer", ".agents/skills/ts-reviewer"]) {
    for (const file of ["SKILL.md", "references/type-safety.md", "tools/lint-pass.mjs"]) {
      assert.ok(fs.existsSync(path.join(home, dir, file)), `${dir}/${file}`);
    }
  }
  assert.deepEqual(fs.readdirSync(project), []);
  assert.equal(await runInstallerCommand("update", [], TOOL, opts), 0);
});
