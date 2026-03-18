# S04: Data Logging + Survey + Completion

**Goal:** Full end-to-end study run captures all research data — prompts, AI responses, revision snapshots, timestamps, time per sample — plus Likert survey after each sample and a completion screen.
**Demo:** A participant edits a sample, clicks "Submit & Next," answers a 5-question Likert survey, then proceeds to the next sample. After all 3 samples + surveys, they see a thank-you completion screen. All data (survey responses, timing, revisions, prompts) is queryable in SQLite.

## Must-Haves

- `surveyResponses` and `sampleTimings` tables in SQLite with query functions in `queries.ts`
- POST `/api/session/[sessionId]/survey` saves 5 Likert responses per sample
- POST `/api/session/[sessionId]/timing` records per-sample start/complete timestamps
- GET `/api/session/[sessionId]` includes `sampleSubmitted` and `surveyCompleted` flags for resume handling
- `SurveyForm` component with 5 Likert questions (authorship, satisfaction, cognitive_load, helpfulness, future_intent) on 1–5 scale
- `CompletionScreen` component with thank-you message, session ID, and summary
- Study page `survey` phase inserted between editing and sample advancement
- WritingEditor's "Submit & Next" saves final revision + timing, then hands control to study page for survey (no longer calls `/advance` directly)
- Session resume correctly shows survey if editing was submitted but survey is pending
- Per-sample timing (started_at when editing begins, completed_at when editing submitted)
- Verification script exercising full 3-sample flow with surveys

## Proof Level

- This slice proves: integration
- Real runtime required: yes (API routes, DB persistence, state machine transitions)
- Human/UAT required: yes (browser walkthrough of edit → survey → next → completion flow)

## Verification

- `npm run build` exits 0
- `bash scripts/verify-s04.sh` — automated checks covering:
  1. surveyResponses and sampleTimings tables exist in DB
  2. POST /survey saves responses (verify rows in DB)
  3. POST /timing start creates timing record
  4. POST /timing complete sets completed_at
  5. Survey validation rejects invalid ratings
  6. GET /session includes sampleSubmitted and surveyCompleted fields
  7. Full 3-sample flow: register → begin → start timing → submit → survey → advance → repeat 3x → completed status
  8. npm run build exits 0

## Observability / Diagnostics

- Runtime signals: sampleTimings rows track editing start/end per sample; surveyResponses rows capture all Likert data; session status transitions (in-progress → completed)
- Inspection surfaces: GET `/api/session/[sessionId]` with sampleSubmitted/surveyCompleted flags; DB tables directly queryable via node+better-sqlite3; `scripts/verify-s04.sh`
- Failure visibility: survey API returns 400 with descriptive error on invalid input; timing API returns 400/404 on bad requests; study page shows error phase on fetch failures
- Redaction constraints: participant email in participants table (existing)

## Integration Closure

- Upstream surfaces consumed: `src/lib/db/schema.ts` (existing tables), `src/lib/db/queries.ts` (existing query layer), `src/components/WritingEditor.tsx` (submit flow), `src/app/study/[sessionId]/page.tsx` (state machine), `src/app/api/session/[sessionId]/route.ts` (GET response), `src/app/api/session/[sessionId]/advance/route.ts` (sample progression)
- New wiring introduced in this slice: survey phase in study page state machine; WritingEditor submit delegates to study page instead of calling /advance directly; timing calls on editing phase start and submit
- What remains before the milestone is truly usable end-to-end: S05 (researcher dashboard + CSV export)

## Tasks

- [x] **T01: Add survey + timing data layer with API routes** `est:25m`
  - Why: Everything else depends on the data layer — schema, queries, and API routes must exist before the UI can consume them. Also defines survey question constants used by the SurveyForm component.
  - Files: `src/lib/db/schema.ts`, `src/lib/db/queries.ts`, `src/lib/survey.ts`, `src/app/api/session/[sessionId]/survey/route.ts`, `src/app/api/session/[sessionId]/timing/route.ts`, `src/app/api/session/[sessionId]/route.ts`
  - Do: (1) Add `surveyResponses` and `sampleTimings` table definitions to schema.ts. (2) Run `npx drizzle-kit push`. (3) Create `src/lib/survey.ts` with SURVEY_QUESTIONS constant array (5 questions with id and text). (4) Add query functions to queries.ts: `saveSurveyResponses()`, `getSurveyResponses()`, `startSampleTiming()` (idempotent — check-then-insert), `completeSampleTiming()`. (5) Create POST survey route with validation (rating 1-5, all 5 questions required). (6) Create POST timing route with start/complete events. (7) Extend GET session route to include `sampleSubmitted` (timing completed_at exists for current sample) and `surveyCompleted` (survey responses exist for current sample) booleans. All queries go through queries.ts per D017.
  - Verify: `npx drizzle-kit push` succeeds, `npm run build` exits 0
  - Done when: Both new tables exist in DB, survey and timing API routes accept valid POST requests, GET session response includes sampleSubmitted and surveyCompleted fields

- [x] **T02: Build survey + completion UI and wire into study flow with verification** `est:35m`
  - Why: This is the integration task that creates the user-facing components (SurveyForm, CompletionScreen), modifies WritingEditor's submit flow to hand control to the study page for survey, adds the survey phase to the study page state machine, wires timing calls, and creates the comprehensive verification script.
  - Files: `src/components/SurveyForm.tsx`, `src/components/CompletionScreen.tsx`, `src/components/WritingEditor.tsx`, `src/app/study/[sessionId]/page.tsx`, `scripts/verify-s04.sh`
  - Do: (1) Create `SurveyForm.tsx` — imports SURVEY_QUESTIONS from survey.ts, renders 5 Likert questions with clickable 1-5 scale, POST to /survey on submit, calls onSurveyComplete prop. (2) Create `CompletionScreen.tsx` — thank-you message, session ID display, "3 samples completed" summary. (3) Modify `WritingEditor.tsx` — add `onSubmitForSurvey` prop; change handleSubmitAndNext to save final revision via POST /revision, then POST /timing complete, then call onSubmitForSurvey({sampleId, sampleIndex}); remove the POST /advance call. (4) Modify study page — add 'survey' phase to Phase type; add pendingSurvey state; wire onSubmitForSurvey from WritingEditor to transition to survey phase; on survey completion call POST /advance then fetchSession(); add POST /timing start when editing phase loads; handle resume (if sampleSubmitted && !surveyCompleted → survey phase); replace completed block with CompletionScreen. (5) Create `scripts/verify-s04.sh` covering full flow.
  - Verify: `npm run build` exits 0, `bash scripts/verify-s04.sh` all checks pass
  - Done when: Full 3-sample flow works (edit → submit → survey → next) × 3 → completion screen; session resume shows survey if editing was submitted but survey pending; verification script passes all checks

## Files Likely Touched

- `src/lib/db/schema.ts`
- `src/lib/db/queries.ts`
- `src/lib/survey.ts`
- `src/app/api/session/[sessionId]/survey/route.ts`
- `src/app/api/session/[sessionId]/timing/route.ts`
- `src/app/api/session/[sessionId]/route.ts`
- `src/components/SurveyForm.tsx`
- `src/components/CompletionScreen.tsx`
- `src/components/WritingEditor.tsx`
- `src/app/study/[sessionId]/page.tsx`
- `scripts/verify-s04.sh`
