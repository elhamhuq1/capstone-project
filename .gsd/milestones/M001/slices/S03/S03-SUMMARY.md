---
id: S03
parent: M001
milestone: M001
provides:
  - ChatPanel component with streaming AI responses, multi-turn conversation history, and single-shot enforcement
  - ScaffoldPanel component with 6 collapsible prompt engineering tips
  - Side-by-side study page layout (editor left, chat right)
  - prompts and aiResponses DB tables with savePrompt, saveAiResponse, getPromptsForSample query functions
  - POST /api/session/[sessionId]/prompt streaming route that persists prompts and AI responses
  - Session GET API extended with messages array for chat history resume
  - Chat history resets on sample advance via sampleId React key
requires:
  - slice: S01
    provides: chatWithOllama() helper, ADVISORY_SYSTEM_PROMPT, db singleton, Next.js project scaffold
  - slice: S02
    provides: sessions/writingSamples/revisions tables, getSessionWithCurrentSample(), study page with editing phase, WritingEditor component
affects:
  - S04
key_files:
  - src/lib/db/schema.ts
  - src/lib/db/queries.ts
  - src/app/api/session/[sessionId]/prompt/route.ts
  - src/app/api/session/[sessionId]/route.ts
  - src/components/ChatPanel.tsx
  - src/components/ScaffoldPanel.tsx
  - src/app/study/[sessionId]/page.tsx
  - scripts/verify-s03.sh
