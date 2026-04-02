# Codebase Concerns

**Analysis Date:** 2026-04-02

## Tech Debt

**Stale Ollama Error Messages After Gemini Migration:**
- Issue: The AI backend was migrated from Ollama to Gemini via a shim in `src/lib/ollama.ts` that re-exports `chatWithGemini as chatWithOllama`. However, error handling in two API routes still checks for Ollama-specific errors and returns misleading messages.
- Files: `src/app/api/chat/route.ts` (line 52), `src/app/api/session/[sessionId]/prompt/route.ts` (line 113)
- Impact: When a Gemini API error occurs, users may see "Ollama is not running. Start it with: ollama serve" — completely wrong guidance.
- Fix approach: Update error messages to mention the actual AI provider (Gemini/API key issues). Remove ECONNREFUSED/fetch-failed checks that are Ollama-specific.

**Dead Code in WritingEditor — `handleSubmitAndNext`:**
- Issue: `WritingEditor.tsx` contains a `handleSubmitAndNext` callback (line 77) that handles saving a revision and calling `onSubmitForSurvey`. However, this callback is **never referenced in the component's JSX** — the actual submit button was moved to `SubmitRevisionButton` in `src/app/study/[sessionId]/page.tsx` (line 14). The orphaned code path also hits the `/revision` endpoint redundantly since `SubmitRevisionButton` calls `/submit` which already saves a revision.
- Files: `src/components/WritingEditor.tsx` (lines 77–108)
- Impact: Dead code contributes to confusion. The two code paths do different things — `WritingEditor` hits `/revision` only, while `SubmitRevisionButton` hits `/submit` (which calls both `/revision` + `saveFinalSubmission`).
- Fix approach: Remove `handleSubmitAndNext` from `WritingEditor.tsx`. Confirm `SubmitRevisionButton` is the sole submit path.

**`group` Prop Declared but Not Destructured in WritingEditor:**
- Issue: `WritingEditorProps` interface includes `group: string` (line 24), but the `WritingEditor` function does not destructure it (line 29–37). The prop is accepted, ignored, and passed by the parent.
- Files: `src/components/WritingEditor.tsx`
- Impact: Unnecessary prop increases interface surface area and can confuse maintainers.
- Fix approach: Remove `group` from `WritingEditorProps` if not needed, or destructure it if it was intended for conditional rendering.

**Orphaned SQLite Scripts After Postgres Migration:**
- Issue: `scripts/backfill-final-submissions.js`, `scripts/verify-s02.sh`, `scripts/verify-s03.sh`, `scripts/verify-s04.sh`, `scripts/verify-s05.sh` all reference `better-sqlite3` and `sqlite.db`. The application was migrated to Supabase Postgres in a recent commit. These scripts are now non-functional.
- Files: `scripts/backfill-final-submissions.js`, `scripts/verify-s0*.sh`
- Impact: Scripts silently fail if run. New contributors may assume SQLite is still the database.
- Fix approach: Delete or archive these scripts. If backfill is still needed, rewrite against Postgres.

**`better-sqlite3` and `@neondatabase/serverless` in `package.json`:**
- Issue: `better-sqlite3` (and its type definitions) remain in `dependencies` even though no source file in `src/` imports it. `@neondatabase/serverless` (`^1.0.2`) is also listed but not imported anywhere in `src/`.
- Files: `package.json`
- Impact: Unnecessary production bundle weight; the native `better-sqlite3` module requires compilation during CI/deployment.
- Fix approach: Remove `better-sqlite3`, `@types/better-sqlite3`, `@neondatabase/serverless` from `package.json`. Run `npm install` to update lockfile.

**`ollama` npm Package Still in `dependencies`:**
- Issue: The `ollama` npm package (`^0.6.3`) remains in `package.json` even though `src/lib/ollama.ts` now re-exports from `src/lib/gemini.ts` and never imports the `ollama` package directly.
- Files: `package.json`
- Impact: Dead dependency adds installation overhead.
- Fix approach: Remove `ollama` from `package.json`.

