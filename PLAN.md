# React Compiler CI/CD Verification Action - Implementation Plan

## Overview

A GitHub Action that verifies if React components are being successfully processed by the React Compiler. It analyzes your codebase during CI/CD and reports which components are optimized vs which ones failed, with the ability to fail builds based on configurable thresholds.

## Core Concept

The action reuses the same detection mechanism as `react-compiler-marker`:
1. Parse React files using Babel
2. Run `babel-plugin-react-compiler` on the AST
3. Intercept logger events (CompileSuccess, CompileError, etc.)
4. Generate reports and optionally fail the build

---

## Project Structure

```
react-compiler-healthcheck/
├── src/
│   ├── index.ts              # Main entry point (GitHub Action)
│   ├── core/
│   │   ├── compiler.ts       # React Compiler detection logic (from react-compiler-marker)
│   │   ├── scanner.ts        # File discovery and filtering
│   │   └── types.ts          # TypeScript types/interfaces
│   ├── reporters/
│   │   ├── console.ts        # Terminal output formatter
│   │   ├── markdown.ts       # Markdown report for PR comments
│   │   └── annotations.ts    # GitHub annotations (inline PR comments)
│   └── utils/
│       └── git.ts            # Git diff utilities (for changed-files-only mode)
├── action.yml                # GitHub Action definition
├── package.json
├── tsconfig.json
└── README.md
```

---

## Implementation Steps

### Phase 1: Core Detection Engine

**Step 1.1: Project Setup**
- Initialize npm package with TypeScript
- Set up build tooling (esbuild or tsup for bundling)
- Configure ESLint and Prettier
- Add dependencies:
  - `react` ^19.2 (peer dependency for babel-plugin-react-compiler)
  - `@babel/core`
  - `@babel/parser`
  - `@babel/preset-typescript`
  - `babel-plugin-react-compiler`
  - `@actions/core` (GitHub Action utilities)
  - `@actions/github` (GitHub API client)
  - `glob` (file pattern matching)

**Step 1.2: Compiler Detection Module**
- Port core detection logic from `react-compiler-marker/packages/server/src/checkReactCompiler.ts`
- Adapt for batch processing (multiple files)
- Remove IDE-specific code (debouncing, caching for real-time)
- Keep the logger event interception pattern

**Step 1.3: File Scanner**
- Implement glob-based file discovery
- Support include/exclude patterns
- Support `.jsx`, `.tsx`, `.js`, `.ts` files
- Add "changed files only" mode using git diff

### Phase 2: Reporting System

**Step 2.1: Console Reporter**
- Summary table with pass/fail counts
- Detailed error list with file:line locations
- Color-coded output for terminals
- Progress indicator for large codebases

**Step 2.2: Markdown Reporter**
- Formatted summary for PR comments
- Collapsible sections for errors
- Links to file locations in the repo

**Step 2.3: GitHub Annotations**
- Inline annotations on PR diffs
- Show errors directly on the problematic lines
- Use `@actions/core` annotation API

### Phase 3: GitHub Action Integration

**Step 3.1: Action Definition (action.yml)**
```yaml
name: 'React Compiler Healthcheck'
description: 'Verify React components are optimized by React Compiler'
inputs:
  include:
    description: 'Glob patterns for files to check'
    default: 'src/**/*.{jsx,tsx}'
  exclude:
    description: 'Glob patterns to exclude'
    default: '**/*.test.{jsx,tsx},**/*.spec.{jsx,tsx}'
  fail-on-error:
    description: 'Fail the action if any component fails compilation'
    default: 'true'
  fail-threshold:
    description: 'Fail if error percentage exceeds this (0-100)'
    default: '0'
  changed-only:
    description: 'Only check files changed in the PR'
    default: 'false'
  comment-on-pr:
    description: 'Post results as a PR comment'
    default: 'true'
  annotations:
    description: 'Add inline annotations to PR'
    default: 'true'
outputs:
  total:
    description: 'Total components analyzed'
  passed:
    description: 'Components successfully compiled'
  failed:
    description: 'Components that failed compilation'
  report:
    description: 'JSON report of all results'
```

**Step 3.2: Main Action Logic**
- Parse inputs from action context
- Run scanner and compiler
- Generate reports
- Set outputs and annotations
- Post PR comment if configured
- Exit with appropriate code

### Phase 4: Polish and Publishing

**Step 4.1: Documentation**
- Comprehensive README with examples
- Configuration reference
- Troubleshooting guide

**Step 4.2: Testing**
- Unit tests for compiler detection
- Integration tests with sample React files

**Step 4.3: Publishing**
- Publish to GitHub Marketplace as an Action

---

## Usage Examples

### Basic GitHub Action Usage
```yaml
name: React Compiler Check
on: [pull_request]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - uses: your-username/react-compiler-healthcheck@v1
        with:
          include: 'src/**/*.tsx'
          fail-on-error: true
          comment-on-pr: true
```

### Check Only Changed Files
```yaml
- uses: your-username/react-compiler-healthcheck@v1
  with:
    changed-only: true
    annotations: true
```

### Soft Failure Mode (Warning Only)
```yaml
- uses: your-username/react-compiler-healthcheck@v1
  with:
    fail-on-error: false
    fail-threshold: 50  # Only fail if >50% of components fail
```

---

## Technical Considerations

### Handling Different Project Setups
- Auto-detect babel config from project
- Support custom `babel-plugin-react-compiler` path
- Handle monorepos with multiple packages

### Performance
- Parallel file processing
- Early exit on first error (optional)
- Progress reporting for large codebases

### Error Messages
- Clear, actionable error messages
- Link to React Compiler documentation
- Suggestions for common issues (from react-compiler-marker patterns)

---

## Key Files to Port from react-compiler-marker

1. **`checkReactCompiler.ts`** - Core detection logic
   - Logger event interception
   - Babel plugin execution
   - Result collection

2. **`inlayHints.ts`** - Error message formatting (partial)
   - Error tooltip generation
   - Location formatting

3. **Types from the React Compiler plugin**
   - LoggerEvent types
   - Compilation result types

---

## Success Metrics

The action should provide:
- Clear pass/fail status in GitHub checks
- Detailed breakdown of which components passed/failed
- Actionable error messages with file locations
- Easy integration (< 5 min setup)
- Fast execution (< 30s for typical projects)
