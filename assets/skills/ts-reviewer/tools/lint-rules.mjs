// The rules of the skill lint, as plain data. A reference line carrying "lint-owned by" names the
// rule, and the id after a colon, that finds its pattern; this file holds only the options.
// `ts/` in a reference line stands for `@typescript-eslint/`. tools.test.mjs holds the 2 in step.
import { builtinModules } from "node:module";

// A no-restricted-syntax message is the id a reference line names.
const syntax = (id, ...selectors) => selectors.map((selector) => ({ selector, message: id }));

export const rules = {
  "no-restricted-syntax": [
    "error",
    ...syntax("double-cast", "TSAsExpression > TSAsExpression.expression[typeAnnotation.type=/^TS(Unknown|Any)Keyword$/]"),
    ...syntax("any-default", "TSTypeParameter > TSAnyKeyword.default"),
    ...syntax("timer-no-id", "ExpressionStatement > CallExpression[callee.name=/^set(Timeout|Interval)$/]"),
    ...syntax("enum", "TSEnumDeclaration"),
    ...syntax(
      "ts-commonjs",
      "TSImportEqualsDeclaration[moduleReference.type='TSExternalModuleReference']",
      "TSExportAssignment",
    ),
    ...syntax(
      "json-clone",
      "CallExpression[callee.object.name='JSON'][callee.property.name='parse'] > CallExpression.arguments[callee.object.name='JSON'][callee.property.name='stringify']",
    ),
    ...syntax("module-exports", "MemberExpression[object.name='module'][property.name='exports']"),
    ...syntax("builtin-utility-type", "TSTypeAliasDeclaration[id.name=/^(Awaited|NoInfer)$/]"),
    ...syntax("only-skip", "MemberExpression[object.name=/^(describe|it|test)$/][property.name=/^(only|skip)$/]"),
    ...syntax("export-mutable", "ExportNamedDeclaration > VariableDeclaration[kind=/^(let|var)$/]"),
    ...syntax("try-whole-body", ":function > BlockStatement.body > TryStatement:first-child:last-child"),
    ...syntax(
      "dom-sink",
      "AssignmentExpression[left.property.name=/^(innerHTML|outerHTML)$/][right.type!='Literal']",
      "CallExpression[callee.property.name='insertAdjacentHTML']",
      "CallExpression[callee.object.name='document'][callee.property.name='write']",
    ),
    ...syntax(
      "env-cast",
      ":matches(TSNonNullExpression, TSAsExpression) > MemberExpression.expression[object.object.name='process'][object.property.name='env']",
    ),
  ],
  "no-restricted-imports": [
    "error",
    {
      paths: builtinModules.filter((name) => !name.startsWith("_")).map((name) => ({ name, message: "builtin" })),
      patterns: [{ regex: "^(\\.\\./){3}", message: "deep-relative" }],
    },
  ],
  "@typescript-eslint/ban-ts-comment": [
    "error",
    { "ts-ignore": "allow-with-description", "ts-expect-error": false, "ts-nocheck": false, "ts-check": false },
  ],
  "@typescript-eslint/no-explicit-any": "error",
  "@typescript-eslint/no-unsafe-function-type": "error",
  "@typescript-eslint/no-restricted-types": ["error", { types: { object: { message: "object-type" } } }],
  "@typescript-eslint/no-empty-object-type": ["error", { allowInterfaces: "always" }],
  "@typescript-eslint/no-wrapper-object-types": "error",
  "@typescript-eslint/no-unnecessary-type-assertion": "error",
  "@typescript-eslint/no-unnecessary-type-parameters": "error",
  "@typescript-eslint/explicit-module-boundary-types": "error",
  "@typescript-eslint/no-floating-promises": "error",
  "@typescript-eslint/no-misused-promises": "error",
  "@typescript-eslint/return-await": ["error", "in-try-catch"],
  "require-yield": "error",
  "no-empty": "error",
  "@typescript-eslint/only-throw-error": "error",
  "preserve-caught-error": "error",
  "@typescript-eslint/parameter-properties": "error",
  "@typescript-eslint/consistent-type-assertions": ["error", { assertionStyle: "as", objectLiteralTypeAssertions: "never" }],
  "@typescript-eslint/prefer-optional-chain": "error",
  "@typescript-eslint/prefer-nullish-coalescing": "error",
  "logical-assignment-operators": ["error", "always", { enforceForIfStatements: true }],
  "@typescript-eslint/no-require-imports": "error",
  "prefer-object-has-own": "error",
  "max-lines-per-function": ["error", { max: 50 }],
  complexity: ["error", 10],
  "@typescript-eslint/max-params": ["error", { max: 4 }],
  "no-unreachable": "error",
  "@typescript-eslint/no-unused-private-class-members": "error",
  "no-debugger": "error",
  "prefer-const": "error",
  "@typescript-eslint/prefer-for-of": "error",
  "@typescript-eslint/prefer-includes": "error",
  "no-warning-comments": ["error", { terms: ["todo", "fixme", "hack"], location: "anywhere" }],
  "no-eval": "error",
  "no-new-func": "error",
  "@typescript-eslint/no-implied-eval": "error",
};

// A test suite is 1 long callback by design: length and complexity are checked on the code under test only.
export const testFiles = ["**/*.test.*", "**/*.spec.*", "**/test/**", "**/tests/**", "**/__tests__/**"];
export const testOverrides = { "max-lines-per-function": "off", complexity: "off" };
