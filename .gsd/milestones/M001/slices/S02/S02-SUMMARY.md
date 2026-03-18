---
id: S02
parent: M001
milestone: M001
provides:
  - Database schema with sessions, writingSamples, revisions tables (Drizzle ORM)
  - 3 seeded writing samples with deliberate grammar errors (Grammarly scores 54/64/75)
  - 11 CRUD query functions in shared query layer (src/lib/db/queries.ts)
  - POST /api/register with balanced group assignment, Fisher-Yates sample randomization, session resume
  - GET /api/session/[sessionId] returning full session state with current sample and revisions
  - POST /api/session/[sessionId] with action:begin for status transitions
  - POST /api/session/[sessionId]/revision for saving full-text revision snapshots
  - POST /api/session/[sessionId]/advance for sample progression with auto-completion
  - RegistrationForm client component with loading/error states and redirect
  - InstructionsScreen component with group-specific content
  - WritingEditor component with textarea, revision save/view, history sidebar, sample progression
  - Study flow page with loading/instructions/editing/completed/error state machine
  - End-to-end verification script (scripts/verify-s02.sh) with 12 automated checks
requires:
  - slice: S01
    provides: Next.js project scaffold, src/lib/db/index.ts (database singleton), src/lib/db/schema.ts (participants table), next.config.ts (serverExternalPackages), Tailwind CSS setup
affects:
  - S03
  - S04
key_files:
  - src/lib/db/schema.ts
  - src/lib/db/queries.ts
  - src/lib/samples.ts
  - src/components/RegistrationForm.tsx
  - src/components/InstructionsScreen.tsx
  - src/components/WritingEditor.tsx
  - src/app/register/page.tsx
  - src/app/api/register/route.ts
  - src/app/study/[sessionId]/page.tsx
  - src/app/api/session/[sessionId]/route.ts
  - src/app/api/session/[sessionId]/revision/route.ts
  - src/app/api/session/[sessionId]/advance/route.ts
  - src/app/page.tsx
  - src/app/layout.tsx
  - scripts/verify-s02.sh
key_decisions:
  - crypto.randomUUID() for session IDs — no nanoid dependency
  - Full text snapshots in revisions, not character-level diffs
  - Sample order stored as JSON string in TEXT column, parsed on read
  - Balanced assignment picks group with fewest sessions; ties broken randomly
  - Fisher-Yates shuffle for sample order randomization (unbiased)
  - Email normalized to lowercase before lookup to prevent duplicates
  - All DB queries go through src/lib/db/queries.ts — no direct schema access from routes
  - seedWritingSamples() uses onConflictDoNothing for idempotent seeding
  - API routes return structured JSON with descriptive error messages and appropriate HTTP status codes
patterns_established:
  - Centralized query layer — all data operations via queries.ts, routes never import schema directly
  - Idempotent seeding — seedWritingSamples(db) called before first session creation, safe to run multiple times
  - Structured API responses — 200 resume, 201 created, 400 validation, 404 not found, 500 error
  - Client state machine — study page maps DB status directly to UI phase (instructions → editing → completed)
  - Server as source of truth — client re-fetches session data after every mutation rather than maintaining local state
observability_surfaces:
  - GET /api/session/[sessionId] — inspect any session's full state, current sample, and revision history
  - POST /api/register distinguishes new (201) vs resume (200) via HTTP status code
  - getGroupCounts() query returns session distribution across groups
  - scripts/verify-s02.sh — automated health check covering 12 verification points
  - DB tables directly queryable via better-sqlite3 CLI for ad-hoc inspection
drill_down_paths:
  - .gsd/milestones/M001/slices/S02/tasks/T01-SUMMARY.md
  - .gsd/milestones/M001/slices/S02/tasks/T02-SUMMARY.md
  - .gsd/milestones/M001/slices/S02/tasks/T03-SUMMARY.md
  - .gsd/milestones/M001/slices/S02/tasks/T04-SUMMARY.md
duration: ~50m
verification_result: passed
completed_at: 2026-03-17
---

# S02: Registration + Writing Editor + Sample Flow

**Full participant flow from registration through 3-sample editing with revision history — balanced group assignment, session resume, group-aware instructions, and automated verification**

## What Happened

Built the complete participant-facing study flow in four tasks across ~50 minutes:

