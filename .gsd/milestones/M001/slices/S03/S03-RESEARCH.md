# S03 ("AI Chat Panel + Mode Enforcement") — Research

**Date:** 2026-03-17

## Summary

S03 adds the AI chat panel to the study flow and enforces three interaction modes: single-shot (one prompt per sample), iterative (unlimited multi-turn), and scaffold (iterative + static prompt-engineering instruction panel). The slice also extends the database to log every prompt and AI response for R010.

The work is straightforward. The streaming chat pattern is fully proven in `/test-chat/page.tsx` — `fetch('/api/chat')` with `getReader()` + `TextDecoder` loop. The session API already returns `group` (one of `'single-shot'`, `'iterative'`, `'scaffold'`), and the study page has a clear editing phase where the ChatPanel slots in alongside the WritingEditor. The `/api/chat` endpoint already accepts `messages` array and optional `writingSample` context — no backend AI changes needed.

The main design work is: (1) a `ChatPanel` component with message history, streaming display, and mode-aware input control, (2) extending the DB schema with `prompts` and `aiResponses` tables and corresponding query functions, (3) a `ScaffoldPanel` component with static prompt-engineering tips, and (4) modifying the study page layout to arrange editor + chat side-by-side (with scaffold panel for scaffold group).

## Recommendation

Build in this order: schema extension → query layer → ChatPanel component → ScaffoldPanel → study page integration. The schema/queries are fast and unblock data logging. The ChatPanel is the core deliverable. The scaffold panel is a simple static component. Final integration wires everything into the existing study page.

Reuse the streaming fetch pattern verbatim from `src/app/test-chat/page.tsx`. The `/api/chat` route does not need modification — it already accepts multi-turn `messages[]` with optional `writingSample` context, which is exactly what all three modes need.

Mode enforcement is purely client-side UI logic:
- **Single-shot**: After one successful send, disable the input and send button. Track `promptCount` in component state.
- **Iterative**: No restrictions — standard multi-turn chat.
- **Scaffold**: Same as iterative, but render the `ScaffoldPanel` alongside.

All prompts and AI responses should be persisted server-side via new API routes so data survives page refreshes and is available for R010/S04/S05.

## Implementation Landscape

### Key Files

- `src/lib/db/schema.ts` — **Extend** with `prompts` and `aiResponses` tables. `prompts`: sessionId, sampleId, content, promptNumber, createdAt. `aiResponses`: promptId (FK), content (full accumulated text), createdAt.
- `src/lib/db/queries.ts` — **Extend** with: `savePrompt(sessionId, sampleId, content)` → returns prompt with auto-incremented promptNumber; `saveAiResponse(promptId, content)` → saves final accumulated response; `getPromptsForSample(sessionId, sampleId)` → returns prompts + responses for rebuilding chat history on page reload.
- `src/app/api/session/[sessionId]/prompt/route.ts` — **New** POST route: saves prompt to DB, calls `/api/chat` internally (or calls `chatWithOllama` directly), streams response back to client, saves final AI response to DB after stream completes. Must accept `{ content, sampleId }` and include `writingSample` context. Returns streaming text (same pattern as `/api/chat`).
- `src/components/ChatPanel.tsx` — **New** client component. Props: `sessionId`, `sampleId`, `sampleContent` (for AI context), `group` (for mode enforcement), `initialMessages` (for reload recovery). Manages message list state, streaming response display, input disable for single-shot after first response.
- `src/components/ScaffoldPanel.tsx` — **New** static component. Prompt engineering tips (collapsible). Rendered only when `group === 'scaffold'`.
- `src/app/study/[sessionId]/page.tsx` — **Modify** the editing phase: change layout from editor-only to side-by-side (editor left, chat right). Pass `group`, `sampleId`, `sampleContent` to ChatPanel. Conditionally render ScaffoldPanel for scaffold group.
- `src/lib/ollama.ts` — **No changes**. `chatWithOllama()` already does what's needed.
- `src/lib/prompts.ts` — **No changes**. `ADVISORY_SYSTEM_PROMPT` is already correct.
- `src/app/api/chat/route.ts` — **No changes**. May be bypassed if the new prompt route calls `chatWithOllama()` directly (preferred — avoids an internal HTTP call and lets the route save the response to DB after streaming finishes).

### Build Order

1. **Schema + queries** (fast, no dependencies) — extend schema.ts with two tables, add query functions, `npx drizzle-kit push`. This unblocks all data-writing tasks.
2. **Prompt API route** — POST handler that saves prompt, calls `chatWithOllama()` directly, streams response, saves AI response after stream completes. Test with curl.
3. **ChatPanel component** — streaming chat UI with mode enforcement. Reuse streaming pattern from test-chat. Load existing prompts/responses on mount for session resume.
4. **ScaffoldPanel component** — static prompt engineering tips. Quick standalone build.
5. **Study page integration** — modify editing phase layout to include ChatPanel (all groups) and ScaffoldPanel (scaffold group only). Wire props from sessionData.

### Verification Approach

- `npx drizzle-kit push` succeeds — new tables created in sqlite.db
- `curl POST /api/session/{sessionId}/prompt` with `{ content, sampleId }` → returns streaming AI response AND creates rows in prompts + aiResponses tables
- Single-shot enforcement: after one prompt, the input is disabled (browser check)
- Iterative: multiple prompts in sequence, conversation context builds (browser check)
- Scaffold: instruction panel visible alongside chat (browser check)
- Session resume: reload the page mid-sample → chat history reappears from DB
- `npm run build` exits 0 — no TypeScript errors
- DB query: `SELECT COUNT(*) FROM prompts` and `SELECT COUNT(*) FROM ai_responses` after test interactions confirm data logging

## Constraints

- The prompt API route should call `chatWithOllama()` directly (importing from `src/lib/ollama.ts`) rather than making an internal HTTP request to `/api/chat`. This avoids localhost fetch overhead and, critically, lets the route accumulate the full streamed response and save it to the DB after the stream finishes.
- The `/api/chat` route already exists and works — leave it untouched (test-chat page still uses it).
- `WritingEditor` currently occupies the full editing phase. The layout change must preserve the existing editor behavior (save, revision history sidebar, submit-and-advance) while adding the ChatPanel alongside.
- Mode enforcement is client-side — the server doesn't need to enforce prompt limits because the study is supervised and research data integrity relies on logging, not prevention. However, the DB does record `promptNumber` per sample for analysis.
- The `ScaffoldPanel` content (prompt engineering tips) should be authored as a constant or static data — the research team will finalize wording, but placeholder content should demonstrate the structure (numbered tips, examples, collapsible sections).

## Common Pitfalls

- **Streaming + DB save race**: The AI response must be saved to DB only after the full stream completes, not on each chunk. Accumulate chunks in the route handler, write to DB in the `finally` block after streaming finishes. If the stream is aborted, save whatever was accumulated (partial responses are still valuable research data).
- **Chat history on sample change**: When the participant advances to the next sample, the chat history must reset. The ChatPanel receives `sampleId` as a prop — use it as a React `key` to force remount, which naturally clears local state and reloads from DB.
- **Layout breakage**: The WritingEditor currently uses `flex-1` in a row with a `w-64` revision sidebar. Adding a ChatPanel means restructuring to a 3-column or 2-panel layout. The revision sidebar could move inside the editor panel or become a collapsible element to free horizontal space.
- **AbortController cleanup**: The streaming fetch must be aborted on component unmount (sample change, page navigation) to prevent state updates on unmounted components. The test-chat page already demonstrates this pattern with `abortRef`.
