# S04 ("Data Logging + Survey + Completion") — Research

**Date:** 2026-03-17

## Summary

S04 adds three things to the existing study flow: (1) a Likert survey shown between each writing sample submission and the next sample, (2) a proper completion screen, and (3) per-sample timing data to complete R010's data logging requirement. This is straightforward work using established patterns already in the codebase — React state machine phases, Drizzle schema extension, centralized query layer, API routes.

The main design decision is how to intercept the existing "Submit & Next" flow to insert the survey. Currently, `WritingEditor.handleSubmitAndNext` calls `/api/session/[sessionId]/advance` directly and then invokes `onSampleComplete()` which triggers a re-fetch. S04 needs to split this: the submit button saves the final revision, transitions the study page to a new `survey` phase, and only after the survey is completed does the advance call happen.

All data for S05 (researcher dashboard + CSV export) must be in place after this slice — survey responses, per-sample timing, and computed metrics like prompt length and time spent.

## Recommendation

**Light-touch intercept of the existing flow.** Add a `survey` phase to the study page state machine. Modify `WritingEditor` so its "Submit & Next" saves the final revision and calls a new prop `onSubmitForSurvey()` instead of calling `/advance`. The study page handles the survey phase with a new `SurveyForm` component. On survey completion, the study page calls `/advance` then re-fetches.

For timing, add a `sampleTimings` table with `started_at` and `completed_at` per session+sample. Record `started_at` when the editing phase loads for a sample (a POST from the study page), and `completed_at` when the survey is submitted (before calling advance). This gives researchers explicit, queryable per-sample duration.

For the survey, use 5 Likert questions covering perceived authorship, satisfaction, cognitive load, AI helpfulness, and future intent. Store each question-rating pair as a row in `surveyResponses`. Keep questions short per the requirement notes ("Keep it short to avoid survey fatigue across 3 samples").

## Implementation Landscape

### Key Files

- `src/lib/db/schema.ts` — Add `surveyResponses` and `sampleTimings` table definitions. Follow existing pattern: `sqliteTable()`, auto-increment PK, `text('created_at').default(sql\`(datetime('now'))\`)`.
- `src/lib/db/queries.ts` — Add query functions: `saveSurveyResponses()`, `getSurveyResponses()`, `startSampleTiming()`, `completeSampleTiming()`, `getSampleTimings()`. All follow D017 (centralized query layer).
- `src/components/SurveyForm.tsx` — New client component. 5 Likert questions (1–5 scale), submit button. Props: `sessionId`, `sampleId`, `sampleIndex`, `totalSamples`, `onSurveyComplete`. Renders a clean card with radio buttons or clickable number scale.
- `src/components/WritingEditor.tsx` — Modify `handleSubmitAndNext`: instead of calling `/advance`, save the final revision via POST `/api/session/[sessionId]/revision`, then call `onSubmitForSurvey()` prop. The `onSampleComplete` prop is kept but only called from the study page after survey + advance.
- `src/app/study/[sessionId]/page.tsx` — Add `survey` phase to the state machine (`Phase = 'loading' | 'instructions' | 'editing' | 'survey' | 'completed' | 'error'`). Track `pendingSurvey` state with `{ sampleId, sampleIndex }`. Wire `onSubmitForSurvey` from WritingEditor. After survey, call `/advance` then `fetchSession()`. Replace the bare completed message with a proper `CompletionScreen` component.
- `src/components/CompletionScreen.tsx` — New component. Thank-you message, session ID for participant records, summary (3 samples completed). Simple, clean.
- `src/app/api/session/[sessionId]/survey/route.ts` — New POST route. Accepts `{ sampleId, responses: [{ questionId, rating }] }`. Validates session exists and isn't completed. Saves via `saveSurveyResponses()`.
- `src/app/api/session/[sessionId]/timing/route.ts` — New POST route. Accepts `{ sampleId, event: 'start' | 'complete' }`. Creates or updates timing record.
- `src/app/api/session/[sessionId]/route.ts` — Extend GET response with `surveyCompleted` boolean for current sample (so study page knows whether to show survey or editing on resume).
- `scripts/verify-s04.sh` — Automated verification covering: schema, survey submission, timing, completion flow, session resume with survey state.

### New DB Tables

```
surveyResponses:
  id INTEGER PK AUTOINCREMENT
  session_id TEXT NOT NULL
  sample_id INTEGER NOT NULL
  question_id TEXT NOT NULL     -- e.g. 'authorship', 'satisfaction', 'cognitive_load', 'helpfulness', 'future_intent'
  rating INTEGER NOT NULL       -- 1-5 Likert scale
  created_at TEXT NOT NULL DEFAULT datetime('now')

sampleTimings:
  id INTEGER PK AUTOINCREMENT
  session_id TEXT NOT NULL
  sample_id INTEGER NOT NULL
  sample_index INTEGER NOT NULL  -- 0, 1, 2
  started_at TEXT NOT NULL DEFAULT datetime('now')
  completed_at TEXT              -- NULL until sample submitted
```

