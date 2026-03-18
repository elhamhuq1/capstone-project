# S03: AI Chat Panel + Mode Enforcement

**Goal:** Participant can prompt the AI for writing suggestions inside the study flow — single-shot disables input after one prompt, iterative allows multi-turn conversation, scaffold shows prompt engineering instruction panel alongside chat.
**Demo:** During the editing phase, a chat panel appears alongside the writing editor. Typing a prompt and sending it streams an advisory AI response. In single-shot mode, the input disables after one exchange. In scaffold mode, a collapsible instruction panel with prompt engineering tips is visible alongside the chat.

## Must-Haves

- `prompts` and `aiResponses` tables in the database schema, with query functions for saving and loading
- POST `/api/session/[sessionId]/prompt` route that saves the prompt to DB, calls `chatWithOllama()` directly, streams response, and saves the full AI response to DB after stream completes
- `ChatPanel` component with streaming response display, message history, and mode-aware input control
- Single-shot mode: input disabled after one successful prompt per sample
- Iterative mode: unlimited multi-turn conversation with context carrying across prompts
- Scaffold mode: same as iterative, plus a `ScaffoldPanel` component with static prompt engineering tips
- Chat history reloads from DB on page refresh (session resume for prompts)
- Chat history resets when participant advances to next sample (via `sampleId` as React key)
- Study page layout changed to side-by-side: editor left, chat right
- All prompts and AI responses persisted server-side for R010 data logging

## Proof Level

- This slice proves: integration
- Real runtime required: yes (Ollama must be running for AI responses)
- Human/UAT required: no (curl + browser checks sufficient)

## Verification

- `bash scripts/verify-s03.sh` — automated checks covering:
  - POST `/api/session/{sessionId}/prompt` returns streaming response
  - `prompts` and `ai_responses` tables exist with correct columns
  - Prompt and AI response rows created after API call
  - `getPromptsForSample()` returns saved prompt+response data
- `npm run build` exits 0 — no TypeScript errors
- Browser check: single-shot mode disables input after one prompt
- Browser check: iterative mode allows multiple prompts with conversation context
- Browser check: scaffold mode shows instruction panel alongside chat
- Browser check: page reload restores chat history from DB

## Observability / Diagnostics

- Runtime signals: prompt saved to DB with auto-incrementing promptNumber; AI response saved after stream completes (including partial responses on abort)
- Inspection surfaces: `GET /api/session/[sessionId]` already returns full session state; DB `prompts` and `ai_responses` tables directly queryable; `getPromptsForSample(sessionId, sampleId)` returns full prompt+response history
- Failure visibility: Ollama connection errors return 503 with descriptive message; prompt save failures return 500; streaming errors captured in response body
- Redaction constraints: none (no secrets in prompts/responses)

## Integration Closure

- Upstream surfaces consumed:
  - `src/lib/ollama.ts` → `chatWithOllama()` (S01)
  - `src/lib/prompts.ts` → `ADVISORY_SYSTEM_PROMPT` (S01)
  - `src/lib/db/index.ts` → `db` singleton (S01)
  - `src/lib/db/schema.ts` → existing tables (S01/S02)
  - `src/lib/db/queries.ts` → `getSessionWithCurrentSample()`, `getSession()` (S02)
  - `src/app/study/[sessionId]/page.tsx` → study flow page with editing phase (S02)
  - `src/components/WritingEditor.tsx` → editor component (S02)
- New wiring introduced in this slice:
  - `prompts` and `aiResponses` tables in schema
  - `savePrompt()`, `saveAiResponse()`, `getPromptsForSample()` in query layer
  - POST `/api/session/[sessionId]/prompt` route
  - `ChatPanel` component wired into study page editing phase
  - `ScaffoldPanel` component conditionally rendered for scaffold group
  - Study page layout restructured to side-by-side (editor + chat)
- What remains before the milestone is truly usable end-to-end: S04 (surveys, completion screen, full data logging), S05 (researcher dashboard, CSV export)

## Tasks

