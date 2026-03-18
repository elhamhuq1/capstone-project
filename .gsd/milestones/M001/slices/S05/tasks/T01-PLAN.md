---
estimated_steps: 8
estimated_files: 4
---

# T01: Add aggregate queries and researcher API routes

**Slice:** S05 — Researcher Dashboard + CSV Export
**Milestone:** M001

## Description

Build the complete backend for the researcher dashboard: aggregate query functions in the centralized query layer (D017) and three GET-only API routes. The query functions join across all 8 SQLite tables to produce session lists with stats, full session detail, and denormalized export rows. The CSV export route generates a downloadable file with proper escaping and headers. No new dependencies needed — CSV is generated via string concatenation.

**Relevant skills:** None required — standard Next.js App Router API routes and Drizzle ORM queries following established codebase patterns.

## Steps

1. **Add `getAllSessions()` to `src/lib/db/queries.ts`** — Query all sessions joined with participants to get name/email. For each session, compute: samples completed (currentSampleIndex capped at 3), total prompt count (count from prompts table), total time spent (sum of completed_at - started_at from sample_timings). Return array sorted by startedAt descending. Accept optional `group` parameter to filter by groupAssignment.

2. **Add `getSessionDetail()` to `src/lib/db/queries.ts`** — Given a sessionId, return: participant info (name, email), session info (group, status, sampleOrder, startedAt, completedAt), and for each sample in the session's sampleOrder: the writing sample title/content, all prompts with their AI responses (ordered by promptNumber), all revisions (ordered by revisionNumber), survey responses (5 ratings keyed by questionId), and timing (started_at, completed_at, computed time_seconds). Use sequential queries (consistent with existing pattern) — fetch session, then fetch related data per sample.

3. **Add `getExportData()` to `src/lib/db/queries.ts`** — Produces a flat array of rows for CSV export, one row per sample-per-session. Each row contains: participant_name, participant_email, group, sample_id, sample_title, sample_index, prompt_count, total_prompt_chars, revision_count, time_seconds, survey_authorship, survey_satisfaction, survey_cognitive_load, survey_helpfulness, survey_future_intent, session_status, session_started_at, session_completed_at. Use sequential queries: get all sessions with participants, then for each session iterate through sampleOrder and aggregate prompts/revisions/surveys/timings.

4. **Create `src/app/api/researcher/sessions/route.ts`** — GET handler. Calls `getAllSessions()`. Accepts optional `?group=` query param (one of: single-shot, iterative, scaffold). Returns JSON array. No auth needed (D008).

5. **Create `src/app/api/researcher/sessions/[sessionId]/route.ts`** — GET handler. Calls `getSessionDetail(sessionId)` from the URL param. Returns 404 if session not found. Returns full JSON object.

6. **Create `src/app/api/researcher/export/route.ts`** — GET handler. Calls `getExportData()`. Builds CSV string with header row and data rows. Every field value must be wrapped in double quotes with internal double quotes escaped by doubling (`"` → `""`). Also escape/handle newlines within fields (replace with space or keep within quotes). Set response headers: `Content-Type: text/csv`, `Content-Disposition: attachment; filename="study-export.csv"`. Return as a `new Response(csvString, { headers })`.

7. **Add `getAllWritingSamples()` to `src/lib/db/queries.ts`** — Simple: select all from writingSamples table. Used by session detail to show sample titles/content.

8. **Verify with `npm run build`** and test with curl commands against the running dev server.

## Must-Haves

- [ ] All DB queries go through `src/lib/db/queries.ts` — no direct DB access from route handlers (D017)
- [ ] `getAllSessions(group?)` returns sessions with participant name/email, group, status, computed stats
- [ ] `getSessionDetail(sessionId)` returns full session data with per-sample prompts, AI responses, revisions, surveys, timings
- [ ] `getExportData()` returns flat array with one entry per sample-per-session, all 18 columns
- [ ] GET `/api/researcher/sessions` returns JSON array; supports `?group=` filter
- [ ] GET `/api/researcher/sessions/[sessionId]` returns full detail JSON; 404 for missing session
- [ ] GET `/api/researcher/export` returns CSV with `Content-Type: text/csv` and `Content-Disposition: attachment; filename="study-export.csv"`
- [ ] CSV fields properly escaped (double-quote wrapping, internal quote doubling)
- [ ] `npm run build` passes with no type errors

## Verification

- `npm run build` exits 0
- `curl http://localhost:3000/api/researcher/sessions` returns JSON array
- `curl http://localhost:3000/api/researcher/sessions?group=single-shot` returns filtered results
- `curl -I http://localhost:3000/api/researcher/export` shows `content-type: text/csv` and `content-disposition: attachment`

## Observability Impact

- **New inspection surfaces:** 3 GET API routes (`/api/researcher/sessions`, `/api/researcher/sessions/[id]`, `/api/researcher/export`) provide read-only views into all study data across 8 tables
- **Failure signals:** Each route returns structured JSON error with descriptive message on 500; session detail returns 404 JSON for missing sessions; console.error logs include route prefix (e.g., `[researcher/sessions]`)
- **How to inspect:** `curl localhost:3000/api/researcher/sessions` for session overview; `curl localhost:3000/api/researcher/export` for full denormalized dump; check server console for `[researcher/*]` error logs
- **What failure state becomes visible:** Empty arrays on no data (not errors); 404 with `{ error: "Session not found" }` for invalid session IDs; 500 with `{ error: "Failed to ..." }` for DB errors

## Inputs

- `src/lib/db/schema.ts` — 8 table definitions (participants, sessions, writingSamples, revisions, prompts, aiResponses, surveyResponses, sampleTimings)
- `src/lib/db/queries.ts` — existing per-session query functions to follow as patterns
- `src/lib/db/index.ts` — db instance export
- S04 summary: survey_responses has columns id, session_id, sample_id, question_id, rating, created_at (5 rows per sample); sample_timings has id, session_id, sample_id, sample_index, started_at, completed_at; session status transitions: 'not-started' → 'in-progress' → 'completed'

## Expected Output

- `src/lib/db/queries.ts` — extended with 4 new functions: getAllSessions, getSessionDetail, getExportData, getAllWritingSamples
- `src/app/api/researcher/sessions/route.ts` — new GET route
- `src/app/api/researcher/sessions/[sessionId]/route.ts` — new GET route
- `src/app/api/researcher/export/route.ts` — new GET route returning CSV
