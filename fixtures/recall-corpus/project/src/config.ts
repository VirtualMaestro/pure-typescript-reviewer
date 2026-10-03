import type { Settings } from "./types.js";

function isSettings(value: unknown): value is Settings {
  return (
    typeof value === "object" &&
    value !== null &&
    "region" in value &&
    typeof value.region === "string" &&
    "retries" in value &&
    typeof value.retries === "number"
  );
}

export function loadSettings(text: string): Settings {
  const data: unknown = JSON.parse(text);
  if (!isSettings(data)) {
    throw new TypeError("settings: expected { region: string, retries: number }");
  }
  return data;
}
