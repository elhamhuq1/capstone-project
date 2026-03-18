---
id: S05
parent: M001
milestone: M001
provides:
  - GET /api/researcher/sessions — session list with optional ?group= filter
  - GET /api/researcher/sessions/[sessionId] — full session detail with per-sample prompts, revisions, survey, timing
  - GET /api/researcher/export — CSV download with 18 columns, one row per sample-per-session
  - /researcher page — session list table with group filter badges
  - /researcher/[sessionId] page — session detail with collapsible per-sample cards
  - getAllSessions(group?), getSessionDetail(sessionId), getExportData(), getAllWritingSamples() aggregate queries
requires:
  - slice: S04
    provides: Complete SQLite data — participants, sessions, prompts, AI responses, revision snapshots, survey responses, timestamps, per-sample timing
  - slice: S02
    provides: Session/participant schema, revision data, queries.ts centralized query layer
  - slice: S03
    provides: Prompt/AI response data, mode metadata
affects: []
key_files:
  - src/lib/db/queries.ts
  - src/app/api/researcher/sessions/route.ts
  - src/app/api/researcher/sessions/[sessionId]/route.ts
  - src/app/api/researcher/export/route.ts
  - src/app/researcher/layout.tsx
  - src/app/researcher/page.tsx
  - src/app/researcher/[sessionId]/page.tsx
  - scripts/verify-s05.sh
