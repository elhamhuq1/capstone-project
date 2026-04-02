# Testing Patterns

**Analysis Date:** 2026-04-02

## Test Framework

**Runner:**
- None installed. No test framework is present in `package.json` (neither Jest, Vitest, Playwright, Cypress, nor any other test runner appears in `dependencies` or `devDependencies`).

**Assertion Library:**
- Not applicable.

**Run Commands:**
- No test script defined in `package.json`. The `scripts` block contains only: `dev`, `build`, `start`, `lint`.

## Test File Organization

**Location:**
- No test files exist in the codebase. A search for `*.test.*` and `*.spec.*` files returns zero results across all of `src/`.

**Naming:**
- Not applicable — no test files present.

**Structure:**
- Not applicable.

## Test Structure

No test suites exist in the codebase. The project has no automated test coverage of any kind.

## Mocking

**Framework:** None.

No mocking infrastructure exists.

## Fixtures and Factories

**Test Data:**
- No test fixtures or factory functions exist.
- The closest equivalent is the static `WRITING_SAMPLES` array in `src/lib/samples.ts`, which is seeded into the database on first registration. This is production seed data, not test data.

**Location:**
- Not applicable.

## Coverage

**Requirements:** None enforced.

No coverage tooling, no coverage thresholds, no `.nycrc` or coverage config of any kind.

## Test Types

**Unit Tests:**
- Not present.

**Integration Tests:**
- Not present. Manual verification scripts in `scripts/` (`verify-s02.sh`, `verify-s03.sh`, `verify-s04.sh`, `verify-s05.sh`) suggest a manual QA workflow was used during development, but these are shell scripts for human-driven verification, not automated tests.

**E2E Tests:**
- Not present.

## Manual Verification Scripts

The `scripts/` directory contains shell scripts that appear to be used for manual smoke testing during development:

- `scripts/verify-s02.sh`
- `scripts/verify-s03.sh`
- `scripts/verify-s04.sh`
- `scripts/verify-s05.sh`
- `scripts/backfill-final-submissions.js` — a one-time data migration script, not a test

These scripts are not automated and have no assertions; they are exploratory/verification tools only.

## Logic Suitable for Unit Testing

The following pure or near-pure functions in the codebase have no side effects and would be straightforward to unit test if a framework were added:

**`src/lib/db/queries.ts`:**
- `computeDiff(original, final)` — word-level LCS diff algorithm, fully pure, no I/O

**`src/app/api/register/route.ts`:**
- `shuffledSampleOrder()` — Fisher-Yates shuffle of `[1, 2, 3]`
- `pickGroupRoundRobin(totalSessions)` — modulo group selection

**`src/lib/survey.ts`:**
- `SURVEY_QUESTIONS` structure validation

**`src/lib/gemini.ts`:**
- `chatWithGemini` — testable with a mocked `GoogleGenerativeAI` client

## Adding Tests

To add automated tests to this project, the recommended path is:

1. Install Vitest (compatible with Next.js without ejecting):
   ```bash
   npm install -D vitest @vitejs/plugin-react
   ```

2. Add a `vitest.config.ts` at the project root.

3. Add a `test` script to `package.json`:
   ```json
   "test": "vitest run",
   "test:watch": "vitest"
   ```

4. Place test files co-located with source files using the `.test.ts` / `.test.tsx` suffix pattern, e.g., `src/lib/db/queries.test.ts`.

5. Start with unit tests for `computeDiff` in `src/lib/db/queries.ts` — the highest-complexity pure function with zero dependencies.

---

*Testing analysis: 2026-04-02*
