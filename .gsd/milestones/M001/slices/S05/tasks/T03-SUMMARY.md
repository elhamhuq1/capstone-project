---
id: T03
parent: S05
milestone: M001
provides:
  - scripts/verify-s05.sh — idempotent verification script with 12 checks covering researcher API + CSV export
key_files:
  - scripts/verify-s05.sh
key_decisions:
  - Accepted balanced group assignment rather than force-assigning groups (registration API doesn't support forced assignment); script validates whatever groups are assigned
patterns_established:
  - Verification script follows verify-s04.sh pattern: unique suffix via timestamp+PID, pass/fail counters, dbquery helper, full 3-sample flow seeding
observability_surfaces:
  - bash scripts/verify-s05.sh — 12 pass/fail checks with exit code 0/1
duration: 15m
verification_result: passed
completed_at: 2026-03-17
blocker_discovered: false
---

# T03: Write verification script and validate requirements

**Added scripts/verify-s05.sh with 12 automated checks proving R011 (researcher dashboard) and R012 (CSV export) — all passing, idempotent across multiple runs**

## What Happened

Created `scripts/verify-s05.sh` following the established verify-s04.sh pattern. The script:

1. Seeds 3 test participants with unique emails (timestamp+PID suffix), runs each through the full 3-sample flow (register → begin → timing/revision/survey/advance ×3)
2. Validates session list API (≥3 sessions, group filtering, expected fields)
3. Validates session detail API (200 for real session, per-sample data arrays, 404 for nonexistent)
4. Validates CSV export (Content-Type, Content-Disposition, column headers, ≥9 data rows, numeric survey ratings)
5. Runs `npm run build` as final type-check

All 12 checks pass on first run and on repeated runs (idempotency confirmed).

## Verification

- `bash scripts/verify-s05.sh` — **12/12 passed** on first run
- Second run — **12/12 passed** (different session IDs, different group assignments, confirming idempotency)
- `npm run build` — exits 0 (included as check 12)

Slice-level verification status (all tasks complete):
- ✅ `npm run build` passes
- ✅ Seeds 3 participants through full flow
- ✅ GET `/api/researcher/sessions` returns sessions with correct structure
- ✅ GET `/api/researcher/sessions?group=X` filters correctly
- ✅ GET `/api/researcher/sessions/[id]` returns full detail with prompts, revisions, surveys, timings
- ✅ GET `/api/researcher/export` returns CSV with correct headers
- ✅ CSV has expected column headers
- ✅ CSV has ≥9 data rows
- ✅ CSV contains survey ratings with numeric values
- ✅ GET `/api/researcher/sessions/nonexistent-id` returns 404 with correct error message
- ✅ Group filter works correctly (tested dynamically based on assigned groups)

## Diagnostics

- Run `bash scripts/verify-s05.sh` — prints seeded session IDs and groups, then 12 ✓/✗ checks with summary
- Script exit code: 0 = all pass, 1 = any failure
- Each failing check prints the actual value received for debugging

## Deviations

- The script does not force specific group assignments (the registration API uses balanced assignment). Instead it accepts whatever groups are assigned and tests filtering on the actual assigned group. This still validates the filter correctly — it just tests whichever group the first participant received rather than always testing "single-shot".

## Known Issues

None.

## Files Created/Modified

- `scripts/verify-s05.sh` — Idempotent verification script with 12 checks covering researcher sessions API, session detail API, CSV export, and build
- `.gsd/milestones/M001/slices/S05/tasks/T03-PLAN.md` — Added Observability Impact section
- `.gsd/milestones/M001/slices/S05/S05-PLAN.md` — Marked T03 as done