**T01 (Data Layer):** Extended the Drizzle schema with three new tables — `sessions` (UUID PK, group assignment, JSON sample order, status tracking), `writing_samples` (3 seeded samples with deliberate errors), and `revisions` (full-text snapshots with auto-incrementing revision numbers). Created 11 query functions in a centralized query layer, establishing the pattern that all routes consume queries.ts rather than importing the schema directly.

**T02 (Registration):** Built the registration API and form. POST `/api/register` finds-or-creates a participant by email (lowercase-normalized), checks for existing incomplete sessions (resume), assigns to the group with fewest sessions (ties broken randomly), shuffles sample order via Fisher-Yates, and returns `{ sessionId, group, sampleOrder }`. The client form handles loading/error states and redirects to the study page on success.

**T03 (Study Flow + Instructions):** Built the session data API (GET returns full state with current sample and revisions; POST with `action:begin` transitions status) and the study flow page with a 5-phase state machine (loading → instructions → editing → completed → error). The InstructionsScreen component renders group-specific content — scaffold group gets no prompt engineering tips per R015.

**T04 (Editor + Verification):** Built the WritingEditor component (textarea, save revision, revision history sidebar with click-to-view, submit-and-advance with confirmation dialog, progress indicator) and two API routes (revision save, sample advancement). The advance endpoint returns the next sample inline to avoid a second fetch. Created scripts/verify-s02.sh with 12 automated checks covering the entire API flow.

## Verification

All verification checks passed:

- **Build:** `npm run build` exits 0, all routes compile, no TypeScript errors
- **Verification script:** `bash scripts/verify-s02.sh` — all 12 checks pass:
  1. ✅ Registration returns sessionId, group, sampleOrder (3 items)
  2. ✅ Session resume — same email returns same sessionId
  3. ✅ Session status starts as "instructions"
  4. ✅ Begin transitions status to "in-progress"
  5. ✅ Revision #1 saved successfully
  6. ✅ Revision #2 saved with incrementing number
  7. ✅ Advance through sample 1 → sample 2
  8. ✅ Advance through sample 2 → sample 3
  9. ✅ Advance through sample 3 → completed
  10. ✅ Session status is "completed"
  11. ✅ Revision on completed session returns 400
  12. ✅ Empty body returns 400 validation error
- **Balanced assignment:** 3 different emails produce 3 different groups (one each)
- **Observability:** GET /api/session returns full JSON state; DB tables queryable; group distribution verified
- **Browser flow confirmed** in task summaries: register → instructions → edit 3 samples → completed

## Requirements Advanced

- R001 — Participant registration with name/email: fully implemented via POST /api/register and RegistrationForm
- R002 — Random group assignment: balanced assignment (min-count with random tie-breaking) implemented and verified
- R003 — Writing sample presentation (3 samples, randomized order): 3 seeded samples presented sequentially in Fisher-Yates shuffled order per participant
- R004 — In-place text editor with revision history: WritingEditor with textarea, explicit save, timestamped revision sidebar with click-to-view
- R010 — Full data logging: revision snapshots with timestamps captured; session status transitions logged; prompt/response logging deferred to S03/S04
- R014 — Sample order randomization per participant: Fisher-Yates shuffle stored as JSON, different per registration
- R015 — Pre-study instructions screen: group-specific InstructionsScreen — scaffold group has no prompt engineering tips
- R016 — Session persistence: same email returns existing incomplete session; study page resumes at correct phase

## Requirements Validated

- R001 — Registration proven via curl and browser walkthrough: name/email → sessionId
- R002 — Balanced assignment proven: 3 registrations produce 3 different groups; getGroupCounts() confirms distribution
- R014 — Randomization proven: different registrations produce different sampleOrder arrays
- R016 — Session resume proven: second POST with same email returns HTTP 200 with same sessionId; study page loads at correct phase

## New Requirements Surfaced

- none

## Requirements Invalidated or Re-scoped

- none

## Deviations

- Email normalized to lowercase before lookup — not explicitly in the plan but prevents duplicate participants from case differences. A sensible addition.
- Verify-s02.sh includes a "begin session" step before saving revisions — discovered during T04 that the revision route correctly rejects saves when status is "instructions", so the script needed to transition first.
- Added a 400-response check for revisions on completed sessions — not in the original plan but validates an important guard rail.