key_decisions:
  - D020: CSV field escaping via manual string ops (no external library) — double-quote wrapping, internal quote doubling, newline replacement
  - D021: Client components with useState+useEffect fetch to /api/researcher/* routes; server component layout only
  - Used $dynamic() for optional group filter instead of conditional query building
  - Accepted balanced group assignment in verification (registration API doesn't support forced assignment)
patterns_established:
  - Researcher API routes: GET-only, structured error responses prefixed [researcher/*], 404 for missing, 400 for invalid params, 500 for DB errors
  - Aggregate queries use sequential per-session iteration (consistent with existing codebase)
  - Group filter badges use consistent color mapping (amber=single-shot, sky=iterative, violet=scaffold)
  - TruncatedText component for long content with expand/collapse
  - Collapsible sections in detail views to avoid overwhelming display
observability_surfaces:
  - GET /api/researcher/sessions — session overview with computed stats (samplesCompleted, totalPrompts, totalTimeSeconds)
  - GET /api/researcher/export — full denormalized data dump as CSV (18 columns)
  - GET /api/researcher/sessions/{id} — per-sample breakdown with prompts, revisions, survey, timing
  - console.error logs prefixed [researcher/sessions], [researcher/sessions/detail], [researcher/export]
  - 404 JSON { error: "Session not found" } for invalid session IDs
  - 400 JSON for invalid group filter values
  - 500 JSON { error: "Failed to ..." } for DB errors
drill_down_paths:
  - .gsd/milestones/M001/slices/S05/tasks/T01-SUMMARY.md
  - .gsd/milestones/M001/slices/S05/tasks/T02-SUMMARY.md
  - .gsd/milestones/M001/slices/S05/tasks/T03-SUMMARY.md
duration: 42m
verification_result: passed
completed_at: 2026-03-17
---

# S05: Researcher Dashboard + CSV Export

**Researcher-facing session browser with group filtering, per-sample detail views (prompts, revisions, survey, timing), and 18-column CSV export — completing the research data pipeline from participant interaction to analysis-ready export.**

## What Happened

Built the final data access layer for the study app in three tasks:

**T01 (data layer + API routes):** Extended `src/lib/db/queries.ts` with 4 aggregate functions — `getAllSessions(group?)` computes per-session stats (samplesCompleted, totalPrompts, totalTimeSeconds) with optional group filter via Drizzle's `$dynamic()`; `getSessionDetail(sessionId)` returns full per-sample breakdown with prompts+AI responses, revisions, survey map, and timing; `getExportData()` produces flat 18-column rows for CSV; `getAllWritingSamples()` lists all seeded samples. Created 3 GET-only API routes: `/api/researcher/sessions` (list with ?group filter), `/api/researcher/sessions/[sessionId]` (detail, 404 for missing), `/api/researcher/export` (CSV with Content-Type text/csv and Content-Disposition attachment headers, fields double-quote wrapped with escaped internals).

**T02 (dashboard UI):** Built server component layout with sticky header, Home link, and Export CSV download button. Session list page (`/researcher`) fetches from the API, displays sessions in a table (name, email, group badge, status badge, samples X/3, started at) with 4 group filter buttons (All, Single-Shot, Iterative, Scaffold). Detail page (`/researcher/[sessionId]`) shows participant info header, then per-sample cards with collapsible sections for prompts+AI responses, revisions, and survey ratings. TruncatedText component handles long content. Color coding: amber for single-shot, sky for iterative, violet for scaffold.

**T03 (verification):** Created `scripts/verify-s05.sh` with 12 automated checks — seeds 3 participants through the complete 3-sample flow, validates session list API, group filtering, session detail, CSV headers/content-type/disposition, CSV column count, data rows (≥9), survey ratings, and `npm run build`. All 12 checks pass.

## Verification

- `bash scripts/verify-s05.sh` — **12/12 passed**
  - 3 participants seeded through full 3-sample flow (register → begin → timing/revision/survey/advance ×3)
  - GET `/api/researcher/sessions` returns ≥3 sessions with correct structure ✅
  - Group filter returns only matching sessions ✅
  - Session list includes participantName, participantEmail, group, status fields ✅
  - Session detail returns 200 with 3 samples each containing prompts, revisions, survey, timing ✅
  - Nonexistent session returns 404 with `{ "error": "Session not found" }` ✅
  - CSV Content-Type is text/csv ✅
  - CSV Content-Disposition contains attachment ✅
  - CSV has all 18 expected column headers ✅
  - CSV has ≥9 data rows (actual: 56 from accumulated test runs) ✅
  - CSV contains survey ratings with numeric values (1-5) ✅
  - `npm run build` exits 0 ✅
- Idempotent: script passes on repeated runs with different session IDs
- `/researcher` page returns HTTP 200

## Requirements Advanced

- R011 — Built complete researcher dashboard: session list with group filtering, session detail with per-sample prompts/revisions/survey/timing
- R012 — Built CSV export: 18-column denormalized output with proper Content-Type/Content-Disposition headers, field escaping

## Requirements Validated

- R011 — /researcher page renders filterable session list; /researcher/[sessionId] shows full per-sample detail; verify-s05.sh checks 1-6 prove API returns correct structured data, filtering works, 404 for missing sessions
- R012 — GET /api/researcher/export returns text/csv with attachment disposition; 18 columns covering participant info, group, sample data, prompt stats, revision count, timing, all 5 survey dimensions, session status and timestamps; verify-s05.sh checks 7-11 prove headers, column presence, data rows, and survey values

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Deviations

None. All 3 tasks executed as planned.

## Known Limitations

- No authentication on researcher routes — acceptable for localhost-only deployment (D008) but would need protection if ever exposed publicly
- CSV export includes all sessions — no date range or group filter on the export endpoint itself (session list API supports group filter but export does not)
- Verification script accepts balanced group assignment rather than force-assigning specific groups — tests filtering on whatever group is assigned rather than always testing a specific group name

## Follow-ups

None. This is the final slice (S05) of milestone M001. All 16 requirements (R001-R016) are now validated.

## Files Created/Modified

- `src/lib/db/queries.ts` — Added getAllSessions, getSessionDetail, getExportData, getAllWritingSamples aggregate query functions
- `src/app/api/researcher/sessions/route.ts` — GET route for session listing with optional ?group= filter
- `src/app/api/researcher/sessions/[sessionId]/route.ts` — GET route for full session detail (404 for missing)
- `src/app/api/researcher/export/route.ts` — GET route for CSV export with proper headers and field escaping
- `src/app/researcher/layout.tsx` — Server component layout with sticky header, nav, Export CSV button
- `src/app/researcher/page.tsx` — Client component session list with group filter buttons and session table
- `src/app/researcher/[sessionId]/page.tsx` — Client component detail page with per-sample cards, collapsible sections
- `scripts/verify-s05.sh` — 12-check idempotent verification script covering all researcher API endpoints and CSV export

## Forward Intelligence

### What the next slice should know
- All 16 requirements (R001-R016) are validated. Milestone M001 is feature-complete.
- The data pipeline is: participant action → SQLite (8 tables) → aggregate queries → API routes → JSON/CSV. All researcher data access goes through `src/lib/db/queries.ts`.
- The CSV export is a denormalized flat file (one row per sample-per-session, 18 columns). Any analysis tool can import it directly.

### What's fragile
- CSV escaping is manual string manipulation — if fields ever contain complex nested quotes or multi-line content beyond simple text, edge cases could surface. Current content (writing samples, survey ratings, timestamps) is safe.
- Aggregate queries iterate per-session sequentially. This is fine for study-scale data (tens to low hundreds of sessions) but would need optimization for thousands.

### Authoritative diagnostics
- `bash scripts/verify-s05.sh` — proves API routes, filtering, detail, CSV export, and build in one automated pass. Exit code 0 = everything works.
- `curl http://localhost:3000/api/researcher/sessions` — instant health check for the data layer.
- `curl -D - http://localhost:3000/api/researcher/export` — verifies CSV headers and content in one command.

### What assumptions changed
- No assumptions changed. S05 was low-risk and executed cleanly against the complete data layer from S01-S04.
