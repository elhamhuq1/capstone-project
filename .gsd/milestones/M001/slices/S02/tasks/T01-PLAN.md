---
estimated_steps: 5
estimated_files: 4
---

# T01: Extend database schema with sessions, writing samples, and revisions plus query layer

**Slice:** S02 — Registration + Writing Editor + Sample Flow
**Milestone:** M001

## Description

Build the complete data layer that every other S02 task depends on. Extends the existing `participants` table with three new tables (`sessions`, `writingSamples`, `revisions`), creates a query helper module with all CRUD operations, and provides three realistic placeholder writing samples as seed data.

The S01 foundation provides `src/lib/db/index.ts` (database singleton with WAL mode) and `src/lib/db/schema.ts` (participants table using Drizzle sqlite-core). This task extends that schema and adds the query/seed layers.

Key design decisions from research:
- `sessions.id` is TEXT using `crypto.randomUUID()` — no nanoid dependency needed (Node 20+)
- `sessions.sample_order` stored as JSON string in TEXT column (parse on read, stringify on write)
- `revisions` stores full text snapshots, not diffs (per R004 requirement)
- `writing_samples` as a DB table seeded from a TypeScript constants file

## Steps

1. **Extend `src/lib/db/schema.ts`** — Add three new tables after the existing `participants` table:
   - `sessions`: `id` (TEXT PK), `participantId` (INTEGER FK → participants.id), `groupAssignment` (TEXT NOT NULL — `'single-shot'` | `'iterative'` | `'scaffold'`), `sampleOrder` (TEXT NOT NULL — JSON array like `'[2,1,3]'`), `currentSampleIndex` (INTEGER DEFAULT 0), `status` (TEXT DEFAULT `'instructions'` — `'instructions'` | `'in-progress'` | `'completed'`), `startedAt` (TEXT DEFAULT `datetime('now')`), `completedAt` (TEXT)
   - `writingSamples`: `id` (INTEGER PK), `title` (TEXT NOT NULL), `content` (TEXT NOT NULL), `grammarlyScore` (INTEGER)
   - `revisions`: `id` (INTEGER PK autoincrement), `sessionId` (TEXT NOT NULL), `sampleId` (INTEGER NOT NULL), `content` (TEXT NOT NULL), `revisionNumber` (INTEGER NOT NULL), `createdAt` (TEXT DEFAULT `datetime('now')`)
   - Use the same Drizzle `sqliteTable`, `text`, `integer`, `sql` imports already used for `participants`. Do NOT use `.references()` foreign key constraints — SQLite foreign keys need PRAGMA foreign_keys = ON which adds complexity; rely on application-level integrity since this is a localhost study app.

2. **Create `src/lib/samples.ts`** — Export a `WRITING_SAMPLES` array of 3 objects: `{ id: number, title: string, content: string, grammarlyScore: number }`. Each sample should be ~500 words of deliberately flawed writing (grammar errors, awkward phrasing, structural issues) with Grammarly scores roughly 54, 64, 75. These are placeholders — the research team will swap in real samples later. Also export a `seedWritingSamples(db)` function that inserts the 3 samples using Drizzle's `insert().values()` with an `onConflictDoNothing()` guard so it's idempotent.

3. **Create `src/lib/db/queries.ts`** — Export these functions (all using the `db` import from `./index`):
   - `createParticipant(name: string, email: string)` — inserts and returns the participant row. Use `insert().values().returning()`.
   - `findParticipantByEmail(email: string)` — returns participant or undefined. Use `db.select().from(participants).where(eq(participants.email, email))`.
   - `createSession(participantId: number, groupAssignment: string, sampleOrder: number[])` — generates UUID via `crypto.randomUUID()`, inserts session with `JSON.stringify(sampleOrder)`, returns the session row.
   - `getSession(sessionId: string)` — returns session row or undefined.
   - `getSessionWithCurrentSample(sessionId: string)` — returns session + the current writing sample content by parsing `sampleOrder` JSON, using `currentSampleIndex` to pick the ID, and querying `writingSamples`.
   - `saveRevision(sessionId: string, sampleId: number, content: string)` — counts existing revisions for this session+sample pair, inserts with `revisionNumber = count + 1`, returns the revision row.
   - `getRevisions(sessionId: string, sampleId: number)` — returns all revisions for a session+sample pair, ordered by revisionNumber.
   - `advanceSample(sessionId: string)` — increments `currentSampleIndex` by 1. If new index >= 3, also sets `status = 'completed'` and `completedAt`. Returns the updated session.
   - `getGroupCounts()` — returns count of sessions per group assignment, used for balanced assignment.
   - `getIncompleteSessionByParticipant(participantId: number)` — returns the first session with status != 'completed' for this participant, or undefined.
   - Import `eq`, `and`, `sql`, `count` from `drizzle-orm` as needed. Import all schema tables from `./schema`.