key_decisions:
  - Prompt API route calls chatWithOllama directly — not via internal HTTP to /api/chat (avoids extra network hop, simpler error handling)
  - Save AI response to DB BEFORE controller.close() in ReadableStream finally block — connection teardown after close aborts pending async writes (D018)
  - N+1 query pattern in getPromptsForSample (fetch each prompt's response individually) — acceptable at study scale (<100 prompts per session)
  - promptCount initialized from initialMessages user-message count so single-shot enforcement works correctly after session resume
  - Verification scripts use node + better-sqlite3 for DB queries instead of sqlite3 CLI for portability
patterns_established:
  - Streaming chat pattern: fetch → getReader → TextDecoder → accumulate chunks into growing assistant message in messages array
  - Single-shot enforcement: promptCount state + isSingleShotExhausted derived boolean gates input and send button
  - Collapsible panel pattern: useState(true) + aria-expanded + conditional rendering for ScaffoldPanel
  - Side-by-side layout: outer flex with flex-1 min-w-0 (editor) and w-[440px] flex-shrink-0 border-l (chat column)
  - Session resume pattern: GET API returns messages array from DB, ChatPanel accepts initialMessages prop
  - Component reset on data change: React key={sampleId} forces ChatPanel remount when participant advances to next sample
observability_surfaces:
  - prompts table — every user prompt persisted with auto-incrementing promptNumber per session+sample
  - ai_responses table — every AI response persisted linked to its prompt (including partial on abort)
  - GET /api/session/{sessionId} returns messages array — inspect for prompt/response round-trip verification
  - HTTP error codes on prompt route — 400 (bad input), 404 (session not found), 503 (Ollama down), 500 (unexpected)
  - ChatPanel inline error display — fetch failures surfaced to user, not console-only
  - scripts/verify-s03.sh — 7 automated API-level checks with graceful Ollama degradation
drill_down_paths:
  - .gsd/milestones/M001/slices/S03/tasks/T01-SUMMARY.md
  - .gsd/milestones/M001/slices/S03/tasks/T02-SUMMARY.md
  - .gsd/milestones/M001/slices/S03/tasks/T03-SUMMARY.md
duration: 58m
verification_result: passed
completed_at: 2026-03-17
---

# S03: AI Chat Panel + Mode Enforcement

**Streaming AI chat panel with three-mode enforcement (single-shot/iterative/scaffold), full prompt+response persistence, and side-by-side study layout**

## What Happened

**T01 — Data layer and API route (15m).** Extended the Drizzle schema with `prompts` (id, session_id, sample_id, content, prompt_number, created_at) and `aiResponses` (id, prompt_id, content, created_at) tables, pushed with drizzle-kit. Added four query functions: `savePrompt` (auto-incrementing promptNumber per session+sample), `saveAiResponse`, `getPromptsForSample` (returns prompts with their AI responses ordered by promptNumber), and `getWritingSample` (fetches sample content for AI context). Built POST `/api/session/[sessionId]/prompt` — validates input, saves prompt to DB, builds multi-turn conversation history from prior prompts, constructs system prompt with writing sample context, calls `chatWithOllama()` directly, streams response via ReadableStream, and saves accumulated response in the `finally` block before closing the stream.

**T02 — ChatPanel and ScaffoldPanel components (8m).** Built `ChatPanel` as a self-contained client component: message list with streaming display (fetch → getReader → TextDecoder → accumulate chunks), single-shot enforcement (promptCount state gating input when `group === 'single-shot' && promptCount >= 1`), AbortController + mountedRef for safe async cleanup, auto-scroll on new content, Enter to submit / Shift+Enter for newline, and `initialMessages` prop for session resume. Built `ScaffoldPanel` with 6 numbered prompt engineering tips (Be Specific, Ask for Explanations, Focus on One Thing, Provide Context, Iterate and Refine, Ask for Strategies Not Answers) in a collapsible card with emerald-tinted badges.

**T03 — Integration and verification (35m).** Restructured the study page's editing phase to side-by-side layout: editor in `flex-1 min-w-0` on the left, chat panel in `w-[440px] flex-shrink-0 border-l` on the right. ScaffoldPanel renders above ChatPanel for scaffold group only. ChatPanel gets `key={sampleId}` to force remount on sample advance (resets conversation). Extended the session GET API to call `getPromptsForSample()` and return a `messages` array for session resume. Fixed a critical bug: `saveAiResponse()` was called AFTER `controller.close()` in the ReadableStream finally block — connection teardown after close could abort the pending DB write. Moved save before close. Wrote `verify-s03.sh` with 7 automated checks using node+better-sqlite3 for DB queries.

## Verification

- `npm run build` exits 0 — all routes compile, no TypeScript errors
- All S03 routes registered: `/api/session/[sessionId]/prompt`, `/api/session/[sessionId]`, `/study/[sessionId]`
- `scripts/verify-s03.sh` — 7/7 checks pass with active Ollama; degrades gracefully when Ollama unavailable
- POST prompt API: validates input (400 on empty content, 400 on missing sampleId, 404 on bad session), streams AI response on valid input
- DB persistence: prompt rows created with auto-incrementing promptNumber, AI response rows linked to prompt IDs
- Session GET API returns `messages` array built from prompt/response history
- Browser verification (from T03): single-shot mode shows "You've used your one prompt" with disabled input after one exchange; scaffold mode shows 6 prompt engineering tips above chat; chat history persists across page reload
- Code review: ChatPanel initializes promptCount from initialMessages to correctly enforce single-shot on resume; AbortController cleaned up on unmount; mountedRef guards all async state updates

## Requirements Advanced

- R005 (AI chat panel with advisory system prompt) — ChatPanel streams AI responses from Ollama/Llama 3 8B using the ADVISORY_SYSTEM_PROMPT; advisory behavior enforced via system prompt injected in prompt route
- R006 (Single-shot mode enforces one-prompt limit) — ChatPanel disables input and shows amber notice after `promptCount >= 1` when `group === 'single-shot'`; enforcement persists across page reload via initialMessages count
- R007 (Iterative mode allows unlimited prompts) — No prompt limit applied for iterative group; multi-turn conversation context carried across prompts within a sample
- R008 (Scaffold mode with prompt engineering instruction panel) — ScaffoldPanel with 6 numbered tips rendered above ChatPanel for scaffold group; collapsible with aria-expanded; same unlimited prompting as iterative
- R010 (Full data logging — partial) — Every prompt and AI response persisted server-side in prompts/ai_responses tables with timestamps and promptNumber; completes the prompt/response logging piece (revision snapshots already in S02; survey responses and computed metrics remain for S04)

## Requirements Validated

- R005 — ChatPanel streams advisory AI responses, prompt route injects ADVISORY_SYSTEM_PROMPT with writing sample context, streaming display works end-to-end; verified via build + API tests + browser walkthrough
- R006 — Single-shot enforcement verified: input disabled after one prompt, amber notice displayed, enforcement survives page reload (promptCount initialized from initialMessages); verified via browser walkthrough
- R007 — Iterative mode verified: multiple prompts accepted, conversation context carries across exchanges (prior prompts/responses included in chatWithOllama call); same code path as scaffold minus ScaffoldPanel
- R008 — Scaffold mode verified: ScaffoldPanel with 6 tips renders above ChatPanel for scaffold group only, collapsible via button with aria-expanded, unlimited prompting works; verified via browser walkthrough

## New Requirements Surfaced

- none

## Requirements Invalidated or Re-scoped

- none

## Deviations

- **AI response save ordering (T03):** Discovered that `saveAiResponse()` after `controller.close()` silently fails because connection teardown aborts pending async writes. Fixed by moving the save before close. Not in the original plan but critical for data integrity.
- **Verification script uses node+better-sqlite3 (T03):** Plan assumed sqlite3 CLI availability; used `node -e` with better-sqlite3 instead since sqlite3 is not installed. Same verification coverage, better portability.
- **Curl streaming workaround (T03):** `-w "%{http_code}"` produces garbled output with streaming endpoints. Used `-D headerfile` and parsed status from first line instead.

## Known Limitations

- Ollama/Llama 3 8B cold-loads slowly on the host machine (>60s on first prompt), which can cause verification script timeouts. The script handles this gracefully but full automated pass requires a warm Ollama instance.
- Iterative mode was not independently browser-tested (same code path as scaffold minus ScaffoldPanel — verified by code inspection, not separate browser walkthrough).
- ChatPanel uses index-based React keys for messages (`key={i}`), which is fine for append-only conversation but would need stable IDs if messages could be reordered or deleted.

## Follow-ups

- S04 needs to add survey responses after each sample submission, completion screen, and computed metrics (time per sample, prompt length) — the prompt/response data layer from S03 is ready for S04 to build on.
- S04 should ensure `advanceSample()` flow still works correctly with the new side-by-side layout and ChatPanel remount behavior.

## Files Created/Modified

- `src/lib/db/schema.ts` — added prompts and aiResponses table definitions
- `src/lib/db/queries.ts` — added savePrompt, saveAiResponse, getPromptsForSample, getWritingSample query functions
- `src/app/api/session/[sessionId]/prompt/route.ts` — new POST route with streaming AI response + DB persistence; fixed save-before-close ordering
- `src/app/api/session/[sessionId]/route.ts` — extended GET to return messages array from prompt/response history
- `src/components/ChatPanel.tsx` — streaming chat component with single-shot/iterative mode enforcement, session resume, AbortController cleanup
- `src/components/ScaffoldPanel.tsx` — collapsible prompt engineering tips panel with 6 numbered tips
- `src/app/study/[sessionId]/page.tsx` — restructured editing phase to side-by-side layout with ChatPanel + conditional ScaffoldPanel
- `scripts/verify-s03.sh` — automated S03 verification script with 7 checks and Ollama graceful degradation

## Forward Intelligence

### What the next slice should know
- The prompt API route at POST `/api/session/{sessionId}/prompt` already persists every prompt and AI response. S04 can query prompts/ai_responses tables directly for data logging completeness checks — no additional prompt logging is needed.
- The session GET API at `/api/session/{sessionId}` returns the full current state including `messages`, `revisions`, `currentSample`, `currentSampleIndex`, and `group`. S04 can extend this response shape with survey data.
- `advanceSample()` in queries.ts handles sample progression and sets status to 'completed' after the 3rd sample. S04 needs to intercept this transition point to show the survey before advancing.
- The ChatPanel remounts on sample change via `key={sampleId}` — this is clean and intentional. S04 doesn't need to manage chat state across samples.

### What's fragile
- The `saveAiResponse()` call in the prompt route's ReadableStream finally block — it must stay BEFORE `controller.close()`. If anyone refactors the streaming logic, this ordering constraint is critical for data integrity.
- The study page layout relies on specific Tailwind classes (`flex-1 min-w-0` for editor, `w-[440px] flex-shrink-0` for chat). Adding a survey panel or changing layout for S04 needs to preserve or adapt these proportions.

### Authoritative diagnostics
- `scripts/verify-s03.sh` — exercises the full prompt API flow and checks DB state; run with `bash scripts/verify-s03.sh` (requires dev server on port 3000)
- `SELECT * FROM prompts; SELECT * FROM ai_responses;` via node+better-sqlite3 on sqlite.db — raw inspection of all prompt/response data
- `GET /api/session/{sessionId}` — the messages array shows the current prompt/response history for the active sample

### What assumptions changed
- Assumed Ollama response latency would be manageable — actual cold-load time is >60s on this machine, which means verification scripts need generous timeouts (90s) and graceful degradation when Ollama is slow or unavailable.
- Assumed sqlite3 CLI would be available for verification — it's not installed; all DB verification uses node+better-sqlite3 instead.
