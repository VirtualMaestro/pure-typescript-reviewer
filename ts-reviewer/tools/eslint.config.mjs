// The skill lint config, run with `eslint -c` from the project root through `npx`, so it lives
// outside the project: typescript-eslint is resolved next to the ESLint binary npx runs, and
// tsconfigRootDir is the cwd rather than this file's directory.
import { createRequire } from "node:module";
import { rules, testFiles, testOverrides } from "./lint-rules.mjs";

const tseslint = createRequire(process.argv[1])("typescript-eslint");

export default [
  {
    files: ["**/*.ts", "**/*.mts", "**/*.cts"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { projectService: true, tsconfigRootDir: process.cwd() },
    },
    plugins: { "@typescript-eslint": tseslint.plugin },
    linterOptions: { reportUnusedDisableDirectives: "off" },
    rules,
  },
  { files: testFiles, rules: testOverrides },
];