**`sampleOrder` Stored as JSON String Column:**
- Issue: The `sessions` table stores `sampleOrder` as `text('sample_order')` containing a JSON array (e.g., `"[1,3,2]"`). There are at least 6 `JSON.parse(session.sampleOrder)` calls scattered across route handlers and `queries.ts`, none of them wrapped in try/catch against malformed JSON.
- Files: `src/lib/db/schema.ts` (line 14), `src/lib/db/queries.ts` (lines 56, 483, 669), `src/app/api/session/[sessionId]/route.ts` (line 27), `src/app/api/session/[sessionId]/advance/route.ts` (line 44), `src/app/api/session/[sessionId]/submit/route.ts` (line 25), `src/app/api/register/route.ts` (line 52)
- Impact: If the column is ever corrupted or manually edited, any request for that session will crash with a JSON parse error that propagates as a 500.
- Fix approach: Migrate `sampleOrder` column to an integer array type (`integer[]` in Postgres). Alternatively, add a shared `parseSampleOrder(session)` helper that includes try/catch with a fallback.

---

## Security Considerations

**Researcher Dashboard Has No Authentication:**
- Risk: The entire `/researcher` route tree and its API endpoints (`/api/researcher/sessions`, `/api/researcher/sessions/[sessionId]`, `/api/researcher/export`) are publicly accessible. Anyone with the URL can view all participant PII (names, emails), read full session data, download the CSV export, and delete sessions permanently.
- Files: `src/app/researcher/layout.tsx`, `src/app/researcher/page.tsx`, `src/app/researcher/[sessionId]/page.tsx`, `src/app/api/researcher/sessions/route.ts`, `src/app/api/researcher/sessions/[sessionId]/route.ts`, `src/app/api/researcher/export/route.ts`
- Current mitigation: None. Security relies on obscurity of URL.
- Recommendations: Add at minimum HTTP Basic Auth via Next.js middleware, or a shared secret token checked in each researcher API route. For a research study with IRB obligations, protecting PII is critical.

**No Input Length Limits on User-Supplied Text:**
- Risk: The `/revision`, `/prompt`, `/submit`, and `/advance` API endpoints accept arbitrary-length string content with no `maxLength` check. A participant (or attacker with the session URL) could send multi-megabyte payloads, causing: (a) excessive DB storage, (b) excessive Gemini API token consumption, (c) the LCS diff algorithm in `computeDiff()` allocating an O(m×n) matrix for very large inputs.
- Files: `src/app/api/session/[sessionId]/revision/route.ts`, `src/app/api/session/[sessionId]/prompt/route.ts`, `src/app/api/session/[sessionId]/submit/route.ts`, `src/lib/db/queries.ts` (lines 817–877)
- Current mitigation: Only checks that content is non-empty.
- Recommendations: Add a `MAX_CONTENT_LENGTH` constant (e.g., 50,000 characters) and return 400 if exceeded. This also bounds LCS complexity.

**`ssl: { rejectUnauthorized: false }` in DB Connection:**
- Risk: The Postgres pool disables SSL certificate verification, making it vulnerable to man-in-the-middle attacks against the database connection.
- Files: `src/lib/db/index.ts` (line 11)
- Current mitigation: Connection string likely uses Supabase's connection pooler which terminates TLS internally.
- Recommendations: Set `rejectUnauthorized: true` and supply the Supabase CA certificate, or use `@neondatabase/serverless` / Supabase's native client that handles this correctly.

**`GEMINI_API_KEY` Falls Back to Empty String:**
- Risk: `src/lib/gemini.ts` initializes the Gemini client with `process.env.GEMINI_API_KEY || ''`. If the key is missing (e.g., missing env var in production), the client is created with an empty key and will fail at runtime with an unhelpful authentication error rather than a clear startup error.
- Files: `src/lib/gemini.ts` (line 3)
- Current mitigation: The application will still fail — just with a cryptic runtime error rather than a startup error.
- Recommendations: Add a startup check: `if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is required')`. Follow the pattern already established in `src/lib/db/index.ts` for `DATABASE_URL`.

