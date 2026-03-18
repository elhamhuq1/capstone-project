# S02: Registration + Writing Editor + Sample Flow

**Goal:** Participant registers, gets randomly assigned a group, sees pre-study instructions, and can edit writing samples in-place with revision history — progressing through all 3 randomized samples.
**Demo:** A user visits `/register`, enters name/email, gets redirected to `/study/[sessionId]`, reads instructions, then edits 3 writing samples sequentially — saving revisions and advancing through each one. Re-entering the same email resumes the existing session.

## Must-Haves

- Database schema with `sessions`, `writingSamples`, `revisions` tables (extending S01's `participants`)
- Three placeholder writing samples seeded into the database
- Registration form at `/register` that creates a participant and session
- Balanced random group assignment (`single-shot` | `iterative` | `scaffold`)
- Randomized sample order per participant (stored as JSON in `sample_order`)
- Session resume — same email returns existing incomplete session (R016)
- Pre-study instructions screen that varies by group (scaffold group gets no prompt tips)
- In-place text editor (`<textarea>`) with explicit revision save
- Revision history sidebar showing timestamped snapshots per sample
- Sample progression — "Submit & Next" advances through all 3 samples
- Session status tracking: `instructions` → `in-progress` → `completed`
- All CRUD operations in a shared query layer (`src/lib/db/queries.ts`)

## Proof Level

- This slice proves: integration (schema + API + UI flow working end-to-end)
- Real runtime required: yes (SQLite database, Next.js dev server)
- Human/UAT required: no (curl + build checks sufficient)

## Verification

- `npm run build` passes with zero errors — all new routes and components compile
- `curl POST /api/register` with `{"name":"Test","email":"test@example.com"}` returns JSON with `sessionId`, `group`, and `sampleOrder` array of 3 items
- Second `curl POST /api/register` with same email returns the same `sessionId` (resume)
- `curl GET /api/session/[sessionId]` returns session state with current sample content, group, status
- `curl POST /api/session/[sessionId]/revision` with `{"content":"edited text"}` returns success with `revisionNumber`
- `curl POST /api/session/[sessionId]/advance` increments `currentSampleIndex`; after 3rd sample, status changes to `completed`
- `bash scripts/verify-s02.sh` runs all above checks as an automated script
- Browser walkthrough: register → instructions → edit sample 1 → save revision → submit → sample 2 → submit → sample 3 → submit → completed state

## Observability / Diagnostics

- Runtime signals: session status transitions (`instructions` → `in-progress` → `completed`), revision count per sample, group assignment distribution
- Inspection surfaces: `GET /api/session/[id]` returns full session state; `node -e` query against `sessions`, `revisions`, `writing_samples` tables; `scripts/verify-s02.sh` for automated health check
- Failure visibility: API routes return structured JSON errors with descriptive messages and appropriate HTTP status codes (400 for bad input, 404 for missing session)
- Redaction constraints: participant email is PII — used only for session lookup, not exposed in researcher-facing URLs

## Integration Closure

- Upstream surfaces consumed: `src/lib/db/index.ts` (database singleton), `src/lib/db/schema.ts` (participants table), `next.config.ts` (serverExternalPackages for better-sqlite3), Tailwind CSS 4 setup
- New wiring introduced in this slice: `/register` → `/api/register` → DB → redirect to `/study/[sessionId]`; study flow page fetches session state from API, renders instructions/editor, saves revisions, advances samples
- What remains before the milestone is truly usable end-to-end: S03 (AI chat panel + mode enforcement), S04 (surveys + completion screen + full data logging), S05 (researcher dashboard + CSV export)

## Tasks

- [x] **T01: Extend database schema with sessions, writing samples, and revisions plus query layer** `est:30m`
  - Why: Every other task depends on the data model. This creates the tables, seeds the writing samples, and provides the CRUD operations that registration, the study flow, and the editor all consume.
  - Files: `src/lib/db/schema.ts`, `src/lib/samples.ts`, `src/lib/db/queries.ts`, `drizzle.config.ts`
  - Do: Add `sessions`, `writingSamples`, `revisions` tables to schema.ts. Create samples.ts with 3 placeholder writing samples (~500 words each, deliberately flawed). Create queries.ts with all CRUD operations (createParticipant, findByEmail, createSession, getSession, saveRevision, getRevisions, advanceSample, seedWritingSamples). Run `npx drizzle-kit push` to apply. Use `crypto.randomUUID()` for session IDs (no nanoid dependency). Store `sample_order` as JSON string in TEXT column.
  - Verify: `npx drizzle-kit push` succeeds; `node -e` query confirms all 4 tables exist with correct columns; writing_samples table has 3 rows after seeding
  - Done when: Schema has 4 tables (participants, sessions, writing_samples, revisions), queries.ts exports all CRUD functions, 3 writing samples are seedable

- [x] **T02: Build registration page with balanced group assignment and session resume** `est:30m`
  - Why: The entry point for the entire study flow. Delivers R001 (registration), R002 (balanced random assignment), R014 (sample order randomization), and R016 (session resume).
  - Files: `src/components/RegistrationForm.tsx`, `src/app/register/page.tsx`, `src/app/api/register/route.ts`, `src/app/layout.tsx`, `src/app/page.tsx`
  - Do: Create POST `/api/register` that: finds-or-creates participant by email, checks for existing incomplete session (resume), creates new session with balanced group assignment (assign to group with fewest participants, break ties randomly) and shuffled sample order `[1,2,3]` shuffled via Fisher-Yates. Create RegistrationForm.tsx as `'use client'` component with name/email inputs. Create `/register/page.tsx` that renders the form. Update root `page.tsx` to redirect to `/register`. Update `layout.tsx` metadata title to "Prompt Engineering Study".
  - Verify: `curl -X POST http://localhost:3000/api/register -H 'Content-Type: application/json' -d '{"name":"Test","email":"test@example.com"}'` returns sessionId + group; same email returns same sessionId; 3 different emails produce balanced group distribution
  - Done when: Registration creates session with group + sample order, resume works, root page redirects to /register

- [x] **T03: Build study flow page with instructions screen and session data API** `est:30m`
  - Why: The study flow page is the shell that hosts the entire participant experience — instructions first, then editing. Delivers R015 (pre-study instructions with group-aware content) and the structural foundation for R003 (sample presentation).
  - Files: `src/app/study/[sessionId]/page.tsx`, `src/components/InstructionsScreen.tsx`, `src/app/api/session/[sessionId]/route.ts`
  - Do: Create GET `/api/session/[sessionId]` returning full session state (group, status, currentSampleIndex, current sample content/title, sampleOrder, revisions for current sample). Create InstructionsScreen.tsx — explains the task, how AI chat works, what's expected. For scaffold group: omit prompt engineering tips (those come from S03's scaffold panel). For single-shot/iterative: include a note that AI assistance is available. Create `/study/[sessionId]/page.tsx` as `'use client'` component with a state machine: loads session on mount, shows instructions (with "Begin" button), then transitions to editing view (placeholder for now — T04 adds the real editor). Handle 404 session gracefully.
  - Verify: `curl GET /api/session/[sessionId]` returns valid session JSON with sample content; browser shows instructions screen after registration redirect; "Begin" button transitions state from instructions to editing view
  - Done when: Study flow page loads session data, shows group-aware instructions, transitions to editing phase on button click

