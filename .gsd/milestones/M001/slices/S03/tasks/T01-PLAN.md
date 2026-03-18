---
estimated_steps: 6
estimated_files: 3
---

# T01: Extend schema with prompts/aiResponses tables and build prompt API route

**Slice:** S03 — AI Chat Panel + Mode Enforcement
**Milestone:** M001

## Description

Add the `prompts` and `aiResponses` database tables, build the corresponding query functions, and create the POST `/api/session/[sessionId]/prompt` route. This route is the backbone of the chat feature — it saves the user's prompt to the database, calls `chatWithOllama()` directly (not via internal HTTP to `/api/chat`), streams the AI response back to the client, and saves the accumulated full response to the database after the stream completes. Partial responses are saved if the stream is aborted.

This task establishes the data logging for R010 (prompt/response persistence) and the server-side API for R005 (AI chat panel).

## Steps

1. **Extend `src/lib/db/schema.ts`** — Add two new tables:
   - `prompts`: `id` (integer PK autoIncrement), `sessionId` (text, not null), `sampleId` (integer, not null), `content` (text, not null), `promptNumber` (integer, not null), `createdAt` (text, default datetime('now'), not null)
   - `aiResponses`: `id` (integer PK autoIncrement), `promptId` (integer, not null), `content` (text, not null), `createdAt` (text, default datetime('now'), not null)
   - Keep all existing table definitions unchanged.

2. **Run `npx drizzle-kit push`** — Apply the schema changes to sqlite.db. Verify the new tables exist.

3. **Add query functions to `src/lib/db/queries.ts`**:
   - `savePrompt(sessionId: string, sampleId: number, content: string)` — Count existing prompts for this session+sample pair to compute `promptNumber` (same pattern as `saveRevision`), insert, and return the new row.
   - `saveAiResponse(promptId: number, content: string)` — Insert an AI response row linked to the prompt, return the new row.
   - `getPromptsForSample(sessionId: string, sampleId: number)` — Return all prompts for the given session+sample, ordered by promptNumber ascending, each joined/accompanied with its AI response content. The simplest approach: query prompts ordered by promptNumber, then for each prompt query its aiResponse. Or do a left join. Either works — the result should be an array of `{ id, content, promptNumber, createdAt, aiResponse: string | null }`.

4. **Create `src/app/api/session/[sessionId]/prompt/route.ts`** — POST handler:
   - Extract `sessionId` from route params. Parse body: `{ content: string, sampleId: number }`.
   - Validate: content must be non-empty string, sampleId must be a number. Return 400 if invalid.
   - Look up session via `getSession(sessionId)` — return 404 if not found.
   - Look up the writing sample content for AI context: query `writingSamples` table by `sampleId` (import from schema, or add a query helper).
   - Save prompt to DB via `savePrompt(sessionId, sampleId, content)`.
   - Build messages array for Ollama: previous prompts+responses for this session+sample (via `getPromptsForSample`) as conversation history, plus the new user message. This gives multi-turn context for iterative/scaffold modes.
   - Build system prompt: `ADVISORY_SYSTEM_PROMPT` + appended writing sample content (same pattern as `/api/chat` route).
   - Call `chatWithOllama(messages, systemPrompt)` — this returns an AsyncGenerator.
   - Stream the response back using `ReadableStream` with `TextEncoder`, accumulating chunks in a variable.
   - In the stream's `finally` block, save the accumulated text to DB via `saveAiResponse(promptId, accumulatedText)`. This ensures partial responses are saved even on abort.
   - Return the stream as `new Response(readableStream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })`.
   - Wrap the whole thing in try/catch: connection errors → 503, other errors → 500 (same pattern as `/api/chat`).

5. **Add a `getWritingSample(sampleId: number)` query** to `queries.ts` if one doesn't already exist — needed by the prompt route to get sample content for AI context.

6. **Test with curl** — After starting the dev server, run a curl command to POST a prompt and verify:
   - Streaming text appears on stdout
   - A row exists in `prompts` table
   - A row exists in `ai_responses` table with the accumulated response

## Must-Haves

- [ ] `prompts` table exists in sqlite.db with columns: id, session_id, sample_id, content, prompt_number, created_at
- [ ] `aiResponses` table exists in sqlite.db with columns: id, prompt_id, content, created_at
- [ ] `savePrompt()` returns a prompt row with auto-incremented promptNumber per session+sample
- [ ] `saveAiResponse()` links response to prompt via promptId
- [ ] `getPromptsForSample()` returns prompts with their AI responses, ordered by promptNumber
- [ ] POST `/api/session/{sessionId}/prompt` streams AI response and persists both prompt and response to DB
- [ ] Multi-turn context: the route builds the messages array from prior prompts+responses for the same session+sample
- [ ] AI response saved in `finally` block (not during streaming) so partial responses are captured on abort
- [ ] Existing routes and schema unchanged — additive only

## Verification

- `npx drizzle-kit push` completes without errors
- `node -e "const Database = require('better-sqlite3'); const db = new Database('sqlite.db'); console.log(db.prepare(\"SELECT name FROM sqlite_master WHERE type='table'\").all())"` shows `prompts` and `ai_responses` tables
- `npm run build` exits 0
- If Ollama is running: `curl -X POST http://localhost:3000/api/session/{sessionId}/prompt -H 'Content-Type: application/json' -d '{"content":"Help me improve the grammar","sampleId":1}'` returns streaming text. After completion, verify DB rows: `node -e "const Database = require('better-sqlite3'); const db = new Database('sqlite.db'); console.log(db.prepare('SELECT * FROM prompts').all()); console.log(db.prepare('SELECT * FROM ai_responses').all())"`

## Observability Impact

- Signals added: `prompts` and `ai_responses` DB tables — every prompt and AI response is persisted with timestamps and prompt numbers
- How a future agent inspects this: query `prompts` and `ai_responses` tables directly; `getPromptsForSample()` returns full conversation history
- Failure state exposed: 400 (bad input), 404 (session not found), 503 (Ollama down), 500 (unexpected error) — all with JSON error messages

## Inputs

- `src/lib/db/schema.ts` — existing schema with participants, sessions, writingSamples, revisions tables
- `src/lib/db/queries.ts` — existing query functions (saveRevision pattern to follow for promptNumber counting)
- `src/lib/db/index.ts` — `db` singleton export
- `src/lib/ollama.ts` — `chatWithOllama(messages, systemPrompt)` function, `ChatMessage` interface
- `src/lib/prompts.ts` — `ADVISORY_SYSTEM_PROMPT` constant
- `src/app/api/chat/route.ts` — reference for streaming ReadableStream pattern and error handling (do NOT modify this file)

## Expected Output

- `src/lib/db/schema.ts` — extended with `prompts` and `aiResponses` table definitions
- `src/lib/db/queries.ts` — extended with `savePrompt()`, `saveAiResponse()`, `getPromptsForSample()`, and optionally `getWritingSample()`
- `src/app/api/session/[sessionId]/prompt/route.ts` — new POST handler that streams AI responses and persists data
