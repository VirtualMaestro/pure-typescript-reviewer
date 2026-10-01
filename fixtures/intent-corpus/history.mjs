// The commit history of the intent corpus, oldest first. `prepare.mjs` replays it so that
// `git log -L` on a planted line returns the planted message. Each file enters in exactly 1
// commit, so the commit that introduced a line is the commit that added its file.
export const history = [
  { message: "chore: scaffold the package", files: ["package.json", "package-lock.json", "tsconfig.json", ".gitignore"] },
  { message: "add the layers module", files: ["src/layers.ts"] },
  { message: "docs: record why layers sort in place", files: ["docs/adr/0002-layers-sort-in-place.md"] },
  // Case 2: the message names the flagged behaviour, the in-place update.
  { message: "integrate advances each body in place: the step loop owns the bodies and reuses them every frame", files: ["src/physics.ts"] },
  { message: "add the report renderer", files: ["src/report.ts", "src/report.test.ts"] },
  // Case 4: the message claims intent, and the test read before it says otherwise.
  { message: "cast the config: the deploy tool validates it", files: ["src/config.ts"] },
  { message: "test the config loader", files: ["src/config.test.ts"] },
  { message: "add id helpers", files: ["src/ids.ts"] },
  // Case 6: a message that names nothing.
  { message: "wip", files: ["src/legacy.ts"] },
  { message: "add the eviction helper", files: ["src/cache.ts"] },
  { message: "export the public api", files: ["src/index.ts"] },
];
