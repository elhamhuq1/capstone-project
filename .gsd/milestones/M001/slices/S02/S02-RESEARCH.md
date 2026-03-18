# S02: Registration + Writing Editor + Sample Flow — Research

**Date:** 2026-03-17

## Summary

S02 is the primary data-model and participant-flow slice. It owns R001 (registration), R002 (random group assignment), R003 (sample presentation with randomized order), R004 (text editor with revision history), R010 (data logging — foundational tables), R014 (sample order randomization), R015 (pre-study instructions), and R016 (session persistence/resume). This is medium-complexity work — standard CRUD + routing + UI — on top of well-understood technology (Drizzle/SQLite, Next.js App Router, React client components). No unfamiliar APIs or risky integrations.

The S01 foundation provides everything needed: a working Next.js 16 project with Drizzle ORM + better-sqlite3, a database singleton with WAL mode, path aliases (`@/*` → `./src/*`), and Tailwind CSS 4. The existing `participants` table has `id`, `email`, `name`, `createdAt`. S02 extends this schema with `sessions`, `writingSamples`, and `revisions` tables, then builds the multi-page participant flow on top.

The riskiest piece is the writing editor with snapshot-based revision history (R004). The requirement explicitly says snapshots, not character-level diffing — so a simple "save full text content on meaningful events" approach is correct. The revision history UI (viewing past versions) is needed for researchers but can be kept simple — a list of timestamped snapshots with the ability to view each one.

## Recommendation

Build bottom-up: schema first, then API/queries, then registration UI, then study flow (instructions → editor → sample progression). Use `drizzle-kit push` (already established in S01) to apply schema changes. The writing editor should be a `<textarea>` (or `contentEditable` div for slightly richer feel) with explicit "Save Revision" action plus auto-save on sample submission. Store writing samples as seed data in a TypeScript constant file — the `.docx` file isn't in the repo and the content needs to be hardcoded anyway for the study.

Use Next.js App Router dynamic routes: `/register` for the registration page, `/study/[sessionId]` for the study flow (instructions, editor, sample progression all managed by client-side state within this route). Server Actions or API routes for data mutations (create participant, create session, save revision, advance sample).

For group assignment (R002), use balanced random assignment — track current group counts and assign to the group with fewest participants, breaking ties randomly. This ensures roughly equal group sizes without complex stratification.

## Implementation Landscape

### Key Files

**Existing (from S01):**
- `src/lib/db/index.ts` — Database singleton, `db` export with WAL mode. All queries go through this.
- `src/lib/db/schema.ts` — Currently has `participants` table only. Must be extended with `sessions`, `writingSamples`, `revisions` tables.
- `drizzle.config.ts` — Points to `sqlite.db`, schema at `./src/lib/db/schema.ts`.
- `src/app/layout.tsx` — Root layout with Geist fonts and Tailwind. Metadata needs updating from "Create Next App" to study app title.
- `src/app/page.tsx` — Default Next.js landing page. Should become the registration entry point (or redirect to `/register`).

**New files to create:**
- `src/lib/db/schema.ts` (extend) — Add `sessions`, `writingSamples`, `revisions` tables with foreign keys and timestamps.
- `src/lib/db/queries.ts` (new) — CRUD operations: createParticipant, findParticipantByEmail, createSession, getSession, saveRevision, getRevisions, advanceSample, getSessionWithCurrentSample.
- `src/lib/samples.ts` (new) — Writing sample content as TypeScript constants. Three samples (~500 words each), stored with IDs and titles.
- `src/app/register/page.tsx` (new) — Registration form (name, email). Client component with form submission.
- `src/app/api/register/route.ts` (new) — POST handler: find-or-create participant, create session with random group + randomized sample order, return sessionId. Handles session resume (R016) by checking for existing incomplete session.
- `src/app/study/[sessionId]/page.tsx` (new) — Main study flow page. Client component managing state machine: instructions → sample 1 → sample 2 → sample 3 → (hands off to S04 for surveys/completion). Fetches session data on mount.
- `src/app/api/session/[sessionId]/route.ts` (new) — GET handler returning session state (current sample, group, revision history).
- `src/app/api/session/[sessionId]/revision/route.ts` (new) — POST handler saving a revision snapshot.
- `src/app/api/session/[sessionId]/advance/route.ts` (new) — POST handler advancing to next sample.
- `src/components/WritingEditor.tsx` (new) — Textarea-based editor with revision history sidebar. Shows current sample text, tracks edits, provides save-revision action.
- `src/components/InstructionsScreen.tsx` (new) — Pre-study instructions. Content varies slightly by group (R015 says scaffold group should NOT see prompt engineering tips here).
- `src/components/RegistrationForm.tsx` (new) — Form component for name/email entry.

### Schema Design

```
participants (existing, unchanged)
  id         INTEGER PK autoincrement
  email      TEXT NOT NULL UNIQUE
  name       TEXT NOT NULL
  created_at TEXT DEFAULT datetime('now')

sessions (new)
  id              TEXT PK (nanoid or uuid — short random string)
  participant_id  INTEGER FK → participants.id
  group_assignment TEXT NOT NULL ('single-shot' | 'iterative' | 'scaffold')
  sample_order    TEXT NOT NULL (JSON array of sample IDs, e.g. '[2,3,1]')
  current_sample_index INTEGER DEFAULT 0
  status          TEXT DEFAULT 'instructions' ('instructions' | 'in-progress' | 'completed')
  started_at      TEXT DEFAULT datetime('now')
  completed_at    TEXT

writing_samples (new — seed data, not user-generated)
  id      INTEGER PK
  title   TEXT NOT NULL
  content TEXT NOT NULL
  grammarly_score INTEGER

revisions (new)
  id          INTEGER PK autoincrement
  session_id  TEXT FK → sessions.id
  sample_id   INTEGER FK → writing_samples.id
  content     TEXT NOT NULL (full snapshot of edited text)
  revision_number INTEGER NOT NULL (1, 2, 3... per session+sample pair)
  created_at  TEXT DEFAULT datetime('now')
```

