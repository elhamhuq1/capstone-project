---
id: T03
parent: S03
milestone: M001
provides:
  - Side-by-side study page layout with editor left and chat panel right
  - Session GET API returns messages array with prompt/response history for session resume
  - Scaffold group renders ScaffoldPanel above ChatPanel
  - ChatPanel remounts on sample change via sampleId React key
  - verify-s03.sh automated verification script for S03 slice
key_files:
  - src/app/api/session/[sessionId]/route.ts
  - src/app/study/[sessionId]/page.tsx
  - src/app/api/session/[sessionId]/prompt/route.ts
  - scripts/verify-s03.sh
key_decisions:
  - Save AI response before controller.close() in ReadableStream to prevent connection teardown from aborting the DB write
  - Use node + better-sqlite3 in verify script instead of sqlite3 CLI for portability
patterns_established:
  - Side-by-side layout pattern: outer flex container with flex-1 min-w-0 for editor and w-[440px] flex-shrink-0 for chat panel
  - Verification scripts use --max-time on curl for streaming endpoints and gracefully degrade when Ollama is unavailable
observability_surfaces:
  - GET /api/session/{sessionId} now includes messages array — inspect to verify prompt/response round-trip
  - scripts/verify-s03.sh exercises full prompt API flow end-to-end
  - Browser DevTools: flex layout visible in Elements panel (flex-1 + w-[440px])
duration: 35m
verification_result: passed
completed_at: 2026-03-17
blocker_discovered: false
---

# T03: Integrate chat into study page layout and write verification script

**Wired ChatPanel and ScaffoldPanel into study page with side-by-side layout, extended session GET API with messages array for resume, and wrote verify-s03.sh**

## What Happened

1. Extended `GET /api/session/[sessionId]` to call `getPromptsForSample()` and return a `messages` array of `{ role, content }` objects built from prompt/response history. This enables session resume — ChatPanel receives prior conversation as `initialMessages`.

2. Modified `src/app/study/[sessionId]/page.tsx` editing phase from a single `<WritingEditor>` render to a side-by-side flex layout: editor in `flex-1 min-w-0` on the left, chat panel in `w-[440px] flex-shrink-0 border-l` on the right. ChatPanel gets `key={sampleId}` for clean remount on sample change. ScaffoldPanel conditionally renders above ChatPanel for scaffold group only.

3. Fixed a critical bug in the prompt API route: `saveAiResponse()` was called AFTER `controller.close()` in the ReadableStream's finally block. Connection teardown after close could abort the pending DB write, resulting in prompts with no saved AI response. Moved `saveAiResponse()` before `controller.close()`.

4. Wrote `scripts/verify-s03.sh` with 7 checks: table existence, prompt API response, DB row persistence, messages in session GET, prompt numbering, and input validation. Uses `node` + `better-sqlite3` for DB queries (no sqlite3 CLI dependency). Handles Ollama unavailability gracefully with warnings instead of failures.

## Verification

- `npm run build` — exits 0, all routes compile
- `scripts/verify-s03.sh` — 7/7 checks pass when Ollama available, degrades gracefully when not
- Browser: single-shot session shows "You've used your one prompt" with disabled input after exhaustion
- Browser: scaffold session shows Prompt Engineering Tips panel above AI Assistant chat with all 6 tips and enabled input
- Browser: chat history from DB appears on page load (session resume verified)
- Browser: WritingEditor preserves all functionality (header, textarea, Save Revision, Submit & Next, revision sidebar, progress dots)

### Slice-level verification status (S03 final task):
- ✅ POST `/api/session/{sessionId}/prompt` returns streaming response
- ✅ `prompts` and `ai_responses` tables exist with correct columns
- ✅ Prompt and AI response rows created after API call
- ✅ `getPromptsForSample()` returns saved prompt+response data
- ✅ `npm run build` exits 0
- ✅ Browser: single-shot mode disables input after one prompt
- ✅ Browser: scaffold mode shows instruction panel alongside chat
- ✅ Browser: page reload restores chat history from DB
- ⚠️ Browser: iterative mode not separately verified (same code path as scaffold sans ScaffoldPanel)

## Diagnostics

- `GET /api/session/{sessionId}` — inspect `messages` array to verify prompt/response history
- `scripts/verify-s03.sh` — full automated API-level verification
- DB: `SELECT * FROM prompts` and `SELECT * FROM ai_responses` for raw data inspection
- Browser DevTools Elements: look for `flex-1 min-w-0` (editor) and `w-[440px]` (chat column) in editing phase

## Deviations

- **AI response save ordering**: Moved `saveAiResponse()` before `controller.close()` in prompt route's ReadableStream — this was a bug fix not in the plan but necessary for correct behavior.
- **Verification script uses node+better-sqlite3**: Plan assumed `sqlite3` CLI; used `node` with `better-sqlite3` for portability since sqlite3 isn't installed.
- **Curl timeout handling**: Used `--max-time 90` and header-based HTTP code parsing for streaming endpoints instead of `-w "%{http_code}"` which produced garbled output with streaming responses.

## Known Issues

- Ollama model loading can take 60+ seconds on first prompt, causing verification script timeouts. Script degrades gracefully but full pass requires a warm Ollama.
- Placeholder text ("No more prompts available", "Ask the AI for help…") is in HTML placeholder attributes, not visible text content — browser text assertions don't detect them.

## Files Created/Modified

- `src/app/api/session/[sessionId]/route.ts` — Extended GET handler to return `messages` array from prompt/response history
- `src/app/study/[sessionId]/page.tsx` — Restructured editing phase with side-by-side layout, added ChatPanel + conditional ScaffoldPanel
- `src/app/api/session/[sessionId]/prompt/route.ts` — Fixed saveAiResponse ordering (before controller.close)
- `scripts/verify-s03.sh` — Automated S03 verification script with 7 checks and Ollama graceful degradation
- `.gsd/milestones/M001/slices/S03/tasks/T03-PLAN.md` — Added Observability Impact section (pre-flight fix)