- [x] **T01: Extend schema with prompts/aiResponses tables and build prompt API route** `est:25m`
  - Why: The data layer and API route are prerequisites for everything else in S03. The prompt API route calls `chatWithOllama()` directly, streams the response, and persists both the prompt and final AI response to the database — this is the backbone of R005 and R010 data logging.
  - Files: `src/lib/db/schema.ts`, `src/lib/db/queries.ts`, `src/app/api/session/[sessionId]/prompt/route.ts`
  - Do: Add `prompts` table (id, sessionId, sampleId, content, promptNumber, createdAt) and `aiResponses` table (id, promptId, content, createdAt) to schema. Add `savePrompt()`, `saveAiResponse()`, `getPromptsForSample()` query functions. Run `npx drizzle-kit push`. Build POST route that validates input, saves prompt to DB, calls `chatWithOllama()` with ADVISORY_SYSTEM_PROMPT + writing sample context, streams response back to client, and saves accumulated response to DB in `finally` block. The route must accept `{ content, sampleId }` and look up session data + current sample content for AI context.
  - Verify: `npx drizzle-kit push` succeeds; `curl -X POST /api/session/{sessionId}/prompt -d '{"content":"Help me improve this","sampleId":1}'` returns streaming text AND creates rows in prompts + ai_responses tables
  - Done when: prompt API route streams AI responses and persists both prompt and response to the database

- [x] **T02: Build ChatPanel and ScaffoldPanel components** `est:30m`
  - Why: The ChatPanel is the core UI for R005/R006/R007 — it handles streaming display, multi-turn conversation, and single-shot enforcement. The ScaffoldPanel is a simple static component for R008. Building both as standalone components before integration keeps the work focused.
  - Files: `src/components/ChatPanel.tsx`, `src/components/ScaffoldPanel.tsx`
  - Do: Build ChatPanel with: message list state (user + assistant messages), streaming response display using fetch + getReader + TextDecoder pattern (from test-chat), mode enforcement (single-shot: disable input after promptCount >= 1; iterative/scaffold: no limit), AbortController cleanup on unmount, initial message loading from props for session resume. Props: `sessionId`, `sampleId`, `sampleContent`, `group`, `initialMessages`. Build ScaffoldPanel with collapsible prompt engineering tips (numbered tips with examples). Both components are 'use client'.
  - Verify: Components compile without TypeScript errors (`npm run build`); ChatPanel renders message list and input; ScaffoldPanel renders collapsible tips
  - Done when: Both components are complete, self-contained, and ready to wire into the study page

- [x] **T03: Integrate chat into study page layout and write verification script** `est:20m`
  - Why: This task wires everything together — the ChatPanel and ScaffoldPanel into the study flow's editing phase alongside the WritingEditor. It also writes the verification script that proves the entire S03 deliverable works end-to-end.
  - Files: `src/app/study/[sessionId]/page.tsx`, `src/app/api/session/[sessionId]/route.ts`, `scripts/verify-s03.sh`
  - Do: Modify the study page's editing phase to use a side-by-side layout (editor left, chat right). Pass `sessionId`, `sampleId`, `sampleContent`, `group`, and `initialMessages` (from session API) to ChatPanel. Use `sampleId` as React `key` on ChatPanel to force remount on sample change. Conditionally render ScaffoldPanel above ChatPanel for scaffold group. Extend the session GET API to include prompt/response history for the current sample. Restructure the layout to accommodate editor + chat + optional scaffold without breaking the existing editor behavior (save, revision sidebar, submit-and-advance). Write `scripts/verify-s03.sh` with automated API-level checks.
  - Verify: `bash scripts/verify-s03.sh` passes; `npm run build` exits 0; browser walkthrough confirms side-by-side layout, chat streaming, and mode enforcement
  - Done when: All three modes work in the browser — single-shot disables after one prompt, iterative allows multi-turn, scaffold shows instruction panel — and the verification script passes

## Files Likely Touched

- `src/lib/db/schema.ts`
- `src/lib/db/queries.ts`
- `src/app/api/session/[sessionId]/prompt/route.ts`
- `src/components/ChatPanel.tsx`
- `src/components/ScaffoldPanel.tsx`
- `src/app/study/[sessionId]/page.tsx`
- `src/app/api/session/[sessionId]/route.ts`
- `scripts/verify-s03.sh`