### Survey Questions

Five questions, each on a 1–5 scale (Strongly Disagree → Strongly Agree):

| ID | Question Text |
|---|---|
| `authorship` | "I feel a sense of ownership over the final revised text." |
| `satisfaction` | "I am satisfied with the quality of my revision." |
| `cognitive_load` | "The revision process required significant mental effort." |
| `helpfulness` | "The AI suggestions were helpful for improving the writing." |
| `future_intent` | "I would use a similar AI-assisted process for future writing tasks." |

These are stored as constants in the SurveyForm component (or a shared `src/lib/survey.ts` constants file). The question text is displayed client-side; only `questionId` + `rating` are stored in the DB.

### Build Order

**Task 1: Schema + Query Layer + API Routes (data layer)**
- Add `surveyResponses` and `sampleTimings` tables to `schema.ts`
- Run `npx drizzle-kit push`
- Add query functions to `queries.ts`
- Create POST `/api/session/[sessionId]/survey` route
- Create POST `/api/session/[sessionId]/timing` route
- Extend GET `/api/session/[sessionId]` to include `surveyCompleted` for current sample
- **Why first:** Everything else depends on the data layer. Can be verified independently with curl.

**Task 2: SurveyForm + CompletionScreen Components**
- Build `SurveyForm.tsx` with 5 Likert questions and submit handler
- Build `CompletionScreen.tsx` with thank-you, session ID, summary
- **Why second:** Pure UI components, no integration yet. Can be visually verified in isolation.

**Task 3: Study Page Integration + WritingEditor Modification**
- Modify `WritingEditor.tsx`: add `onSubmitForSurvey` prop, change submit flow to save revision then call callback instead of calling `/advance`
- Modify study page: add `survey` phase, wire `onSubmitForSurvey`, handle survey completion → advance → re-fetch, add timing start calls, replace completed block with `CompletionScreen`
- **Why last:** This is the integration task that ties everything together. Depends on T1 (API routes) and T2 (components).

### Verification Approach

`scripts/verify-s04.sh` should cover:

1. ✅ `surveyResponses` and `sampleTimings` tables exist in DB
2. ✅ POST `/api/session/[sessionId]/survey` saves responses (verify rows in DB)
3. ✅ POST `/api/session/[sessionId]/timing` creates timing record with `started_at`
4. ✅ POST `/api/session/[sessionId]/timing` with `event:complete` sets `completed_at`
5. ✅ Survey validation: rejects invalid rating (not 1-5), rejects missing fields
6. ✅ GET `/api/session/[sessionId]` includes `surveyCompleted` field
7. ✅ Full flow: register → begin → submit sample → submit survey → advance → repeat 3x → completed status
8. ✅ Session resume: after survey submission but before advance, re-fetching session shows correct state
9. ✅ `npm run build` exits 0

Additional manual check: browser walkthrough of the full flow — edit → submit → survey → next sample → survey → next → survey → completion screen.

## Constraints

- D017: All DB queries through `src/lib/db/queries.ts` — no direct schema imports in routes.
- D013: Full text snapshots for revisions (already in place, no change needed).
- D010: `drizzle-kit push` for schema sync, no migration files.
- Survey questions are provisional — the research team may want to change exact wording. Store question IDs as constants, not hardcoded strings throughout.
- The study page layout uses `flex-1 min-w-0` (editor) and `w-[440px]` (chat). The survey phase replaces the editing phase entirely (full-width card centered), not a side panel.

## Common Pitfalls

- **WritingEditor submit flow race condition** — The current flow calls `/advance` which both saves a final revision and advances. When splitting this into save-revision-then-survey-then-advance, ensure the final revision is saved BEFORE transitioning to survey phase. If the revision save fails, don't transition.
- **Survey phase on session resume** — If a participant submits a sample but closes the browser before completing the survey, the session is still `in-progress` at the same `currentSampleIndex`. On resume, the GET API must indicate whether the survey for the current sample has been completed, so the study page can show the survey (not the editor) if the revision was submitted but survey is pending. The `surveyCompleted` flag in the GET response handles this. However, detecting "revision submitted but survey not done" requires a convention — e.g., check if survey responses exist for the current sample.
- **Timing start idempotency** — The `startSampleTiming` call happens when the editing phase loads. If the participant refreshes the page, this shouldn't create duplicate timing records. Use `INSERT OR IGNORE` or check-then-insert pattern keyed on `(session_id, sample_id)`.

## Open Risks

- Survey question wording is provisional. The research team hasn't finalized exact questions (noted in M001 open questions). The implementation should make it easy to change question text without schema changes — store question IDs in DB, display text in constants.
- The survey intercept changes the WritingEditor's submit flow. If the advance endpoint's response shape or the study page's `fetchSession` re-fetch pattern breaks, the participant could get stuck. The verification script must exercise the full 3-sample flow to catch this.