Key schema decisions:
- `sessions.id` as TEXT (nanoid) rather than integer — used in URLs, should not be guessable sequential integers.
- `sessions.sample_order` as JSON string — simple, avoids a join table for a fixed-size array of 3 items.
- `revisions` stores full text snapshots, not diffs — per R004's "snapshots, not character-level tracking" requirement.
- `writing_samples` as a table rather than just constants — allows queries to join, but seed data comes from a TypeScript file and is inserted on first run.

### Build Order

1. **Schema + seed data** — Extend `schema.ts` with new tables, create `samples.ts` with hardcoded writing sample content, create `queries.ts` with all CRUD operations, run `drizzle-kit push`. This unblocks everything else.

2. **Registration flow** — `/register` page + `/api/register` route. Creates participant, creates session with balanced random group assignment and shuffled sample order, redirects to `/study/[sessionId]`. Handles resume (R016): if participant email already has an incomplete session, return that sessionId.

3. **Study flow page + instructions** — `/study/[sessionId]/page.tsx` loads session data, shows instructions screen first (R015), then transitions to editor. The instructions screen is a simple static content component that varies by group.

4. **Writing editor + revision history** — `WritingEditor.tsx` component with the textarea, save-revision button, revision history sidebar. `/api/session/[sessionId]/revision` endpoint for saving. This is where R004 is delivered.

5. **Sample progression** — "Submit & Next" flow: save final revision, advance `current_sample_index`, load next sample. After 3 samples, set status to 'completed' (S04 will extend this with surveys before completion).

### Verification Approach

1. **Schema verification**: `node -e` query against `sqlite_master` confirms all 4 tables exist with correct columns after `drizzle-kit push`.

2. **Registration flow**: `curl POST /api/register` with name/email → returns sessionId with valid group assignment. Second call with same email → returns same sessionId (resume). Check group distribution after several registrations.

3. **Session data**: `curl GET /api/session/[id]` → returns session with group, current sample content, sample order, revision history.

4. **Revision saving**: `curl POST /api/session/[id]/revision` with modified content → revision stored. Multiple saves → incrementing revision numbers. `GET` returns all revisions for current sample.

5. **Sample advancement**: `curl POST /api/session/[id]/advance` → `current_sample_index` increments, next sample loads. After 3rd sample, status changes.

6. **UI verification**: Browser navigates through full flow: register → instructions → edit sample 1 → save revision → submit → sample 2 → ... → sample 3 → submit.

7. **Build verification**: `npm run build` passes — all new routes compile, no TypeScript errors.

## Constraints

- **No `nanoid` dependency yet** — need to add it or use `crypto.randomUUID()` (available in Node 18+). UUID is longer but avoids a dependency. Since the existing project uses Node 20+, `crypto.randomUUID()` works fine and avoids adding a package.
- **Writing sample content not in repo** — the `writing samples capstone 2026.docx` file wasn't found. The planner/executor will need to either use placeholder text or the team provides the content. Use realistic placeholder samples for now; they can be swapped in later.
- **`drizzle-kit push` replaces schema** — since S01 used push (no migrations), pushing the extended schema will work cleanly. But `sqlite.db` from S01 development may need to be deleted and re-created if push can't add columns to existing tables. This is fine — dev-only, no production data.
- **Tailwind CSS 4 uses `@import "tailwindcss"` syntax** — not the v3 `@tailwind base/components/utilities` directives. The existing `globals.css` already has this correct.
- **Next.js 16 App Router** — route handlers use `export async function POST/GET(request: NextRequest)` pattern (established in S01's `/api/chat/route.ts`). Dynamic routes use `[param]` directory convention.

## Common Pitfalls

- **Forgetting `'use client'` on interactive pages** — The registration form and study flow page need client-side state. Any component with `useState`/`useEffect` must be marked `'use client'`. The test-chat page from S01 shows the correct pattern.
- **SQLite TEXT for dates** — Drizzle's SQLite adapter uses TEXT columns with `datetime('now')` for timestamps. Don't try to use Date objects directly — always store as ISO strings and compare as strings. The S01 schema already establishes this pattern.
- **`serverExternalPackages` must include `better-sqlite3`** — already configured in S01's `next.config.ts`. Don't remove it. Any new API route importing from `@/lib/db` will work correctly because of this config.
- **JSON in SQLite TEXT column** — `sample_order` stored as JSON string means parsing with `JSON.parse()` on read and `JSON.stringify()` on write. This is straightforward but the planner should account for it in the query layer.

## Open Risks

- **Writing sample content unavailable** — The `.docx` file with the three writing samples (scored 54, 64, 75 by Grammarly) is not in the repository. The executor will need to use placeholder text. This is low-risk — the samples can be swapped in at any time by updating `src/lib/samples.ts`, and the rest of the system (editor, revision tracking, sample progression) works regardless of content.
- **Balanced random assignment edge case** — With very few participants (first 1-2), the assignment is effectively random. The balancing only matters with 6+ participants. This is acceptable per the study design.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Drizzle ORM | bobmatnyc/claude-mpm-skills@drizzle-orm | available (2K installs) |
| Next.js App Router | wshobson/agents@nextjs-app-router-patterns | available (8.9K installs) |

These are optional — the work is standard CRUD + routing using patterns already established in S01. The planner can proceed without them.
