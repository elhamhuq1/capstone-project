---
id: T02
parent: S04
milestone: M001
provides:
  - SurveyForm component with 5 Likert questions and 1-5 clickable rating scale
  - CompletionScreen component with thank-you message, session ID, and home link
  - WritingEditor submit flow saves revision + timing then delegates to study page for survey
  - Study page 'survey' phase between editing and sample advancement
  - Timing start fires on editing phase load via useEffect
  - Session resume correctly shows survey when sampleSubmitted && !surveyCompleted
  - Full 3-sample flow verification script (scripts/verify-s04.sh)
key_files:
  - src/components/SurveyForm.tsx
  - src/components/CompletionScreen.tsx
  - src/components/WritingEditor.tsx
  - src/app/study/[sessionId]/page.tsx
  - scripts/verify-s04.sh
key_decisions:
  - none
patterns_established:
  - Study page phase state machine drives all UI transitions (loading → instructions → editing → survey → completed → error)
  - WritingEditor is a pure editing component that delegates lifecycle events (submit) to parent via callback props
observability_surfaces:
  - Study page phase transitions now include 'survey' between editing and advance
  - Timing start POST fires on editing phase load (useEffect on phase + currentSample.id)
  - Timing complete + survey POST fire in WritingEditor's submit flow before handoff
  - scripts/verify-s04.sh exercises the complete 3-sample flow with 13 automated checks
duration: 15m
verification_result: passed
completed_at: 2026-03-17T19:56:00-04:00
blocker_discovered: false
---

# T02: Build survey + completion UI and wire into study flow with verification

**Built SurveyForm and CompletionScreen components, rewired WritingEditor to delegate submit to study page for survey phase, added timing/survey integration with session resume, and updated verify-s04.sh with full 3-sample flow**

## What Happened

Created `SurveyForm.tsx` — renders the 5 SURVEY_QUESTIONS from `@/lib/survey` as Likert items with clickable 1-5 buttons (blue fill on selected). Submit button is disabled until all 5 answered. POSTs to `/api/session/{id}/survey` on submit, calls `onSurveyComplete` on success.

Created `CompletionScreen.tsx` — centered card with green checkmark icon, thank-you heading, summary text, session ID in mono-font box, and "Return to Home" link.

Modified `WritingEditor.tsx` — replaced `onSampleComplete` prop with `onSubmitForSurvey`. `handleSubmitAndNext` now: (1) saves final revision via POST `/revision`, (2) fires timing complete via POST `/timing` (fire-and-forget), (3) calls `onSubmitForSurvey({ sampleId, sampleIndex })`. No longer calls POST `/advance` directly.

Modified study page (`src/app/study/[sessionId]/page.tsx`):
- Added `'survey'` to Phase type union
- Added `pendingSurvey` state for tracking which sample's survey is active
- Added `useEffect` to fire timing start POST when editing phase loads for a sample
- Added `handleSubmitForSurvey` callback that sets pendingSurvey and transitions to survey phase
- Added `handleSurveyComplete` that calls POST `/advance`, clears pendingSurvey, and re-fetches session
- Updated `fetchSession` resume logic: when `sampleSubmitted && !surveyCompleted`, transitions to survey phase instead of editing
- Added survey phase rendering between editing and completed phases
- Replaced inline completed block with `<CompletionScreen sessionId={sessionId} />`
- Updated `SessionData` interface with `sampleSubmitted` and `surveyCompleted` booleans

Updated `scripts/verify-s04.sh` to include check 7 — full 3-sample flow that registers a fresh participant, runs (timing start → revision → timing complete → survey → advance) × 3, and verifies: completed status, 15 survey rows (5 per sample), 3 timing records all with completed_at.

## Verification

- `npm run build` — exits 0, all routes registered
- `bash scripts/verify-s04.sh` — **13/13 checks pass**:
  1. ✓ Tables exist
  2. ✓ POST /survey saves 5 responses
  3. ✓ POST /timing start creates timing record
  4. ✓ POST /timing complete sets completed_at
  5. ✓ Survey rejects invalid rating (0) → 400
  6. ✓ Survey rejects invalid questionId → 400
  7. ✓ GET /session includes sampleSubmitted and surveyCompleted
  8. ✓ sampleSubmitted=true and surveyCompleted=true after submission
  9. ✓ Full 3-sample flow completed successfully
  10. ✓ All 15 survey responses saved (5 per sample × 3)
  11. ✓ All 3 timing records created
  12. ✓ All 3 timing records have completed_at
  13. ✓ npm run build exits 0
- **Browser walkthrough**: register → instructions → begin → edit sample 1 → "Submit & Next" → survey form (SAMPLE 1 OF 3, 5 Likert questions with blue selected buttons) → submit survey → sample 2 editing → submit → survey → sample 3 editing → submit → survey → completion screen with checkmark, thank-you message, session ID, and "Return to Home" link. All phase transitions verified.

## Diagnostics

- **Full flow test:** `bash scripts/verify-s04.sh` — 13 automated checks including complete 3-sample flow
- **Check phase transitions:** Open study page in browser, use React DevTools to inspect `phase` state or watch network tab for timing/survey/advance requests
- **Inspect survey data:** `node -e "const db=require('better-sqlite3')('sqlite.db'); console.log(db.prepare('SELECT * FROM survey_responses WHERE session_id=?').all('<sessionId>'))"`
- **Inspect timing data:** `node -e "const db=require('better-sqlite3')('sqlite.db'); console.log(db.prepare('SELECT * FROM sample_timings WHERE session_id=?').all('<sessionId>'))"`
- **Session resume test:** After submitting a sample but before completing survey, refresh the page — should resume at survey phase

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/components/SurveyForm.tsx` — new: 5 Likert questions with 1-5 clickable scale, POST to /survey, calls onSurveyComplete
- `src/components/CompletionScreen.tsx` — new: thank-you message, session ID box, "Return to Home" link
- `src/components/WritingEditor.tsx` — modified: replaced onSampleComplete with onSubmitForSurvey, saves revision + timing then delegates instead of calling /advance
- `src/app/study/[sessionId]/page.tsx` — modified: added survey phase, timing useEffect, resume logic, handleSurveyComplete, CompletionScreen import
- `scripts/verify-s04.sh` — modified: added full 3-sample flow (check 7) with 4 sub-checks for DB verification