## Known Limitations

- Writing editor is a basic `<textarea>` — no rich text formatting, no spell check indicators, no auto-save. Sufficient for the study but feels plain.
- Revision history sidebar shows text snapshots but no diff highlighting between versions — researchers must compare manually or wait for S05 tooling.
- No validation that participant actually edited the sample before submitting — they could advance through all 3 without making changes.
- The "completed" state shows a simple message — the real completion screen with surveys comes in S04.
- No AI chat integration yet — the editor works standalone; S03 adds the chat panel alongside it.

## Follow-ups

- S03 must wire the ChatPanel alongside WritingEditor in the study flow page — the page already has the editing phase where this slots in.
- S04 must intercept the sample advancement flow to insert Likert surveys between samples.
- S04 must replace the simple "completed" message with a proper completion screen (R013).
- S05 should add diff visualization between revisions for the researcher dashboard.

## Files Created/Modified

- `src/lib/db/schema.ts` — Extended with sessions, writingSamples, revisions table definitions
- `src/lib/db/queries.ts` — 11 query functions + updateSessionStatus covering all S02 CRUD operations
- `src/lib/samples.ts` — 3 placeholder writing samples (~500 words each) + idempotent seedWritingSamples()
- `src/components/RegistrationForm.tsx` — Client component with name/email form, loading/error states, redirect
- `src/components/InstructionsScreen.tsx` — Group-aware pre-study instructions with numbered steps
- `src/components/WritingEditor.tsx` — Textarea editor with revision save/view, history sidebar, progress indicator
- `src/app/register/page.tsx` — Registration page rendering the form in centered card layout
- `src/app/api/register/route.ts` — POST handler with balanced group assignment, resume, validation
- `src/app/study/[sessionId]/page.tsx` — Study flow page with 5-phase state machine
- `src/app/api/session/[sessionId]/route.ts` — GET (session data) + POST (begin action) handler
- `src/app/api/session/[sessionId]/revision/route.ts` — POST handler for saving revision snapshots
- `src/app/api/session/[sessionId]/advance/route.ts` — POST handler for sample advancement
- `src/app/page.tsx` — Root redirect to /register
- `src/app/layout.tsx` — Updated metadata title/description
- `scripts/verify-s02.sh` — End-to-end API verification script (12 checks)

## Forward Intelligence

### What the next slice should know
- The study flow page (`src/app/study/[sessionId]/page.tsx`) has a state machine with phases: loading → instructions → editing → completed → error. S03 needs to modify the **editing** phase to add the ChatPanel alongside the WritingEditor.
- The session API (`GET /api/session/[sessionId]`) returns `group` field — S03 uses this to determine which mode (single-shot/iterative/scaffold) to enforce in the chat panel.
- `getSessionWithCurrentSample()` in queries.ts returns the current sample's `id`, `title`, and `content` — S03's chat context needs the sample content for the AI system prompt.
- The advance endpoint (`POST /api/session/[sessionId]/advance`) accepts optional `content` in the body for a final revision — S04 should intercept before advancement to insert the Likert survey.
- Writing samples are seeded with `seedWritingSamples(db)` which is called during registration — no separate seed step needed.

### What's fragile
- The study page re-fetches session data after every mutation via `fetchSession()` callback — if the advance endpoint response shape changes, the client state machine could break. The `onSampleComplete` prop on WritingEditor triggers a re-fetch that determines whether to stay in editing or transition to completed.
- Sample order is a JSON string in a TEXT column — `JSON.parse(session.sampleOrder)` is done in multiple places (queries.ts, revision route, advance route). A schema change here would require updating all parse sites.

### Authoritative diagnostics
- `bash scripts/verify-s02.sh` — exercises the full API flow in ~2 seconds, catches regressions immediately
- `GET /api/session/[sessionId]` — returns complete session state including currentSample, revisions, group, status — the single source of truth for session debugging
- DB direct query: `node -e "const Database = require('better-sqlite3'); const db = new Database('sqlite.db'); console.log(db.prepare('SELECT id, status, group_assignment, current_sample_index FROM sessions').all())"`

### What assumptions changed
- No assumptions changed. The data model, API shape, and UI flow all matched the plan. The only additions were defensive improvements (email normalization, completed-session revision guard).
