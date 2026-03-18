---
id: T01
parent: S04
milestone: M001
provides:
  - surveyResponses and sampleTimings DB tables
  - 5 query functions for survey/timing CRUD
  - POST /api/session/[sessionId]/survey route with validation
  - POST /api/session/[sessionId]/timing route with idempotent start/complete
  - GET /api/session/[sessionId] extended with sampleSubmitted/surveyCompleted flags
  - SURVEY_QUESTIONS constant and SurveyQuestionId type
key_files:
  - src/lib/db/schema.ts
  - src/lib/db/queries.ts
  - src/lib/survey.ts
  - src/app/api/session/[sessionId]/survey/route.ts
  - src/app/api/session/[sessionId]/timing/route.ts
  - src/app/api/session/[sessionId]/route.ts
  - scripts/verify-s04.sh
key_decisions:
  - Used Set<string> for VALID_QUESTION_IDS to avoid TypeScript narrowing issue with const assertion literal types
patterns_established:
  - Survey/timing query functions follow existing centralized query layer pattern (D017)
  - Idempotent startSampleTiming uses check-then-insert to prevent duplicate timing records on page refresh
observability_surfaces:
  - GET /api/session/{sessionId} returns sampleSubmitted and surveyCompleted boolean flags
  - survey_responses and sample_timings tables directly queryable via node+better-sqlite3
  - POST /survey returns 400 with descriptive validation errors for invalid questionId or out-of-range rating
  - POST /timing returns 400/404 on bad input
duration: 12m
verification_result: passed
completed_at: 2026-03-17T19:56:00-04:00
blocker_discovered: false
---

# T01: Add survey + timing data layer with API routes

**Added surveyResponses/sampleTimings tables, 5 query functions, POST survey/timing routes with validation, and extended GET session with sampleSubmitted/surveyCompleted flags**

## What Happened

Added two new SQLite tables (survey_responses, sample_timings) to the Drizzle schema and pushed with `drizzle-kit push`. Created `src/lib/survey.ts` with the 5 Likert question constants. Added 5 query functions to the centralized query layer: `saveSurveyResponses`, `getSurveyResponses`, `startSampleTiming` (idempotent check-then-insert), `completeSampleTiming`, and `getSampleTimings`. Created POST `/api/session/[sessionId]/survey` with full validation (5 responses required, valid questionId, rating 1-5 integer). Created POST `/api/session/[sessionId]/timing` handling start/complete events. Extended GET session to return `sampleSubmitted` and `surveyCompleted` booleans for the current sample. Created `scripts/verify-s04.sh` covering checks 1-6 and 8 from the slice plan (check 7 requires T02 UI).

## Verification

- `npx drizzle-kit push` — succeeded, both tables created
- `node -e` with better-sqlite3 — confirmed survey_responses and sample_timings tables exist with correct columns
- `npm run build` — exits 0, all routes registered (survey + timing visible in route table)
- `bash scripts/verify-s04.sh` — 9/9 checks pass:
  - ✓ Tables exist
  - ✓ POST /survey saves 5 responses (verified rows in DB)
  - ✓ POST /timing start creates timing record
  - ✓ POST /timing complete sets completed_at
  - ✓ Survey rejects invalid rating (0) → 400
  - ✓ Survey rejects invalid questionId → 400
  - ✓ GET /session includes sampleSubmitted and surveyCompleted booleans
  - ✓ sampleSubmitted=true and surveyCompleted=true after submission
  - ✓ npm run build exits 0
  - ⚠ Check 7 (full 3-sample flow) skipped — requires T02 UI components

## Diagnostics

- **Inspect survey data:** `node -e "const db=require('better-sqlite3')('sqlite.db'); console.log(db.prepare('SELECT * FROM survey_responses WHERE session_id=?').all('<sessionId>'))"`
- **Inspect timing data:** `node -e "const db=require('better-sqlite3')('sqlite.db'); console.log(db.prepare('SELECT * FROM sample_timings WHERE session_id=?').all('<sessionId>'))"`
- **Check session flags:** `curl http://localhost:3000/api/session/<sessionId>` → look for `sampleSubmitted` and `surveyCompleted` in response
- **Run verification:** `bash scripts/verify-s04.sh`

## Deviations

- Used `Set<string>` instead of inferred `Set<"authorship" | ...>` for VALID_QUESTION_IDS in survey route to avoid TypeScript type narrowing error (`string` not assignable to literal union when calling `.has()`). Functionally identical.

## Known Issues

None.

## Files Created/Modified

- `src/lib/db/schema.ts` — added surveyResponses and sampleTimings table definitions
- `src/lib/db/queries.ts` — added 5 query functions (saveSurveyResponses, getSurveyResponses, startSampleTiming, completeSampleTiming, getSampleTimings)
- `src/lib/survey.ts` — new file with SURVEY_QUESTIONS constant and SurveyQuestionId type
- `src/app/api/session/[sessionId]/survey/route.ts` — new POST route with full validation
- `src/app/api/session/[sessionId]/timing/route.ts` — new POST route for start/complete events
- `src/app/api/session/[sessionId]/route.ts` — extended GET to include sampleSubmitted/surveyCompleted
- `scripts/verify-s04.sh` — new verification script covering S04 checks 1-6 and 8