- [x] **T04: Build writing editor with revision saving, sample progression, and end-to-end verification** `est:40m`
  - Why: The core editing experience — delivers R004 (text editor + revision history), completes R003 (sample progression through all 3), and wires the full flow end-to-end. Also creates the verification script proving the slice works.
  - Files: `src/components/WritingEditor.tsx`, `src/app/api/session/[sessionId]/revision/route.ts`, `src/app/api/session/[sessionId]/advance/route.ts`, `src/app/study/[sessionId]/page.tsx`, `scripts/verify-s02.sh`
  - Do: Create POST `/api/session/[sessionId]/revision` that saves full text snapshot with incrementing revision_number per session+sample pair. Create POST `/api/session/[sessionId]/advance` that saves final revision, increments currentSampleIndex, loads next sample; after 3rd sample sets status to `completed`. Create WritingEditor.tsx with: textarea showing current sample content, "Save Revision" button, revision history sidebar (list of timestamped snapshots with click-to-view), "Submit & Next Sample" button. Wire WritingEditor into the study flow page's editing state. Update study flow page to handle completed state (simple "All samples completed" message — S04 extends with surveys). Create `scripts/verify-s02.sh` that exercises the full API flow with curl. Run `npm run build` to verify everything compiles.
  - Verify: `bash scripts/verify-s02.sh` passes all checks; `npm run build` exits 0; browser walkthrough: register → instructions → edit all 3 samples with revisions → completed
  - Done when: Full flow works end-to-end (register → instructions → 3 samples with revision saving → completed), build passes, verification script passes

## Files Likely Touched

- `src/lib/db/schema.ts` (extend with sessions, writingSamples, revisions)
- `src/lib/db/queries.ts` (new — all CRUD operations)
- `src/lib/samples.ts` (new — writing sample seed data)
- `src/components/RegistrationForm.tsx` (new)
- `src/components/InstructionsScreen.tsx` (new)
- `src/components/WritingEditor.tsx` (new)
- `src/app/register/page.tsx` (new)
- `src/app/api/register/route.ts` (new)
- `src/app/study/[sessionId]/page.tsx` (new)
- `src/app/api/session/[sessionId]/route.ts` (new)
- `src/app/api/session/[sessionId]/revision/route.ts` (new)
- `src/app/api/session/[sessionId]/advance/route.ts` (new)
- `src/app/layout.tsx` (metadata update)
- `src/app/page.tsx` (redirect to /register)
- `scripts/verify-s02.sh` (new — verification script)
