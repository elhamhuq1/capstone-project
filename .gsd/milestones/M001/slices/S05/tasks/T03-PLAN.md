---
estimated_steps: 5
estimated_files: 1
---

# T03: Write verification script and validate requirements

**Slice:** S05 — Researcher Dashboard + CSV Export
**Milestone:** M001

## Description

Write `scripts/verify-s05.sh` following the established pattern from verify-s04.sh. The script seeds test data (3 participants, one per group, each completing the full 3-sample flow), then exercises all researcher API endpoints and validates CSV export output. This task proves R011 (researcher dashboard) and R012 (CSV export) are met.

The script must be idempotent — use unique email suffixes per run (timestamp + PID) so repeated runs don't conflict.

## Steps

1. **Create `scripts/verify-s05.sh`** — Bash script with `set -euo pipefail`, pass/fail counters, and the `dbquery()` helper function (copied from verify-s04.sh pattern).

2. **Seed 3 test participants** — Register 3 participants with unique emails (e.g., `verify-s05-single-{suffix}@test.com`), force-assigning one to each group. Since group assignment is balanced (min-count), register them in separate runs or accept whatever balanced assignment gives. After registration, run each through the full flow: begin → (start timing + save revision + complete timing + submit survey + advance) × 3 samples → session completes. Reuse the exact flow pattern from verify-s04.sh's "Full 3-sample flow" section.

3. **Check researcher session list API**:
   - Check 1: `GET /api/researcher/sessions` returns 200 with JSON array containing at least 3 sessions
   - Check 2: `GET /api/researcher/sessions?group=single-shot` returns only sessions with group "single-shot"
   - Check 3: Response includes expected fields (participantName, participantEmail, group, status)

4. **Check researcher session detail API**:
   - Check 4: `GET /api/researcher/sessions/[sessionId]` for one of the seeded sessions returns 200
   - Check 5: Response includes prompts array, revisions array, surveys array, timings array
   - Check 6: `GET /api/researcher/sessions/nonexistent-id` returns 404

5. **Check CSV export**:
   - Check 7: `GET /api/researcher/export` response has `Content-Type` containing `text/csv`
   - Check 8: Response has `Content-Disposition` containing `attachment`
   - Check 9: CSV first line contains expected column headers (participant_name, participant_email, group, sample_id, etc.)
   - Check 10: CSV has at least 9 data rows (3 participants × 3 samples — may have more from other test runs, but at least 9)
   - Check 11: CSV contains the survey rating columns with numeric values
   - Check 12: `npm run build` exits 0

## Must-Haves

- [ ] Script is idempotent (unique emails per run, doesn't depend on clean DB state)
- [ ] Seeds 3 test participants, one per group, each completing full 3-sample flow
- [ ] Validates GET `/api/researcher/sessions` returns all sessions with correct structure
- [ ] Validates GET `/api/researcher/sessions?group=X` filters correctly
- [ ] Validates GET `/api/researcher/sessions/[sessionId]` returns full detail
- [ ] Validates GET `/api/researcher/export` returns valid CSV with correct headers and data
- [ ] CSV has expected column headers and at least 9 data rows
- [ ] `npm run build` passes
- [ ] Script exits 0 on all-pass, exits 1 on any failure

## Verification

- `bash scripts/verify-s05.sh` — all checks pass (12/12)
- Script can be run multiple times without failure (idempotency)

## Inputs

- `scripts/verify-s04.sh` — pattern reference for flow seeding, dbquery helper, pass/fail tracking
- T01 API routes: `/api/researcher/sessions`, `/api/researcher/sessions/[sessionId]`, `/api/researcher/export`
- Existing API routes for seeding: `/api/register`, `/api/session/[id]` (POST begin), `/api/session/[id]/timing`, `/api/session/[id]/revision`, `/api/session/[id]/survey`, `/api/session/[id]/advance`

## Observability Impact

- **New signal:** `bash scripts/verify-s05.sh` — produces 12 pass/fail checks with ✓/✗ markers and a summary line. Exit code 0 = all pass, 1 = any failure.
- **Inspection:** Script output shows seeded session IDs and assigned groups for debugging. Temp CSV file at `/tmp/verify-s05-csv-*.csv` during run (cleaned up on completion).
- **Failure visibility:** Each check prints which specific assertion failed (e.g., "CSV has N data rows (expected ≥9)") with the actual value received.
- **Downstream use:** Script can be run by CI or a future agent to validate R011/R012 requirements remain satisfied after changes.

## Expected Output

- `scripts/verify-s05.sh` — executable verification script with 12+ checks, all passing
