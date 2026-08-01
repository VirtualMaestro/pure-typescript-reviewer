// How a tool run is read. Neither the exit code nor the green tick means what it looks like:
// Knip exits 1 with findings, dependency-cruiser exits 0 with violations, and a cruise that
// walked zero modules prints "no dependency violations found" over an empty graph.
export function classifyRun({ label = "", exitCode, stdout = "" }) {
  const text = String(stdout);
  const trimmed = text.trim();
  let parsed = null;
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try { parsed = JSON.parse(trimmed); } catch { parsed = undefined; }
  }
  const output = parsed !== null
    ? (parsed === undefined ? "invalid JSON" : "valid JSON")
    : (trimmed ? "text" : "empty");

  const cruised = /(\d+) modules(?:, (\d+) dependencies)? cruised/.exec(text);
  const zeroCruise = label.startsWith("depcruise")
    && ((cruised && cruised[1] === "0") || parsed?.summary?.totalCruised === 0);

  const reading = zeroCruise ? "failed: 0 modules cruised"
    : output === "empty" && exitCode !== 0 ? "failed"
    : exitCode === 0 && output !== "empty" ? "ok"
    : exitCode !== 0 && output !== "empty" ? "findings, not a failure"
    : "clean";

  return { output, reading };
}
