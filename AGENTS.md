# AGENTS.md

## Validation policy

Do not run syntax checks, linters, type checks, builds, formatters, or test commands after routine frontend changes.

This includes:
- CSS / SCSS / Tailwind
- Static HTML
- Basic client-side JavaScript
- JSX/TSX edits that are purely presentational
- Small UI, layout, copy, or styling changes

Only validate code when changing or creating:
- Server-side functions, API routes, backend services, middleware, database code, authentication, payment logic, or deployment configuration
- Complex client-side logic with nontrivial state, async flows, parsing, or data transformations
- Code explicitly requested by the user to be tested or checked

Prefer targeted validation over full-project checks. For example, check only the modified server function or relevant test suite.

Do not mention skipped frontend syntax checks unless asked.
