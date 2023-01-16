module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    sourceType: 'module',
    extraFileExtensions: ['.json', '.yml', '.yaml'],
  },
  plugins: [
    'prettier',
    '@typescript-eslint/eslint-plugin',
    'eslint-plugin-tsdoc',
    'import',
    'jest',
  ],
  extends: [
    // Rules: https://github.com/eslint/eslint/blob/main/conf/eslint-recommended.js
    'eslint:recommended',
    // Options: https://prettier.io/docs/en/options.html
    'plugin:prettier/recommended',
    // Rules: https://github.com/typescript-eslint/typescript-eslint/tree/main/packages/eslint-plugin/src/configs
    'plugin:@typescript-eslint/recommended',
  ],
  root: true,
  env: {
    node: true,
    jest: true,
    es6: true,
  },
  ignorePatterns: [
    '.eslintrc.js',
    'package.json',
    'package-lock.json',
    'nest-cli.json',
    '*.md'
  ],
  rules: {
    // Turn off unused typescript checks
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off',

    // TSDoc rules
    'tsdoc/syntax': 'warn',

    // Jest rules
    'jest/no-disabled-tests': 'warn',
    'jest/no-focused-tests': 'error',
    'jest/no-identical-title': 'error',
    'jest/prefer-to-have-length': 'warn',
    'jest/valid-expect': 'error',

    // Import rules
    // Disallow non-import statements appearing before import statements.
    "import/first": "error",
    // Require a newline after the last import/require in a group.
    "import/newline-after-import": "error",
    // Disallows import of modules using absolute paths
    "import/no-absolute-path": "error",
    // Disallow AMD require/define
    "import/no-amd": "error",
    // Sort dependencies
    "import/order": [
      "error",
      {
        alphabetize: { order: "asc", caseInsensitive: true },
        groups: [
          ["builtin", "external"], // Built-in and external types first
          "internal", // Then internal types
          ["parent", "sibling", "index"], // Then sibiling, parent types and the index file
          "object", // Then object types
        ],
      },
    ],

    // Enforce a max length of 120 for a line
    'max-len': ['error', 120, 2, {
      ignoreUrls: true,
      ignoreComments: false,
      ignoreRegExpLiterals: true,
      ignoreStrings: true,
      ignoreTemplateLiterals: true,
    }],
    // Max allowed paths is 10
    'complexity': ['error', 10],
    // Require new line after var declaration
    'newline-after-var': ['error', 'always'],
    // Enforces no parens around arrow functions where they can be omitted
    'arrow-parens': ['error', 'as-needed'],
  },
};
