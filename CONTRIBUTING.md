# Contributing

## Linting & Code Quality

Run `pnpm lint` before opening a PR. The pre-commit hook (husky + lint-staged) runs Prettier and ESLint automatically on staged files.

### Accessibility (jsx-a11y)

All JSX is linted with `eslint-plugin-jsx-a11y` (full recommended ruleset). New components must pass a11y rules without suppression unless there is a deliberate pattern.

**Common rules to watch:**

| Rule                                              | What it catches                                     | When to suppress                                                                                                                  |
| ------------------------------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `jsx-a11y/no-autofocus`                           | `autoFocus` prop                                    | Dialogs and inline-edit forms — moving focus on open is correct a11y. Suppress with an inline `eslint-disable-next-line` comment. |
| `jsx-a11y/no-noninteractive-element-interactions` | Click/keyboard handlers on non-interactive elements | Composite keyboard-navigable widgets. Use `eslint-disable-next-line` with a one-line explanation.                                 |
| `jsx-a11y/no-noninteractive-tabindex`             | `tabIndex ≥ 0` on non-interactive ARIA roles        | Same as above — composite widget pattern.                                                                                         |
| `jsx-a11y/click-events-have-key-events`           | `onClick` without a keyboard handler                | Almost never suppress — fix by using a native button/link or adding `onKeyDown` + appropriate `role`.                             |
| `jsx-a11y/no-static-element-interactions`         | Event handlers on elements with no ARIA role        | Almost never suppress — use a native interactive element.                                                                         |

**Suppression template:**

```tsx
// Reason: <one-line explanation of the deliberate pattern>
// eslint-disable-next-line jsx-a11y/<rule-name>
<div role="group" tabIndex={0} onKeyDown={handler}>
```

### React Hooks (exhaustive-deps)

`react-hooks/exhaustive-deps` runs at `warn` level. Each warning should be inspected:

- Missing dep that causes stale closure → add it to the array.
- Missing dep that would cause an infinite loop → restructure with `useRef` or `useCallback`.
- Intentional omission (e.g., stable server action reference) → add `// eslint-disable-next-line` with a comment.
