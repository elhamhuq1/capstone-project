# Architecture

**Analysis Date:** 2026-04-02

## Pattern Overview

**Overall:** Next.js App Router full-stack monolith — server-side API routes backed by Drizzle ORM over Postgres, client-side React pages fetching from those routes.

**Key Characteristics:**
- No separate backend service; all API logic lives in `src/app/api/` as Next.js Route Handlers
- All database access is centralized through a single query layer (`src/lib/db/queries.ts`) — components never import from `src/lib/db/schema.ts` directly
- AI provider abstracted behind a re-export shim (`src/lib/ollama.ts` → `src/lib/gemini.ts`) so import names are stable even when the provider changes
- Session state is entirely server-side (Postgres); client holds no durable state — all page loads re-fetch from `/api/session/[sessionId]`
- Three study groups (`zero-shot`, `iterative`, `scaffold`) share the same UI flow; group-specific behavior is gated by the `group` string prop at render time

## Layers

**Database Schema:**
- Purpose: Define all tables and types
- Location: `src/lib/db/schema.ts`
- Contains: Drizzle `pgTable` definitions for `participants`, `sessions`, `writingSamples`, `revisions`, `prompts`, `aiResponses`, `surveyResponses`, `sampleTimings`, `finalSubmissions`
- Depends on: `drizzle-orm/pg-core`
- Used by: `src/lib/db/queries.ts`, `src/lib/samples.ts`, the researcher DELETE route

**Database Client:**
- Purpose: Provide the singleton Drizzle `db` instance
- Location: `src/lib/db/index.ts`
- Contains: `pg.Pool` with connection string, Drizzle wrapper
- Depends on: `DATABASE_URL` env var
- Used by: `src/lib/db/queries.ts`, `src/lib/samples.ts`, `src/app/api/researcher/sessions/[sessionId]/route.ts`

**Query Layer:**
- Purpose: All SQL operations — the only place raw Drizzle queries appear
- Location: `src/lib/db/queries.ts`
- Contains: Named async functions covering every CRUD operation, aggregate queries for the researcher dashboard, word-level diff computation for `finalSubmissions`
- Depends on: `src/lib/db/index.ts`, `src/lib/db/schema.ts`
- Used by: Every API route handler

**AI Provider:**
- Purpose: Abstract the LLM call behind a stable interface
- Location: `src/lib/gemini.ts` (implementation), `src/lib/ollama.ts` (re-export shim)
- Contains: `chatWithGemini` — an async generator that streams chunks from Gemini 2.5 Flash; `src/lib/ollama.ts` re-exports it as `chatWithOllama` so call sites need no changes
- Depends on: `@google/generative-ai`, `GEMINI_API_KEY` env var
- Used by: `src/app/api/chat/route.ts`, `src/app/api/session/[sessionId]/prompt/route.ts`

**Static Config:**
- Purpose: Store study-wide constants that do not live in the database
- Location: `src/lib/prompts.ts`, `src/lib/survey.ts`, `src/lib/samples.ts`
- Contains: `ADVISORY_SYSTEM_PROMPT`, `SURVEY_QUESTIONS` (5 questions with typed IDs), `WRITING_SAMPLES` (3 essays with Grammarly scores) plus the `seedWritingSamples` seeder
- Depends on: `src/lib/db` (seeder only)
- Used by: API routes for validation and prompt construction; `src/app/api/register/route.ts` calls seeder on first registration

**API Routes (participant-facing):**
- Purpose: REST endpoints consumed by the participant study UI
- Location: `src/app/api/register/route.ts`, `src/app/api/chat/route.ts`, `src/app/api/session/[sessionId]/` (route, advance, prompt, revision, submit, survey, timing)
- Contains: Input validation, session checks, DB mutations, streaming responses for AI chat
- Depends on: `src/lib/db/queries.ts`, `src/lib/gemini.ts` (via shim), `src/lib/prompts.ts`, `src/lib/samples.ts`
- Used by: Client pages via `fetch()`

**API Routes (researcher-facing):**
- Purpose: REST endpoints for the researcher dashboard
- Location: `src/app/api/researcher/sessions/route.ts`, `src/app/api/researcher/sessions/[sessionId]/route.ts`, `src/app/api/researcher/export/route.ts`
- Contains: Aggregate session list, per-session detail, CSV export, session DELETE (cascades through all child tables)
- Depends on: `src/lib/db/queries.ts`, `src/lib/db/index.ts`
- Used by: Researcher dashboard pages

**UI Pages:**
- Purpose: Participant flow and researcher dashboard
- Location: `src/app/` pages and `src/components/`
- Contains: Client components with local `useState`/`useCallback`; all state is re-fetched from the server on mount
- Depends on: API routes via `fetch()`
- Used by: Browser

## Data Flow

**Participant Registration:**

1. Participant submits name + email at `/register` via `RegistrationForm`
2. `POST /api/register` checks for existing participant by email; resumes incomplete session if found
3. If new, calls `seedWritingSamples()` (idempotent), then creates participant and session
4. Group assigned round-robin by total session count (`totalSessions % 3`); sample order randomized with Fisher-Yates
5. Returns `{ sessionId, group, sampleOrder }` → client redirects to `/study/[sessionId]`

**Study Session:**

