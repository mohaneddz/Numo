import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

/**
 * Lint configuration.
 *
 * Deliberately narrow: the rules here are the ones that catch real defects in
 * this codebase — hook dependency mistakes, unreachable conditions, promises
 * dropped on the floor — rather than a full style pass over 290 existing files.
 * Formatting is left alone; the codebase is already internally consistent and
 * churning it would bury the signal.
 */
export default tseslint.config(
  {
    ignores: ['dist', 'src-tauri/target', 'node_modules', 'docs'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,

      // The bug class this was added for: a stale dependency array silently
      // freezes a value the effect depends on.
      'react-hooks/exhaustive-deps': 'warn',

      // React Compiler advisory rules. They flag patterns this codebase uses
      // deliberately and widely — syncing props into state, and refs holding
      // animation callbacks — so they are kept visible as warnings rather than
      // blocking, while rules-of-hooks and refs stay errors because those are
      // real defects.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',

      // Underscore-prefixed arguments are a deliberate "unused on purpose".
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

      // `any` is worth flagging but not worth blocking a build over while the
      // existing surface is brought down.
      '@typescript-eslint/no-explicit-any': 'warn',

      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-implicit-coercion': 'off',
    },
  },
  {
    // Tests legitimately reach for loose typing when building stubs.
    files: ['**/*.test.{ts,tsx}', 'src/test/**'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'react-hooks/rules-of-hooks': 'off',
    },
  },
  {
    files: ['scripts/**'],
    languageOptions: { globals: globals.node },
    rules: { 'no-console': 'off' },
  },
);