**No Ownership Validation on Session Actions:**
- Risk: Any participant who knows another participant's `sessionId` UUID can call `/api/session/[sessionId]/revision`, `/survey`, `/timing`, `/advance`, and `/submit` on that session. The session ID is a UUID which is hard to guess, but the endpoints do not verify that the caller "owns" the session (there is no auth token tied to a session).
- Files: All routes under `src/app/api/session/[sessionId]/`
- Current mitigation: UUID v4 session IDs are hard to enumerate.
- Recommendations: For a research study, adding a simple participant token stored in localStorage and checked server-side would prevent one participant from tampering with another's data.

---

## Performance Bottlenecks

**N+1 Query Pattern in `getAllSessions` and `getSessionDetail`:**
- Problem: `getAllSessions()` fetches all sessions, then for each session fires two additional queries (prompt count, sample timings). `getSessionDetail()` fires one query per sample for prompts, then one query per prompt for AI responses — creating a 1+N+M chain.
- Files: `src/lib/db/queries.ts` (lines 401–465 for `getAllSessions`, lines 467–613 for `getSessionDetail`)
- Cause: Individual `await db.select()` calls inside `Promise.all` rather than JOIN-based aggregate queries.
- Improvement path: Use Drizzle's `.leftJoin()` with `count()` aggregates for `getAllSessions`. For `getSessionDetail`, batch-fetch all prompts and AI responses for a session in two queries, then assemble in JS.

**N+1 Query Pattern in `getExportData`:**
- Problem: `getExportData()` iterates over all sessions×samples and fires 5 database queries per cell (prompts, AI responses per prompt, revisions, timing, survey). For 30 participants × 3 samples this is approximately 450+ sequential queries for a single CSV export request.
- Files: `src/lib/db/queries.ts` (lines 615–803)
- Cause: Sequential per-session, per-sample queries in nested `for` loops.
- Improvement path: Batch all related data up-front using `inArray(sessions.id, sessionIds)`, then assemble in memory.

**LCS Diff Algorithm Has No Size Guard:**
- Problem: `computeDiff()` allocates an `(m+1)×(n+1)` 2D array where `m` and `n` are token counts. The current essay samples are ~400 words each, yielding ~160,000 cell arrays — manageable. But with no content length limit, a large submission could cause significant memory allocation during submit.
- Files: `src/lib/db/queries.ts` (lines 817–877)
- Cause: No ceiling on input size before running LCS.
- Improvement path: Add content length limit in the `/submit` route (see Security section) which bounds the LCS input size.

**Connection Pool Capped at 3 in Serverless Context:**
- Problem: `src/lib/db/index.ts` creates a persistent `pg.Pool` with `max: 3`. In a serverless (Vercel) environment, each function invocation may create its own pool, leading to many parallel pools each holding up to 3 connections — potentially exhausting Supabase's connection limits under load.
- Files: `src/lib/db/index.ts`
- Cause: Node.js `pg.Pool` is not designed for serverless — it maintains persistent connections.
- Improvement path: Use Supabase's connection pooler URL (port 6543) with `pgBouncer=true` in the connection string, or switch to `@neondatabase/serverless` / `postgres` (the `postgres` package) which handles serverless connection patterns better.

---

## Fragile Areas

**Round-Robin Group Assignment Has a Race Condition:**
- Files: `src/app/api/register/route.ts` (lines 26–28, 71–78)
- Why fragile: `getTotalSessionCount()` is called then `createSession()` is called in separate operations with no locking. Two concurrent registrations could both read the same total count and be assigned the same group, breaking the round-robin balance.
- Safe modification: Use a Postgres `SELECT ... FOR UPDATE` or a `SERIAL`-based counter, or use a DB-level sequence for group assignment.
- Test coverage: No tests exist for this path.

**`advanceSample` Has a Hardcoded Magic Number `3`:**
- Files: `src/lib/db/queries.ts` (line 127), `src/app/api/session/[sessionId]/route.ts` (line 63)
- Why fragile: The number of writing samples is hardcoded in multiple locations (`>= 3` in `advanceSample`, `totalSamples: 3` in the session GET, `samplesCompleted === 3` in the researcher page, content in `InstructionsScreen`). Changing the study to use 4 samples would require editing at least 5 separate files.
- Safe modification: Define `TOTAL_SAMPLES = 3` as a shared constant in `src/lib/db/queries.ts` or `src/lib/samples.ts` and import it everywhere.
- Test coverage: None.

