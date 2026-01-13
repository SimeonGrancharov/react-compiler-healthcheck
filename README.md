# React Compiler Healthcheck

A GitHub Action that verifies your React components are optimized by [React Compiler](https://react.dev/learn/react-compiler). Get instant feedback on which components can be automatically optimized and which need attention.

## Features

- Scans your codebase for React components
- Reports which components pass/fail React Compiler optimization
- Configurable thresholds and failure modes
- Works with monorepos (pnpm, npm, yarn)

## Usage

```yaml
name: React Compiler Healthcheck

on:
  pull_request:
    branches: [main]

jobs:
  healthcheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: React Compiler Healthcheck
        uses: SimeonGrancharov/react-compiler-healthcheck@v1
        with:
          include: 'src/**/*.tsx,src/**/*.jsx'
          exclude: '**/node_modules/**,**/__tests__/**'
          fail-on-error: 'false'
```

## Inputs

| Input | Description | Default |
|-------|-------------|---------|
| `include` | Glob patterns for files to check (comma-separated) | `**/*.jsx,**/*.tsx` |
| `exclude` | Glob patterns to exclude (comma-separated) | `**/node_modules/**,**/*.test.*,**/__tests__/**` |
| `fail-on-error` | Fail the action if any component fails compilation | `true` |
| `fail-threshold` | Fail if error percentage exceeds this value (0-100) | `0` |
| `working-directory` | Working directory for the action | `.` |

## Outputs

| Output | Description |
|--------|-------------|
| `total-files` | Total files scanned |
| `total-components` | Total components analyzed |
| `passed` | Components successfully compiled |
| `failed` | Components that failed compilation |
| `pass-rate` | Percentage of components that passed |
| `success` | Whether the healthcheck passed |

## Requirements

Your project must have `babel-plugin-react-compiler` installed:

```bash
npm install babel-plugin-react-compiler
# or
pnpm add babel-plugin-react-compiler
```

The action uses your project's installed version to ensure consistent results.

## Common Failure Reasons

Components may fail React Compiler optimization for various reasons:

- **Ref access during render** - Accessing `.current` in render phase
- **Manual memoization conflicts** - Existing `useMemo`/`useCallback` that can't be preserved
- **Dependency mismatches** - Manual deps don't match inferred ones
- **try/catch limitations** - Conditional logic in try/catch blocks

## License

MIT
