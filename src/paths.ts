import fs from "node:fs";
import path from "node:path";

export type AiProvider = "claude-code" | "codex" | "antigravity";

export const AI_PROVIDERS: { label: string; value: AiProvider }[] = [
  { label: "Claude Code", value: "claude-code" },
  { label: "Codex", value: "codex" },
  { label: "Antigravity", value: "antigravity" },
];

const PROVIDER_BASE: Record<AiProvider, string> = {
  "claude-code": ".claude",
  "codex": ".codex",
  "antigravity": ".agent",
};

export function skillTargetDir(projectRoot: string, provider: AiProvider, skillName: string): string {
  return path.join(projectRoot, PROVIDER_BASE[provider], "skills", skillName);
}

export type AssetTemplate = { fileName: string; content: string };

function packageRootDir(): string {
  // dist/* at runtime; src/* in dev. In both cases, package root is one level up.
  return path.resolve(__dirname, "..");
}

export function skillAssetsDir(skillName: string): string {
  return path.join(packageRootDir(), skillName);
}

function readAsset(skillName: string, fileName: string): string {
  const p = path.join(skillAssetsDir(skillName), fileName);
  return fs.readFileSync(p, "utf8");
}

function walkAssetFiles(rootDir: string, currentDir = rootDir): string[] {
  const entries = fs.readdirSync(currentDir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const absolutePath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkAssetFiles(rootDir, absolutePath));
      continue;
    }

    if (entry.isFile()) {
      files.push(path.relative(rootDir, absolutePath).replace(/\\/g, "/"));
    }
  }

  return files.sort();
}

export function listSkillAssetTemplates(skillName: string): AssetTemplate[] {
  return walkAssetFiles(skillAssetsDir(skillName)).map((fileName) => ({
    fileName,
    content: readAsset(skillName, fileName),
  }));
}
