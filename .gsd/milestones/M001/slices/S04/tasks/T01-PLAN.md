---
estimated_steps: 7
estimated_files: 6
---

# T01: Add survey + timing data layer with API routes

**Slice:** S04 — Data Logging + Survey + Completion
**Milestone:** M001

## Description

Build the complete data layer for S04: two new DB tables (surveyResponses, sampleTimings), query functions in the centralized query layer, survey question constants, and three API route changes (new POST survey, new POST timing, extended GET session). This task produces the backend that T02's UI components consume. All queries go through `src/lib/db/queries.ts` per D017.

**Relevant skill:** None required — standard Drizzle ORM + Next.js API route patterns already established in the codebase.

## Steps

1. **Add `surveyResponses` and `sampleTimings` tables to `src/lib/db/schema.ts`.**

   Add after the existing `aiResponses` table definition:

   ```typescript
   export const surveyResponses = sqliteTable('survey_responses', {
     id: integer('id').primaryKey({ autoIncrement: true }),
     sessionId: text('session_id').notNull(),
     sampleId: integer('sample_id').notNull(),
     questionId: text('question_id').notNull(),
     rating: integer('rating').notNull(),
     createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
   });

   export const sampleTimings = sqliteTable('sample_timings', {
     id: integer('id').primaryKey({ autoIncrement: true }),
     sessionId: text('session_id').notNull(),
     sampleId: integer('sample_id').notNull(),
     sampleIndex: integer('sample_index').notNull(),
     startedAt: text('started_at').default(sql`(datetime('now'))`).notNull(),
     completedAt: text('completed_at'),
   });
   ```

2. **Run `npx drizzle-kit push` to sync the schema to SQLite.** Verify the tables exist by querying with node+better-sqlite3.

3. **Create `src/lib/survey.ts` with survey question constants.**

   ```typescript
   export const SURVEY_QUESTIONS = [
     { id: 'authorship', text: 'I feel a sense of ownership over the final revised text.' },
     { id: 'satisfaction', text: 'I am satisfied with the quality of my revision.' },
     { id: 'cognitive_load', text: 'The revision process required significant mental effort.' },
     { id: 'helpfulness', text: 'The AI suggestions were helpful for improving the writing.' },
     { id: 'future_intent', text: 'I would use a similar AI-assisted process for future writing tasks.' },
   ] as const;

   export type SurveyQuestionId = typeof SURVEY_QUESTIONS[number]['id'];
   ```

4. **Add query functions to `src/lib/db/queries.ts`.**

   Import the new tables (`surveyResponses`, `sampleTimings`) from schema. Add these functions:

   - `saveSurveyResponses(sessionId: string, sampleId: number, responses: Array<{ questionId: string; rating: number }>)` — inserts all 5 responses in a loop via `db.insert(surveyResponses).values(...)`.
   - `getSurveyResponses(sessionId: string, sampleId: number)` — selects all survey responses for a session+sample pair, returns array of `{ questionId, rating }`.
   - `startSampleTiming(sessionId: string, sampleId: number, sampleIndex: number)` — **idempotent**: first check if a row exists for (session_id, sample_id), if not insert. This prevents duplicate timing records on page refresh.
   - `completeSampleTiming(sessionId: string, sampleId: number)` — updates the existing timing record to set `completed_at` to `datetime('now')` where session_id and sample_id match.
   - `getSampleTimings(sessionId: string)` — selects all timing records for a session.

5. **Create POST `/api/session/[sessionId]/survey/route.ts`.**

   - Parse body: `{ sampleId: number, responses: Array<{ questionId: string, rating: number }> }`
   - Validate: session exists (via `getSession`), session not completed, `sampleId` is a number, `responses` is an array of length 5, each has a valid `questionId` (one of the 5 known IDs), and `rating` is an integer 1-5.
   - Call `saveSurveyResponses()` from queries.ts.
   - Return 200 `{ success: true }`.
   - Return 400 for validation errors, 404 for missing session.

   Import the SURVEY_QUESTIONS from `src/lib/survey.ts` for questionId validation.

