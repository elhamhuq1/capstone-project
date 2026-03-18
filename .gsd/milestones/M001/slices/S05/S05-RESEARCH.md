# S05: Researcher Dashboard + CSV Export — Research

**Date:** 2026-03-17
**Depth:** Light — standard read-only dashboard + CSV export over known SQLite data using established codebase patterns.

## Summary

S05 builds a researcher-facing dashboard and CSV export on top of the complete research dataset already captured in SQLite across slices S01–S04. All 8 tables are populated (participants, sessions, writing_samples, revisions, prompts, ai_responses, survey_responses, sample_timings). The existing centralized query layer (`src/lib/db/queries.ts`, per D017) has per-session accessors; S05 needs aggregate queries that span all sessions.

The dashboard is a read-only web UI at `/researcher` — no auth needed (localhost-only study, D008). It lists all participant sessions with group filtering, and links to per-session detail views showing prompt/response history, revision snapshots, survey answers, and timing. The CSV export endpoint generates a downloadable file with one row per sample-per-session (the natural unit for research analysis), embedding computed metrics like time-per-sample, prompt count, total prompt character length, revision count, and all 5 survey ratings as columns.

No new libraries are needed. CSV generation is simple string concatenation — the data shape is flat and small-scale (dozens of participants × 3 samples each). Tailwind CSS v4 is already configured. Next.js App Router patterns from S02–S04 apply directly.

## Recommendation

Build in three layers: (1) aggregate query functions in `queries.ts`, (2) two API routes for dashboard data and CSV download, (3) two client pages for session list and session detail. Use a `GET /api/researcher/export` route that returns `text/csv` with `Content-Disposition: attachment` header — the browser handles download natively. No CSV library needed.

## Implementation Landscape

### Key Files

- `src/lib/db/queries.ts` — **Add** ~4 aggregate query functions: `getAllSessions()` (joins participants for name/email), `getSessionDetail(sessionId)` (all prompts, revisions, surveys, timings for one session), `getAllWritingSamples()`, `getExportData()` (denormalized rows for CSV). Follow existing patterns — Drizzle select/join, return typed arrays.
- `src/lib/db/schema.ts` — **Read only**. 8 tables already defined. No schema changes.
- `src/app/researcher/page.tsx` — **New**. Client component. Fetches session list from API, renders table with group filter (dropdown or button group for single-shot/iterative/scaffold/all). Each row links to detail view. Shows: participant name, email, group, status, sample count completed, session start time.
- `src/app/researcher/[sessionId]/page.tsx` — **New**. Client component. Fetches one session's full detail. Sections: participant info, sample progression (3 cards), each card expandable with prompts/AI responses, revision list, survey ratings, timing.
- `src/app/api/researcher/sessions/route.ts` — **New**. GET returns all sessions with participant info and computed stats (samples completed, total prompts, time spent).
- `src/app/api/researcher/sessions/[sessionId]/route.ts` — **New**. GET returns full session detail: all prompts + AI responses, all revisions, all survey responses, all timings, participant info.
- `src/app/api/researcher/export/route.ts` — **New**. GET returns CSV download. One row per sample-per-session. Columns: participant_name, participant_email, group, sample_id, sample_title, sample_index, prompt_count, total_prompt_chars, revision_count, time_seconds, survey_authorship, survey_satisfaction, survey_cognitive_load, survey_helpfulness, survey_future_intent, session_status, session_started_at, session_completed_at.
- `scripts/verify-s05.sh` — **New**. Verification script following S02–S04 pattern.

### Build Order

1. **Query layer first** — add aggregate functions to `queries.ts`. This unblocks both API routes and CSV export. Test with a node one-liner against existing study data (or seed test data via the registration/study APIs used in verify-s04.sh).
2. **API routes** — `/api/researcher/sessions` (list), `/api/researcher/sessions/[sessionId]` (detail), `/api/researcher/export` (CSV). All GET-only, read-only. Can verify with curl.
3. **Dashboard pages** — `/researcher` (list + filter) and `/researcher/[sessionId]` (detail). Standard client components fetching from the API routes above.
4. **Verification script** — seeds test data (reuse verify-s04.sh flow pattern), hits API endpoints, checks CSV output columns and row count, checks build passes.

### Verification Approach

- `npm run build` passes (type-checks all new routes and pages)
- `bash scripts/verify-s05.sh` exercises:
  - Seed a multi-participant dataset (3 participants, one per group) through registration + full 3-sample flow (reuse verify-s04.sh patterns)
  - GET `/api/researcher/sessions` returns all 3 sessions with correct group assignments
  - GET `/api/researcher/sessions` with `?group=single-shot` filters correctly
  - GET `/api/researcher/sessions/[id]` returns full detail with prompts, revisions, surveys, timings
  - GET `/api/researcher/export` returns CSV with correct Content-Type, Content-Disposition headers
  - CSV has expected column headers
  - CSV has 9 data rows (3 participants × 3 samples)
  - CSV contains survey ratings and computed time values
- Browser walkthrough: navigate to `/researcher`, see session list, filter by group, click into a session, view full detail, click export, confirm CSV downloads

## Constraints

- All DB queries must go through `src/lib/db/queries.ts` (D017) — no direct DB access from route handlers.
- No auth/access control needed — localhost-only deployment (D008).
- CSV must include all fields listed in R012: participant info, group, all prompts, responses, revision history, survey answers, timestamps, computed metrics.
- Tailwind CSS v4 with `@tailwindcss/postcss` plugin — no `tailwind.config` file. Use Tailwind classes directly in JSX (established pattern in all existing components).

## Common Pitfalls

- **CSV escaping** — if prompt or AI response content contains commas, quotes, or newlines, the CSV will break. Wrap every field in double quotes and escape internal double quotes by doubling them (`"` → `""`). This is trivial to implement manually but easy to forget.
- **Drizzle joins** — the existing query layer uses sequential queries (fetch session, then fetch related). For the export query, a single join would be more efficient but Drizzle's join API is slightly different from select. The sequential approach is fine for study-scale data (< 100 participants); don't over-optimize.
- **Large AI response text in CSV** — AI responses can be multi-paragraph. The export CSV should include full prompt and response text (researchers need it), but the dashboard detail view should truncate/expand for readability.
