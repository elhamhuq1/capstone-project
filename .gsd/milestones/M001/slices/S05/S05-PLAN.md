# S05: Researcher Dashboard + CSV Export

**Goal:** Researchers can browse all participant sessions, view detailed prompt/response history, revision snapshots, survey answers, filter by group, and export everything to CSV.
**Demo:** Navigate to `/researcher`, see a table of all sessions filterable by group, click into a session to see full detail (prompts, AI responses, revisions, survey ratings, timing), click "Export CSV" to download a file with one row per sample-per-session including all computed metrics.

## Must-Haves

- Aggregate query functions in `src/lib/db/queries.ts` (D017) for session list, session detail, and CSV export data
- GET `/api/researcher/sessions` returns all sessions with participant info, group, computed stats; supports `?group=` filter
- GET `/api/researcher/sessions/[sessionId]` returns full session detail: prompts, AI responses, revisions, survey responses, timings
- GET `/api/researcher/export` returns CSV download with correct `Content-Type: text/csv` and `Content-Disposition: attachment` headers
- CSV has one row per sample-per-session with columns: participant_name, participant_email, group, sample_id, sample_title, sample_index, prompt_count, total_prompt_chars, revision_count, time_seconds, survey_authorship, survey_satisfaction, survey_cognitive_load, survey_helpfulness, survey_future_intent, session_status, session_started_at, session_completed_at
- CSV properly escapes fields containing commas, quotes, or newlines
- `/researcher` page lists all sessions in a table with group filter (all/single-shot/iterative/scaffold)
- `/researcher/[sessionId]` page shows full session detail with expandable sections per sample

## Verification

- `npm run build` passes (type-checks all new routes and pages)
- `bash scripts/verify-s05.sh` exercises:
  - Seeds 3 participants (one per group) through registration + full 3-sample flow
  - GET `/api/researcher/sessions` returns all 3 sessions with correct groups
  - GET `/api/researcher/sessions?group=single-shot` filters correctly
  - GET `/api/researcher/sessions/[id]` returns full detail with prompts, revisions, surveys, timings
  - GET `/api/researcher/export` returns CSV with correct Content-Type and Content-Disposition headers
  - CSV has expected column headers
  - CSV has 9 data rows (3 participants × 3 samples)
  - CSV contains survey ratings and computed time values
  - GET `/api/researcher/sessions/nonexistent-id` returns 404 with `{ "error": "Session not found" }` (failure-path check)
  - GET `/api/researcher/sessions` returns `[]` when no sessions match filter (empty-state check)

## Observability / Diagnostics

- Runtime signals: none (read-only dashboard, no state transitions)
- Inspection surfaces: GET `/api/researcher/sessions` for session overview; GET `/api/researcher/export` for full data dump; SQLite tables directly queryable via node+better-sqlite3
- Failure visibility: API routes return descriptive error messages; CSV export includes all columns even when values are null
- Redaction constraints: participant email is included in researcher view (not public-facing, localhost only per D008)

## Integration Closure

- Upstream surfaces consumed: `src/lib/db/schema.ts` (8 tables), `src/lib/db/queries.ts` (existing per-session query functions), `src/lib/db/index.ts` (db instance)
- New wiring introduced in this slice: 3 new API routes under `/api/researcher/`, 2 new pages under `/researcher/`
- What remains before the milestone is truly usable end-to-end: **nothing** — this is the final slice (S05), completing the milestone

## Tasks

- [x] **T01: Add aggregate queries and researcher API routes** `est:45m`
  - Why: Creates the data layer and API endpoints that both the dashboard UI and CSV export depend on. All DB access through centralized query layer per D017.
  - Files: `src/lib/db/queries.ts`, `src/app/api/researcher/sessions/route.ts`, `src/app/api/researcher/sessions/[sessionId]/route.ts`, `src/app/api/researcher/export/route.ts`
  - Do: Add 4 aggregate query functions to queries.ts (getAllSessions, getSessionDetail, getExportData, getAllWritingSamples). Create 3 GET-only API routes — sessions list with ?group filter, session detail, CSV export with proper headers and field escaping.
  - Verify: `npm run build` passes; manual curl against the 3 endpoints returns expected shapes
  - Done when: All 3 API routes return correct data; CSV has proper headers, escaping, and Content-Disposition

- [x] **T02: Build researcher dashboard pages** `est:40m`
  - Why: Creates the UI for researchers to browse sessions and view detailed data. Consumes the API routes from T01.
  - Files: `src/app/researcher/page.tsx`, `src/app/researcher/[sessionId]/page.tsx`, `src/app/researcher/layout.tsx`
  - Do: Build session list page with table (name, email, group, status, samples completed, started) and group filter buttons. Build session detail page with participant info header, 3 sample cards each showing prompts+AI responses, revision list, survey ratings, and timing. Add export CSV download button/link. Use Tailwind CSS v4 classes matching existing component patterns.
  - Verify: `npm run build` passes; pages render in browser at `/researcher` and `/researcher/[sessionId]`
  - Done when: Session list shows all participants with working group filter; session detail shows complete data per sample; CSV export link works

- [x] **T03: Write verification script and validate requirements** `est:25m`
  - Why: Proves R011 (researcher dashboard) and R012 (CSV export) are met with automated checks. Follows the verify-s04.sh pattern for consistency.
  - Files: `scripts/verify-s05.sh`
  - Do: Write idempotent bash script that seeds 3 test participants (one per group) through the full study flow (register → begin → timing+revision+survey+advance ×3), then exercises all researcher API endpoints and validates CSV output. Use unique email suffixes per run. Check session list, group filtering, session detail, CSV headers, CSV row count, CSV content.
  - Verify: `bash scripts/verify-s05.sh` — all checks pass
  - Done when: Script runs green with all checks passing; `npm run build` exits 0

## Files Likely Touched

- `src/lib/db/queries.ts`
- `src/app/api/researcher/sessions/route.ts`
- `src/app/api/researcher/sessions/[sessionId]/route.ts`
- `src/app/api/researcher/export/route.ts`
- `src/app/researcher/page.tsx`
- `src/app/researcher/[sessionId]/page.tsx`
- `src/app/researcher/layout.tsx`
- `scripts/verify-s05.sh`