1. Page loads at `/study/[sessionId]`; `GET /api/session/[sessionId]` returns full session state, current sample, chat history, revisions, timing status
2. Phase state machine: `loading → instructions → editing → survey → (repeat for next sample) → completed`
3. During editing: `POST /api/session/[sessionId]/prompt` saves prompt, calls Gemini, streams response back; response accumulated and saved to `aiResponses` table on stream close
4. `POST /api/session/[sessionId]/revision` saves a draft revision snapshot
5. `POST /api/session/[sessionId]/submit` saves final content + word-level diff, marks timing complete
6. Survey submitted via `POST /api/session/[sessionId]/survey`
7. `POST /api/session/[sessionId]/advance` increments `currentSampleIndex`; at index 3 sets session `status = 'completed'`

**AI Chat Streaming:**

1. `ChatPanel` sends `POST /api/session/[sessionId]/prompt` with `{ content, sampleId }`
2. Route saves prompt to DB, builds conversation history from prior prompts + responses
3. Calls `chatWithOllama` (→ Gemini), gets async generator
4. `ReadableStream` wraps generator; each chunk is `TextEncoder.encode()`'d and enqueued
5. Accumulated text saved to `aiResponses` in the `finally` block before `controller.close()`
6. Client reads the stream with `res.body.getReader()`, appending each chunk to the last assistant message in state

**Researcher Export:**

1. `GET /api/researcher/export` calls `getExportData()` which iterates all sessions × samples, materializing prompts, AI responses, revisions, timings, surveys, and final submissions into flat rows
2. Rows serialized to CSV with `escapeCSVField`, returned as `Content-Disposition: attachment`

**State Management:**
- No global client-side state store (no Redux, Zustand, or Context)
- Each page component owns its state via `useState`
- Session source of truth is always the Postgres database; client re-fetches after every mutation

## Key Abstractions

**Session:**
- Purpose: Tracks one participant's entire study run — group, sample order, current position, status
- Examples: `src/lib/db/schema.ts` (`sessions` table), `src/lib/db/queries.ts` (`getSession`, `getSessionWithCurrentSample`, `advanceSample`)
- Pattern: UUID primary key, JSON-serialized `sampleOrder` array, enum-like `status` string (`instructions`, `in-progress`, `completed`)

**Phase State Machine (client):**
- Purpose: Control which screen the participant sees
- Examples: `src/app/study/[sessionId]/page.tsx` (`Phase` type, `fetchSession` dispatcher)
- Pattern: `type Phase = 'loading' | 'instructions' | 'editing' | 'survey' | 'completed' | 'error'`; `setPhase` called after every server response

**Streaming Chat:**
- Purpose: Deliver LLM responses token-by-token without buffering
- Examples: `src/app/api/session/[sessionId]/prompt/route.ts`, `src/components/ChatPanel.tsx`
- Pattern: Route returns `new Response(readableStream, { headers: { 'Content-Type': 'text/plain' } })`; client reads with `getReader()` and mutates the last assistant message in state

**Query Functions:**
- Purpose: Named, typed database operations — the only permitted way to touch the DB from routes
- Examples: `src/lib/db/queries.ts` — all exports are standalone async functions
- Pattern: Functions return Drizzle row types directly; no intermediate repository objects or classes

## Entry Points

**Root redirect:**
- Location: `src/app/page.tsx`
- Triggers: Any visit to `/`
- Responsibilities: Calls `redirect('/register')` immediately — no rendering

**Root layout:**
- Location: `src/app/layout.tsx`
- Triggers: Wraps every page
- Responsibilities: Font variables (`Inter`, `IBM Plex Mono`), mounts `WritingAssistantBlocker` globally

**Researcher layout:**
- Location: `src/app/researcher/layout.tsx`
- Triggers: Wraps all `/researcher/*` pages
- Responsibilities: Sticky top bar with admin badge and Export CSV button

**Registration API:**
- Location: `src/app/api/register/route.ts`
- Triggers: `POST /api/register`
- Responsibilities: Participant upsert, round-robin group assignment, session creation, sample seeding

**Study page:**
- Location: `src/app/study/[sessionId]/page.tsx`
- Triggers: Participant navigates to `/study/[sessionId]`
- Responsibilities: Full phase state machine, composes all participant-facing components (`InstructionsScreen`, `WritingEditor`, `ChatPanel`, `ScaffoldPanel`, `SurveyForm`, `CompletionScreen`)

## Error Handling

**Strategy:** All API routes wrap handler logic in `try/catch`; errors return `NextResponse.json({ error: message }, { status: 5xx })`. Connection errors from Gemini are detected by message string matching and returned as `503`.

**Patterns:**
- Routes log to `console.error` with a route label prefix (e.g., `[session] GET error:`)
- Client pages set local `errorMessage` state on non-2xx responses; rendering switches to an error screen
- Streaming routes use `controller.error(err)` on generator failure; final submission to DB is attempted in `finally` before stream close
- Timing calls in the study page use `.catch(() => {})` — fire-and-forget, failures silently ignored

## Cross-Cutting Concerns

**Logging:** `console.error` in every API route catch block. No structured logging framework.

**Validation:** Inline in each route handler — manual type checks (`typeof x !== 'number'`, `Array.isArray()`), range checks for survey ratings (1–5), set-based lookup for valid survey question IDs via `VALID_QUESTION_IDS`.

**Authentication:** None. The researcher dashboard at `/researcher` is publicly accessible. No session tokens, cookies, or middleware guards.

---

*Architecture analysis: 2026-04-02*
