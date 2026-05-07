import nextConfig from 'eslint-config-next'
import tseslint from 'typescript-eslint'

export default [
  ...nextConfig,
  {
    plugins: { '@typescript-eslint': tseslint.plugin },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'react/react-in-jsx-scope': 'off',
      // Pre-existing pattern throughout the codebase: syncing props to state in effects.
      // Downgraded from error to warn — address incrementally.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
  {
    files: ['tests/**/*.ts', 'tests/**/*.tsx', '**/*.test.ts', '**/*.test.tsx'],
    plugins: { '@typescript-eslint': tseslint.plugin },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    // Playwright fixtures use `use()` as a fixture callback, not React's use() hook.
    files: ['tests/e2e/**'],
    rules: {
      'react-hooks/rules-of-hooks': 'off',
    },
  },
  {
    ignores: ['.next/**', 'node_modules/**', 'types/supabase.ts', 'public/sw.js'],
  },
]
