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
      // Button design-system guardrails. See components/ui/button.tsx for the canonical API.
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXOpeningElement[name.name='button']",
          message:
            "Use the Button (or MenuItem) primitive from '@/components/ui/'. Raw <button> is forbidden in product UI. If this is a deliberate bespoke surface, add an eslint-disable-next-line comment explaining why.",
        },
        {
          selector:
            "JSXOpeningElement[name.name='Button'] JSXAttribute[name.name='className'] Literal[value=/(?:^|\\s)(?:h-(?:auto|\\[|[0-9])|min-h-(?:\\[|[0-9])|px-(?:\\[|[0-9])|py-(?:\\[|[0-9])|text-xs|text-\\[)/]",
          message:
            'Do not override h-*, min-h-*, px-*, py-*, text-xs, or text-[…] on Button via className. Extend the Button variant config in components/ui/button.tsx.',
        },
        {
          selector:
            "JSXOpeningElement[name.name='Button'] JSXAttribute[name.name='className'] TemplateElement[value.raw=/(?:^|\\s)(?:h-(?:auto|\\[|[0-9])|min-h-(?:\\[|[0-9])|px-(?:\\[|[0-9])|py-(?:\\[|[0-9])|text-xs|text-\\[)/]",
          message:
            'Do not override h-*, min-h-*, px-*, py-*, text-xs, or text-[…] on Button via className. Extend the Button variant config in components/ui/button.tsx.',
        },
      ],
    },
  },
  {
    // Primitives and emoji-picker host their own raw <button> elements by design.
    files: ['components/ui/**'],
    rules: {
      'no-restricted-syntax': 'off',
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
