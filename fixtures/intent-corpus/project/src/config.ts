export type Config = { host: string; port: number };

/** Reads the service configuration from the text of its JSON file. */
export function loadConfig(text: string): Config {
  return JSON.parse(text) as Config;
}
