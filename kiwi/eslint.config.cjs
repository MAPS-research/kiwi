const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const globals = require('globals');
const prettier = require('eslint-plugin-prettier/recommended');

module.exports = defineConfig([
  {
    ignores: ['node_modules/**', 'dist/**', 'coverage/**'],
  },
  {
    files: ['**/*.ts'],
    extends: [tseslint.configs.recommended, prettier],
    languageOptions: {
      globals: { ...globals.node, ...globals.jest },
    },
    rules: {
      // Preserve the previous preset's treatment of unused catch bindings.
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          caughtErrors: 'none',
          argsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      '@typescript-eslint/no-namespace': ['error', { allowDeclarations: true }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
]);
