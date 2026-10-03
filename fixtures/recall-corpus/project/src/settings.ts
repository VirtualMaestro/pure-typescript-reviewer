import type { Settings } from "./types.js";

export function toSettings(raw: Record<string, string>): Settings {
  return raw as unknown as Settings;
}
