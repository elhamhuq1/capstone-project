---
id: T03
parent: S02
milestone: M001
provides:
  - GET /api/session/[sessionId] endpoint returning full session state with current sample and revisions
  - POST /api/session/[sessionId] with action:begin to transition status to in-progress
  - InstructionsScreen component with group-specific content (scaffold group has no prompt tips)
  - Study flow page with loading/instructions/editing/completed state machine
  - updateSessionStatus query function in queries.ts
key_files:
  - src/app/api/session/[sessionId]/route.ts
  - src/components/InstructionsScreen.tsx
  - src/app/study/[sessionId]/page.tsx
  - src/lib/db/queries.ts
key_decisions:
  - POST to same session route with action field rather than separate /begin endpoint — keeps routing simple
  - State machine maps DB status directly to UI phase (instructions→instructions, in-progress→editing, completed→completed)
patterns_established:
  - Session API returns structured JSON with currentSample object (id, title, content) and revisions array — T04 consumes this shape
  - Group-specific UI uses switch/case on group string for conditional rendering
  - Study page uses useParams() + useCallback fetchSession pattern for data loading and re-sync after mutations
observability_surfaces:
  - GET /api/session/[sessionId] — inspect any session's full state, current sample, and revision history
  - POST /api/session/[sessionId] with action:begin — triggers status transition from instructions to in-progress
  - Console logs with [session] prefix for server-side errors in the session API route
  - 404 structured JSON response for non-existent sessions
duration: 12m
verification_result: passed
completed_at: 2026-03-17
blocker_discovered: false
---

# T03: Build study flow page with instructions screen and session data API

**Added session data API (GET+POST), group-aware instructions screen, and study flow state machine page with resume support**

## What Happened

Created three files plus a query function addition:

1. **Session API route** (`src/app/api/session/[sessionId]/route.ts`): GET handler fetches session via `getSessionWithCurrentSample()`, resolves current sample content and revision history, returns structured JSON. POST handler accepts `{ action: 'begin' }` to transition status from `instructions` to `in-progress` via new `updateSessionStatus()` query.

2. **InstructionsScreen component** (`src/components/InstructionsScreen.tsx`): Renders numbered step list (revise 3 samples, edit in editor, use chat panel, no time limit). Group-specific callout varies: single-shot gets "one opportunity" note, iterative/scaffold get "as many times as you like", scaffold additionally mentions "a helpful guide" — no prompt engineering tips per R015.

3. **Study flow page** (`src/app/study/[sessionId]/page.tsx`): Client component with 5-phase state machine (loading → instructions → editing → completed → error). Fetches session on mount, maps DB status to UI phase. Begin button POSTs to session API then re-fetches. Editing phase shows placeholder with sample title/content (T04 replaces with WritingEditor). Error state shows "Session not found" with link to /register.

4. **Query addition**: Added `updateSessionStatus(sessionId, status)` to `src/lib/db/queries.ts`.

## Verification

- `npm run build` exits 0 — all routes compile, no TypeScript errors
- `curl GET /api/session/nonexistent` → 404 `{"error":"Session not found"}`
- `curl GET /api/session/VALID_ID` → JSON with id, group, status, currentSample (title+content), revisions array
- `curl POST /api/session/VALID_ID` with `{"action":"begin"}` → status changes to `in-progress`
- Resume flow: POST same email to /api/register → HTTP 200, same sessionId; study page loads at editing phase (skips instructions)
- Browser: register → instructions screen with group-specific text → click Begin → editing placeholder shows "Sample 1/3" with sample title and content preview
- Browser resume: re-register same email → redirects to study page → lands on editing phase directly (not instructions)

### Slice-Level Verification (intermediate — T03 of 4)
- ✅ `npm run build` passes
- ✅ `curl POST /api/register` returns sessionId, group, sampleOrder
- ✅ Same email returns same sessionId (resume)
- ✅ `curl GET /api/session/[sessionId]` returns session state with sample content
- ⬜ `curl POST /api/session/[sessionId]/revision` — T04
- ⬜ `curl POST /api/session/[sessionId]/advance` — T04
- ⬜ `bash scripts/verify-s02.sh` — T04
- ✅ Browser: register → instructions → editing placeholder (full editor in T04)

## Diagnostics

- **Inspect session:** `curl http://localhost:3000/api/session/SESSION_ID`
- **Check status transition:** POST `{"action":"begin"}` then GET to verify status changed to `in-progress`
- **DB direct query:** `node -e "const Database = require('better-sqlite3'); const db = new Database('sqlite.db'); console.log(db.prepare('SELECT id, status, group_assignment, current_sample_index FROM sessions').all())"`

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `src/app/api/session/[sessionId]/route.ts` — GET + POST handler for session data and begin action
- `src/components/InstructionsScreen.tsx` — Group-aware pre-study instructions with numbered steps
- `src/app/study/[sessionId]/page.tsx` — Study flow page with loading/instructions/editing/completed/error state machine
- `src/lib/db/queries.ts` — Added `updateSessionStatus()` function
- `.gsd/milestones/M001/slices/S02/tasks/T03-PLAN.md` — Added Observability Impact section