6. **Create POST `/api/session/[sessionId]/timing/route.ts`.**

   - Parse body: `{ sampleId: number, sampleIndex: number, event: 'start' | 'complete' }`
   - Validate: session exists, sampleId is a number.
   - On `event: 'start'`: call `startSampleTiming()` (idempotent).
   - On `event: 'complete'`: call `completeSampleTiming()`.
   - Return 200 `{ success: true }`.
   - Return 400 for invalid event or missing fields, 404 for missing session.

7. **Extend GET `/api/session/[sessionId]/route.ts`.**

   After the existing `messages` construction, add two checks for the current sample (when `sample` is not null):
   - `sampleSubmitted`: call `getSampleTimings()` or a targeted query — check if a timing record exists for (sessionId, currentSampleId) with a non-null `completed_at`. Simpler: do a query like `getSurveyResponses(sessionId, sample.id)` to check survey and a similar for timing.
   - Actually, use more targeted approach: query sampleTimings for the current sample to check if `completed_at` is set → `sampleSubmitted: boolean`. Query surveyResponses for current sample to check if any rows exist → `surveyCompleted: boolean`.
   - Add both booleans to the JSON response object.

   Import `getSurveyResponses` and `getSampleTimings` (or add a targeted helper like `isSampleSubmitted` and `isSurveyCompleted`). Keep it simple — use existing query functions and check result length / values.

## Must-Haves

- [ ] `surveyResponses` table exists in SQLite with columns: id, session_id, sample_id, question_id, rating, created_at
- [ ] `sampleTimings` table exists in SQLite with columns: id, session_id, sample_id, sample_index, started_at, completed_at
- [ ] `saveSurveyResponses`, `getSurveyResponses`, `startSampleTiming`, `completeSampleTiming`, `getSampleTimings` functions exist in queries.ts
- [ ] SURVEY_QUESTIONS constant defined in src/lib/survey.ts with 5 questions
- [ ] POST /api/session/[sessionId]/survey validates input and saves survey responses
- [ ] POST /api/session/[sessionId]/timing handles start/complete events idempotently
- [ ] GET /api/session/[sessionId] response includes `sampleSubmitted` and `surveyCompleted` booleans
- [ ] All DB operations use queries.ts — no direct schema imports in route files (D017)
- [ ] `npm run build` exits 0

## Verification

- `npx drizzle-kit push` succeeds without errors
- `npm run build` exits 0
- Quick manual verification with node+better-sqlite3 confirming tables exist:
  ```bash
  node -e "const Database = require('better-sqlite3'); const db = new Database('sqlite.db'); console.log(db.prepare(\"SELECT name FROM sqlite_master WHERE type='table' AND name IN ('survey_responses','sample_timings')\").all())"
  ```

## Observability Impact

- Signals added: `surveyResponses` rows (one per question per sample per session) and `sampleTimings` rows (one per sample per session with start/end timestamps)
- How a future agent inspects this: `GET /api/session/{sessionId}` returns `sampleSubmitted` and `surveyCompleted` flags; DB tables queryable via `node -e` with better-sqlite3
- Failure state exposed: survey route returns 400 with descriptive validation errors; timing route returns 400/404 on bad input

## Inputs

- `src/lib/db/schema.ts` — existing table definitions (participants, sessions, writingSamples, revisions, prompts, aiResponses)
- `src/lib/db/queries.ts` — existing query functions (15 functions, all follow centralized pattern)
- `src/lib/db/index.ts` — database singleton (`db` export)
- `src/app/api/session/[sessionId]/route.ts` — existing GET handler returning session data with messages
- `drizzle.config.ts` — existing Drizzle config for push

## Expected Output

- `src/lib/db/schema.ts` — extended with `surveyResponses` and `sampleTimings` table definitions
- `src/lib/db/queries.ts` — extended with 5 new query functions
- `src/lib/survey.ts` — new file with SURVEY_QUESTIONS constant and SurveyQuestionId type
- `src/app/api/session/[sessionId]/survey/route.ts` — new POST route
- `src/app/api/session/[sessionId]/timing/route.ts` — new POST route
- `src/app/api/session/[sessionId]/route.ts` — extended GET response with sampleSubmitted and surveyCompleted