4. **Apply schema with drizzle-kit push** — Run `npx drizzle-kit push` to create the new tables. The existing `sqlite.db` may need to be deleted first if push can't add tables (S01 research noted this). If it fails, delete `sqlite.db` and re-push — this is dev-only, no production data.

5. **Verify the data layer** — Run a Node.js script to confirm: (a) all 4 tables exist in `sqlite_master`, (b) seed the writing samples and confirm 3 rows, (c) create a test participant, create a session, save a revision, retrieve it — full CRUD round-trip.

## Must-Haves

- [ ] `sessions` table with all columns: id (TEXT PK), participantId, groupAssignment, sampleOrder, currentSampleIndex, status, startedAt, completedAt
- [ ] `writingSamples` table with id, title, content, grammarlyScore
- [ ] `revisions` table with id, sessionId, sampleId, content, revisionNumber, createdAt
- [ ] 3 placeholder writing samples (~500 words each, deliberately flawed, scores ~54/64/75)
- [ ] `seedWritingSamples()` is idempotent (uses onConflictDoNothing)
- [ ] All 11 query functions exported from queries.ts
- [ ] `crypto.randomUUID()` for session IDs (no nanoid)
- [ ] `sample_order` stored as JSON string, parsed with JSON.parse() on read

## Verification

- `npx drizzle-kit push` exits 0
- `node -e "const Database = require('better-sqlite3'); const db = new Database('sqlite.db'); console.log(db.prepare(\"SELECT name FROM sqlite_master WHERE type='table'\").all())"` shows participants, sessions, writing_samples, revisions
- A test script seeds samples and confirms 3 rows in writing_samples
- CRUD round-trip: create participant → create session → save revision → get revision works without errors

## Observability Impact

- **New tables inspectable via:** `node -e "const Database = require('better-sqlite3'); const db = new Database('sqlite.db'); console.log(db.prepare(\"SELECT name FROM sqlite_master WHERE type='table'\").all())"` — confirms all 4 tables exist
- **Writing sample seed state:** `node -e "const Database = require('better-sqlite3'); const db = new Database('sqlite.db'); console.log(db.prepare('SELECT id, title, grammarly_score FROM writing_samples').all())"` — shows 3 rows with expected scores
- **Session count per group:** `getGroupCounts()` in queries.ts returns `{ 'single-shot': n, 'iterative': n, 'scaffold': n }` — used for balanced assignment visibility
- **Revision audit:** `getRevisions(sessionId, sampleId)` returns full revision history per session+sample, ordered by revisionNumber — enables diff analysis
- **Failure states:** Missing tables cause Drizzle runtime errors referencing the table name; missing seed data causes `getSessionWithCurrentSample()` to return null for the sample portion
- **Diagnostic commands:** All 11 query functions are importable for ad-hoc inspection; `seedWritingSamples()` is idempotent and safe to re-run

## Inputs

- `src/lib/db/index.ts` — database singleton exporting `db` (Drizzle instance over better-sqlite3 with WAL mode)
- `src/lib/db/schema.ts` — existing `participants` table definition (extend, don't replace)
- `drizzle.config.ts` — existing config pointing to `sqlite.db` with schema at `./src/lib/db/schema.ts`
- `package.json` — existing deps include `drizzle-orm`, `drizzle-kit`, `better-sqlite3`

## Expected Output

- `src/lib/db/schema.ts` — extended with `sessions`, `writingSamples`, `revisions` table definitions
- `src/lib/samples.ts` — 3 writing samples as TypeScript constants + `seedWritingSamples()` function
- `src/lib/db/queries.ts` — 11 query functions covering all S02 CRUD needs
- `sqlite.db` — updated with all 4 tables (via drizzle-kit push)