**`JSON.parse(session.sampleOrder)` Without Try/Catch:**
- Files: `src/lib/db/queries.ts` (lines 56, 483, 669), `src/app/api/session/[sessionId]/route.ts` (line 27)
- Why fragile: Every request involving a session parses `sampleOrder` from a raw text column. A corrupted value crashes the handler; the outer `try/catch` in the route wraps it but returns a generic 500.
- Safe modification: Create a helper function that parses and validates the array, returning a 400 with a descriptive message if malformed.
- Test coverage: None.

**Survey Responses Can Be Submitted Multiple Times:**
- Files: `src/app/api/session/[sessionId]/survey/route.ts`, `src/lib/db/schema.ts` (lines 53–59), `src/lib/db/queries.ts` (lines 298–317)
- Why fragile: There is no unique constraint on `(session_id, sample_id, question_id)` in `survey_responses`. The route does not check for existing responses before inserting. A double-submission (network retry, browser back-button) would duplicate all 5 responses.
- Safe modification: Add a unique constraint at the DB level: `uniqueIndex('survey_responses_session_sample_question_unique', [sessionId, sampleId, questionId])` in the schema. Add an upsert (`onConflictDoUpdate`) in `saveSurveyResponses`.
- Test coverage: None.

**`WritingAssistantBlocker` Detection is Heuristic and Unreliable:**
- Files: `src/components/WritingAssistantBlocker.tsx`
- Why fragile: Detection relies on checking for specific DOM elements by selector (e.g., `grammarly-desktop-integration`). Browser extension vendors change their DOM injection patterns frequently. The component does not actually block the extensions — it only shows a toast warning after detection. The `writingsuggestions` and `writing-tools` attributes on context menu are set reactively, not proactively.
- Safe modification: This is an inherent limitation of client-side extension detection. Document this limitation so researchers understand compliance cannot be technically enforced, only warned.
- Test coverage: None.

---

## Missing Critical Features

**No Database Migration Files:**
- Problem: The `drizzle/` migrations directory does not exist. The schema in `src/lib/db/schema.ts` has no corresponding generated migration files. It is unclear how the production database schema was created or how future schema changes will be applied.
- Blocks: Safe schema evolution; onboarding new developers who need to bootstrap a local database.

**No Tests of Any Kind:**
- Problem: There are zero test files (no `*.test.ts`, `*.spec.ts`, `*.test.tsx`) in the codebase. No test framework is configured.
- Blocks: Confident refactoring; detecting regressions in critical paths (registration, session advance, survey submission).

**`/test-chat` Route Accessible in Production:**
- Problem: `src/app/test-chat/page.tsx` is a developer proof-of-concept page that bypasses session authentication entirely and calls `/api/chat` directly. It is publicly routable at `/test-chat` in production.
- Files: `src/app/test-chat/page.tsx`, `src/app/api/chat/route.ts`
- Blocks: Research integrity — participants could use this to interact with the AI model outside the study protocol without any data being recorded.
- Fix approach: Delete the route or gate it behind a development-only environment check (`process.env.NODE_ENV !== 'production'`).

---

## Test Coverage Gaps

**All Critical Business Logic Untested:**
- What's not tested: Registration + session creation, round-robin group assignment, sample advance/completion, survey response saving, final submission + diff computation, CSV export, researcher session delete.
- Files: All files under `src/app/api/`, `src/lib/db/queries.ts`, `src/lib/db/schema.ts`
- Risk: Any regression in session flow, group assignment, or data export goes undetected until a participant hits it.
- Priority: High

**LCS Diff Algorithm Untested:**
- What's not tested: `computeDiff()` in `src/lib/db/queries.ts` (lines 817–877) handles the word-level diff stored in `final_submissions`. Edge cases (empty string, identical strings, very long inputs) are not tested.
- Files: `src/lib/db/queries.ts`
- Risk: Incorrect diff data silently corrupts the `changes_summary` column in CSV exports, affecting downstream research analysis.
- Priority: High

---

*Concerns audit: 2026-04-02*
