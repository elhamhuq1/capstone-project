---
id: S04
parent: M001
milestone: M001
provides:
  - surveyResponses and sampleTimings SQLite tables with full CRUD query layer
  - POST /api/session/[sessionId]/survey — validates and saves 5 Likert responses per sample
  - POST /api/session/[sessionId]/timing — idempotent start/complete timing per sample
  - GET /api/session/[sessionId] extended with sampleSubmitted and surveyCompleted flags
  - SURVEY_QUESTIONS constant (5 questions: authorship, satisfaction, cognitive_load, helpfulness, future_intent)
  - SurveyForm component with clickable 1-5 Likert scale
  - CompletionScreen component with thank-you message, session ID, and home link
  - Study page 'survey' phase between editing and sample advancement
  - WritingEditor delegates submit to study page (no longer calls /advance directly)
  - Session resume correctly enters survey phase when sampleSubmitted && !surveyCompleted
  - Per-sample timing (started_at on editing load, completed_at on submit)
requires:
  - slice: S02
    provides: participants/sessions/writingSamples/revisions tables, session flow logic, queries.ts CRUD layer, WritingEditor component, study page state machine
  - slice: S03
    provides: ChatPanel with mode enforcement, prompts/aiResponses tables, AI chat integration
affects:
  - S05
key_files:
  - src/lib/db/schema.ts
  - src/lib/db/queries.ts
  - src/lib/survey.ts
  - src/app/api/session/[sessionId]/survey/route.ts
  - src/app/api/session/[sessionId]/timing/route.ts
  - src/app/api/session/[sessionId]/route.ts
  - src/components/SurveyForm.tsx
  - src/components/CompletionScreen.tsx
  - src/components/WritingEditor.tsx
  - src/app/study/[sessionId]/page.tsx
  - scripts/verify-s04.sh
key_decisions:
  - none (no new architectural decisions — followed established patterns from S02/S03)
patterns_established:
  - Study page phase state machine drives all UI transitions (loading → instructions → editing → survey → completed → error)
  - WritingEditor is a pure editing component that delegates lifecycle events to parent via callback props
  - Survey/timing query functions follow centralized query layer pattern (D017)
  - Idempotent startSampleTiming uses check-then-insert to prevent duplicate timing records on page refresh
observability_surfaces:
  - GET /api/session/{sessionId} returns sampleSubmitted and surveyCompleted boolean flags for current sample
  - survey_responses table queryable via node+better-sqlite3 (5 rows per sample per session)
  - sample_timings table queryable via node+better-sqlite3 (1 row per sample per session, with started_at and completed_at)
  - POST /survey returns 400 with descriptive validation errors for invalid questionId or out-of-range rating
  - POST /timing returns 400/404 on bad input
  - scripts/verify-s04.sh exercises complete 3-sample flow with 13 automated checks
drill_down_paths:
  - .gsd/milestones/M001/slices/S04/tasks/T01-SUMMARY.md
  - .gsd/milestones/M001/slices/S04/tasks/T02-SUMMARY.md
duration: 27m
verification_result: passed
completed_at: 2026-03-17T19:56:00-04:00
---

# S04: Data Logging + Survey + Completion

**Added post-sample Likert survey, per-sample timing, and completion screen — closing the end-to-end study loop from registration through all 3 samples to thank-you screen with full research data capture**

## What Happened

T01 built the data layer: two new SQLite tables (survey_responses, sample_timings) via Drizzle schema, five query functions in the centralized query layer (saveSurveyResponses, getSurveyResponses, startSampleTiming, completeSampleTiming, getSampleTimings), a SURVEY_QUESTIONS constant defining the 5 Likert questions, and two new API routes. The POST /survey route validates all 5 question IDs and enforces rating range 1-5. The POST /timing route supports idempotent start (check-then-insert) and complete events. The GET /session route was extended to return sampleSubmitted and surveyCompleted boolean flags for the current sample.

T02 built the UI and wired everything together. SurveyForm renders 5 Likert questions with clickable 1-5 buttons (blue highlight on selection, disabled submit until all answered). CompletionScreen shows a green checkmark, thank-you message, session ID in a mono-font box, and a "Return to Home" link. The key integration change: WritingEditor's "Submit & Next" now saves the final revision and fires timing complete, then delegates to the study page via an onSubmitForSurvey callback — it no longer calls /advance directly. The study page gained a new 'survey' phase in its state machine, a useEffect that fires timing start when editing begins, and resume logic that correctly transitions to the survey phase when a sample was submitted but survey is pending. After survey completion, the study page calls /advance and re-fetches session data.

The verification script was made idempotent (unique emails per run) and covers 13 checks including a full 3-sample flow that verifies 15 survey rows, 3 timing records, and completed status.

## Verification

- `npm run build` — exits 0, all routes registered
- `bash scripts/verify-s04.sh` — **13/13 checks pass**:
  1. ✓ surveyResponses and sampleTimings tables exist
  2. ✓ POST /survey saves 5 responses (verified rows in DB)
  3. ✓ POST /timing start creates timing record
  4. ✓ POST /timing complete sets completed_at
  5. ✓ Survey rejects invalid rating (0) → 400
  6. ✓ Survey rejects invalid questionId → 400
  7. ✓ GET /session includes sampleSubmitted and surveyCompleted booleans
  8. ✓ sampleSubmitted=true and surveyCompleted=true after submission
  9. ✓ Full 3-sample flow completed successfully (register → begin → (timing+revision+survey+advance) × 3 → completed)
  10. ✓ All 15 survey responses saved (5 per sample × 3)
  11. ✓ All 3 timing records created
  12. ✓ All 3 timing records have completed_at
  13. ✓ npm run build exits 0
