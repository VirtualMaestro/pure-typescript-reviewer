import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

import { listSkillAssetTemplates } from "./paths.js";
import { ensureDir, atomicWriteFile } from "./io.js";

export type ScaffoldAction = "WROTE" | "UPDATED";

export type ScaffoldEntry = {
  action: ScaffoldAction;
  relativePath: string;
};

export type ScaffoldResult = {
  entries: ScaffoldEntry[];
};

export async function scaffoldTsReviewerSkill(opts: { cwd: string; skillName: string; targetDir: string }): Promise<ScaffoldResult> {
  const { cwd, skillName, targetDir } = opts;
  await ensureDir(targetDir);

  // Provenance file written by <=2.0.0, when the installer tracked hashes to avoid
  // overwriting local edits. Skill files are generated, so they are always replaced now.
  await fs.rm(path.join(targetDir, ".scaffold-meta.json"), { force: true });

  const entries: ScaffoldEntry[] = [];

  for (const t of listSkillAssetTemplates(skillName)) {
    const dstPath = path.join(targetDir, t.fileName);
    const action: ScaffoldAction = existsSync(dstPath) ? "UPDATED" : "WROTE";

    await atomicWriteFile(dstPath, t.content);

    entries.push({
      action,
      relativePath: path.relative(cwd, dstPath).replace(/\\/g, "/"),
    });
  }

  return { entries };
}
