---
id: T04
parent: S02
milestone: M001
provides:
  - POST /api/session/[sessionId]/revision endpoint for saving full-text revision snapshots
  - POST /api/session/[sessionId]/advance endpoint for sample progression with auto-revision and next-sample data
  - WritingEditor component with textarea, revision save, revision history sidebar, and sample submission
  - End-to-end verification script (scripts/verify-s02.sh) exercising registration through completion
key_files:
  - src/app/api/session/[sessionId]/revision/route.ts
  - src/app/api/session/[sessionId]/advance/route.ts
  - src/components/WritingEditor.tsx
  - src/app/study/[sessionId]/page.tsx
  - scripts/verify-s02.sh
key_decisions:
  - Advance endpoint returns nextSample inline so client avoids a second fetch after advancement
  - Revision viewing replaces textarea with read-only display + "Back to editing" button rather than modal overlay
  - Confirm dialog on submit prevents accidental sample advancement
patterns_established:
  - API routes use structured JSON errors with descriptive messages and appropriate HTTP status codes
  - Client state refreshes via re-fetch after advancement (fetchSession callback) keeping server as source of truth
observability_surfaces:
  - POST /revision returns revisionNumber and createdAt for each save
  - POST /advance returns currentSampleIndex, status, and completed flag
  - GET /api/session/[id] returns full state including revisions array per current sample
  - scripts/verify-s02.sh automated health check covers registration, resume, revision, advancement, completion, and validation
duration: 15m
verification_result: passed
completed_at: 2026-03-17
blocker_discovered: false
---

# T04: Build writing editor with revision saving, sample progression, and end-to-end verification

**Built WritingEditor with revision save/view, sample progression through all 3 samples, advance/revision API routes, and end-to-end verification script — full S02 flow works register → instructions → edit 3 samples → completed**

## What Happened

Created two API routes and one client component, then wired them into the study flow page:

1. **Revision route** (`POST /api/session/[sessionId]/revision`): Validates session exists and isn't completed, resolves current sample from sampleOrder[currentSampleIndex], saves full-text snapshot via `saveRevision()`, returns `{revisionNumber, sampleId, createdAt}` with 201.

2. **Advance route** (`POST /api/session/[sessionId]/advance`): Optionally saves final revision from request body, calls `advanceSample()` to increment index or mark completed, returns next sample data inline (avoids extra client fetch).

3. **WritingEditor component**: Full-width textarea pre-filled with sample content, "Save Revision" button with "Saved!" transient feedback, revision history sidebar showing timestamped list with click-to-view (replaces textarea with read-only view + "Back to editing"), "Submit & Next Sample →" button with confirmation dialog, and progress indicator ("Sample N of 3" + colored dots).

4. **Study flow page update**: Replaced T03's placeholder editing div with `<WritingEditor>`. The `onSampleComplete` callback re-fetches session data — if completed, transitions to completion phase.

5. **Verification script** (`scripts/verify-s02.sh`): 12 automated checks covering registration, session resume, session begin, revision saving (2 revisions), advancement through all 3 samples, completion verification, completed-session revision rejection (400), input validation (400), and balanced group registration.

## Verification

- `npm run build` — exits 0, all routes compile, no TypeScript errors
- `bash scripts/verify-s02.sh` — all 12 checks pass (registration ✓, resume ✓, begin ✓, revision #1 ✓, revision #2 ✓, advance ×3 ✓, completed ✓, completed-revision-400 ✓, validation-400 ✓, balanced assignment ✓)
- Browser walkthrough: register → instructions → "Begin" → Sample 1 of 3 (Sustainable Urban Transportation) → Save Revision → view Revision 1 → back to editing → Submit & Next → Sample 2 of 3 (Social Media) → Submit & Next → Sample 3 of 3 (Remote Work, "Submit Final Sample") → "You have completed all writing samples. Thank you!"
- All slice-level verification checks pass (this is the final task of S02)

## Diagnostics

- **Inspect session state:** `curl http://localhost:3000/api/session/SESSION_ID`
- **Save revision:** `curl -X POST http://localhost:3000/api/session/SESSION_ID/revision -H 'Content-Type: application/json' -d '{"content":"..."}'`
- **Advance sample:** `curl -X POST http://localhost:3000/api/session/SESSION_ID/advance -H 'Content-Type: application/json' -d '{"content":"..."}'`
- **Full flow check:** `bash scripts/verify-s02.sh`
- **DB inspection:** `node -e "const Database = require('better-sqlite3'); const db = new Database('sqlite.db'); console.log(db.prepare('SELECT id, status, current_sample_index FROM sessions').all())"`

## Deviations

- Added a "begin session" step in verify-s02.sh before saving revisions — the revision route correctly rejects saves when session status is still "instructions" (not yet in-progress), so the script needed to transition first.
- Added a check for revision on completed session (400 response) — not in the original script plan but validates an important guard.

## Known Issues

None.

## Files Created/Modified

- `src/app/api/session/[sessionId]/revision/route.ts` — POST handler for saving revision snapshots with validation
- `src/app/api/session/[sessionId]/advance/route.ts` — POST handler for sample advancement with optional final revision
- `src/components/WritingEditor.tsx` — Full editor with textarea, revision save/view, progress indicator, and submit flow
- `src/app/study/[sessionId]/page.tsx` — Replaced T03 placeholder with WritingEditor component
- `scripts/verify-s02.sh` — End-to-end API verification script (12 checks)
- `.gsd/milestones/M001/slices/S02/tasks/T04-PLAN.md` — Added Observability Impact section