- Observability surfaces confirmed: GET /session returns correct sampleSubmitted/surveyCompleted flags; survey/timing tables queryable; validation errors return descriptive 400 responses

## Requirements Advanced

- R009 (Post-sample Likert survey) — SurveyForm component renders 5 Likert questions with 1-5 scale; survey appears between editing and sample advancement; POST /survey validates and saves all responses
- R010 (Full data logging) — Per-sample timing (started_at, completed_at) now tracked; survey responses captured; combined with S02 revision snapshots and S03 prompt/response logging, all research data is now captured
- R013 (Completion screen) — CompletionScreen shows thank-you message, session ID, and summary after all 3 samples and surveys completed

## Requirements Validated

- R009 — POST /survey saves 5 Likert responses per sample, validates questionId and rating range, SurveyForm UI prevents submission until all answered; verified by 13-check automated script including full 3-sample flow
- R010 — All research data now captured: revision snapshots (S02), prompts and AI responses (S03), survey responses (S04), per-sample timing (S04); verified by full flow test showing 15 survey rows + 3 timing records + completed status
- R013 — CompletionScreen renders with thank-you message, session ID in mono-font box, and "Return to Home" link; verified by browser walkthrough and automated flow completion check
- R004 — Revision history tracking is now fully logged with timing (R004 was active pending S04 data logging integration; now validated with per-sample timing and complete data round-trip)

## New Requirements Surfaced

- none

## Requirements Invalidated or Re-scoped

- none

## Deviations

- Fixed verify-s04.sh to use unique email suffixes per run (timestamp + PID) — original script reused static emails, causing check 2 to fail on repeated runs due to accumulated survey rows from session reuse. Not a code bug, just a test idempotency issue.

## Known Limitations

- Survey responses are append-only — no UI to edit or retract a survey after submission
- Timing start fires on editing phase load via useEffect; if the page reloads during editing, the idempotent check prevents duplicate records but the original started_at timestamp is preserved (minor — sufficient for study purposes)
- No prompt length or suggestion acceptance rate computed metrics yet — raw data is all captured; computed metrics can be derived in S05 researcher dashboard

## Follow-ups

- S05 needs to aggregate survey_responses and sample_timings data for the researcher dashboard and CSV export
- Computed metrics (time per sample = completed_at - started_at, prompt length, suggestion acceptance rate) should be derived at query time in S05, not pre-computed

## Files Created/Modified

- `src/lib/db/schema.ts` — added surveyResponses and sampleTimings table definitions
- `src/lib/db/queries.ts` — added 5 query functions (saveSurveyResponses, getSurveyResponses, startSampleTiming, completeSampleTiming, getSampleTimings)
- `src/lib/survey.ts` — new: SURVEY_QUESTIONS constant and SurveyQuestionId type
- `src/app/api/session/[sessionId]/survey/route.ts` — new: POST route with full validation
- `src/app/api/session/[sessionId]/timing/route.ts` — new: POST route for start/complete events
- `src/app/api/session/[sessionId]/route.ts` — extended GET to include sampleSubmitted/surveyCompleted flags
- `src/components/SurveyForm.tsx` — new: 5 Likert questions with 1-5 clickable scale
- `src/components/CompletionScreen.tsx` — new: thank-you message, session ID box, home link
- `src/components/WritingEditor.tsx` — modified: replaced onSampleComplete with onSubmitForSurvey, delegates instead of calling /advance
- `src/app/study/[sessionId]/page.tsx` — modified: added survey phase, timing useEffect, resume logic, CompletionScreen
- `scripts/verify-s04.sh` — modified: full 13-check verification with unique emails per run

## Forward Intelligence

### What the next slice should know
- All research data is now in SQLite: participants, sessions, writing_samples, revisions, prompts, ai_responses, survey_responses, sample_timings. S05 just needs to query and present this data.
- survey_responses has columns: id, session_id, sample_id, question_id, rating, created_at. There are exactly 5 rows per sample (one per SURVEY_QUESTIONS entry).
- sample_timings has columns: id, session_id, sample_id, sample_index, started_at, completed_at. Time per sample = completed_at - started_at.
- The centralized query layer pattern (D017) means S05 should add its aggregate/export queries to src/lib/db/queries.ts, not query the DB directly from routes.
- Session status transitions: 'not-started' → 'in-progress' → 'completed'. A completed session has currentSampleIndex === sampleOrder.length.

### What's fragile
- WritingEditor's onSubmitForSurvey callback chain (save revision → complete timing → delegate) is sequential with fire-and-forget timing — if the timing POST fails, the flow still proceeds. This is intentional (timing is supplementary data) but means timing gaps are possible.
- The study page state machine has 6 phases (loading, instructions, editing, survey, completed, error). Phase transitions are driven by fetchSession() re-reads. If the GET /session response shape changes, phase logic could break.

### Authoritative diagnostics
- `bash scripts/verify-s04.sh` — 13 automated checks covering the entire data layer and flow. This is the most trustworthy signal for S04 health.
- `GET /api/session/{sessionId}` — returns sampleSubmitted/surveyCompleted flags that directly reflect DB state. Trust these over client-side phase state.

### What assumptions changed
- No assumptions changed. The slice plan was straightforward and execution matched it closely.
