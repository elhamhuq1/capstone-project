---
id: T01
parent: S02
milestone: M001
provides:
  - sessions, writingSamples, revisions DB tables (Drizzle schema)
  - 3 placeholder writing samples with seed function
  - 11 query functions for all S02 CRUD operations
key_files:
  - src/lib/db/schema.ts
  - src/lib/samples.ts
  - src/lib/db/queries.ts
key_decisions:
  - crypto.randomUUID() for session IDs — no nanoid dependency
  - sampleOrder stored as JSON string in TEXT column, parsed on read
  - No SQLite FK constraints — application-level integrity for localhost study app
  - Full text snapshots in revisions, not diffs
patterns_established:
  - All DB queries go through src/lib/db/queries.ts — no direct schema access from routes
  - seedWritingSamples() uses onConflictDoNothing for idempotent seeding
  - Async query functions returning row[0] ?? undefined for single-row lookups
observability_surfaces:
  - getGroupCounts() returns session distribution across groups
  - getRevisions() returns full revision history per session+sample
  - All 4 tables queryable via better-sqlite3 CLI for ad-hoc inspection
duration: 8m
verification_result: passed
completed_at: 2026-03-17T19:56:00-04:00
blocker_discovered: false
---

# T01: Extend database schema with sessions, writing samples, and revisions plus query layer

**Added sessions/writingSamples/revisions tables, 3 placeholder writing samples, and 11 CRUD query functions for the S02 data layer**

## What Happened

Extended the existing Drizzle schema with three new SQLite tables:
- `sessions` — TEXT PK (UUID), participant FK, group assignment, JSON sample order, status tracking, timestamps
- `writing_samples` — 3 seeded placeholder samples with deliberate grammar errors (scores 54/64/75)
- `revisions` — full text snapshots per session+sample pair with auto-incrementing revision numbers

Created `src/lib/samples.ts` with ~500-word deliberately flawed writing samples covering remote work, social media/mental health, and urban transportation. Seed function uses `onConflictDoNothing` for idempotency.

Created `src/lib/db/queries.ts` with all 11 query functions: createParticipant, findParticipantByEmail, createSession, getSession, getSessionWithCurrentSample, saveRevision, getRevisions, advanceSample, getGroupCounts, getIncompleteSessionByParticipant.

## Verification

- `npx drizzle-kit push` exits 0 — all 4 tables created
- `sqlite_master` query confirms: participants, sessions, writing_samples, revisions
- Seed function inserts 3 samples; double-run confirms idempotency (still 3 rows)
- Full CRUD round-trip verified via tsx script:
  - Created participant → found by email ✅
  - Created session with UUID and JSON sample order ✅
  - getSessionWithCurrentSample correctly parses JSON, returns sample 2 (first in [2,1,3] order) ✅
  - saveRevision auto-increments: revision 1, revision 2 ✅
  - getRevisions returns ordered list ✅
  - advanceSample increments index; after 3rd advance, status = 'completed' ✅
  - getGroupCounts returns { single-shot: 0, iterative: 1, scaffold: 0 } ✅
  - getIncompleteSessionByParticipant returns undefined for completed session ✅
- `npm run build` passes with zero errors

### Slice-level verification (T01 is intermediate — partial expected):
- ✅ `npm run build` passes
- ⏳ API endpoint checks — T02+
- ⏳ Browser flow — T04
- ⏳ verify-s02.sh — T04

## Diagnostics

- Inspect tables: `node -e "const Database = require('better-sqlite3'); const db = new Database('sqlite.db'); console.log(db.prepare(\"SELECT name FROM sqlite_master WHERE type='table'\").all())"`
- Check seed data: `node -e "const Database = require('better-sqlite3'); const db = new Database('sqlite.db'); console.log(db.prepare('SELECT id, title, grammarly_score FROM writing_samples').all())"`
- All 11 query functions importable from `src/lib/db/queries.ts` for ad-hoc inspection

## Deviations

None

## Known Issues

None

## Files Created/Modified

- `src/lib/db/schema.ts` — extended with sessions, writingSamples, revisions table definitions
- `src/lib/samples.ts` — 3 placeholder writing samples (~500 words each) + idempotent seedWritingSamples()
- `src/lib/db/queries.ts` — 11 query functions covering all S02 CRUD operations
- `.gsd/milestones/M001/slices/S02/tasks/T01-PLAN.md` — added Observability Impact section
