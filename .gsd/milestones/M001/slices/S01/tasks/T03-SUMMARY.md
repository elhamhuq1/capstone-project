---
id: T03
parent: S01
milestone: M001
provides:
  - /test-chat proof page with streaming response display and error handling
  - Validated advisory system prompt — guidance by default, corrections on explicit request
key_files:
  - src/app/test-chat/page.tsx
key_decisions:
  - System prompt from T02 required no iteration — advisory behavior correct on first test
patterns_established:
  - Streaming fetch pattern with response.body.getReader() + TextDecoder for chunk-by-chunk display
  - AbortController for cancelling in-flight requests on new submissions
observability_surfaces:
  - /test-chat page — interactive browser proof of full streaming pipeline
  - Error banner renders on-page when Ollama is unreachable (role="alert")
  - Browser DevTools Network tab shows streaming text/plain response from /api/chat
duration: 25m
verification_result: passed
completed_at: 2026-03-17
blocker_discovered: false
---

# T03: Build test-chat proof page and validate advisory behavior end-to-end

**Built /test-chat streaming proof page and validated advisory system prompt — guidance for general help, corrections only on explicit rewrite request**

## What Happened

Created `src/app/test-chat/page.tsx` as a client component with:
- Textarea for user message input
- Optional textarea for writing sample context
- Send button that POSTs to `/api/chat` with streaming fetch
- Response display area (`<pre>`) that appends chunks word-by-word via `ReadableStream` reader
- Loading indicator while waiting for first chunk
- Error banner (role="alert") when API returns error (e.g., Ollama not running)
- AbortController to cancel in-flight requests on re-submit

Tested advisory behavior with three diverse prompts:

1. **General help** ("Help me improve this sentence: The dog was very big..."): Model identified vague language ("big", "running fast"), explained why they're weak, suggested strategies (specific adjectives, show-don't-tell) — did NOT provide a corrected sentence. ✅

2. **Structural question** ("paragraph about climate change feels disorganized..."): Model gave organizational guidance (focus on single aspect, use transitional phrases, create cohesion) — did NOT rewrite the paragraph. ✅

3. **Explicit rewrite request** ("Please rewrite this sentence to be more descriptive..."): Model provided actual rewritten sentences ("The massive golden retriever thundered across the field..."). Escalation behavior works. ✅

System prompt required no iteration — the ADVISORY_SYSTEM_PROMPT from T02 produced correct behavior on all three tests.

## Verification

- ✅ `/test-chat` page renders with heading, message textarea, writing sample textarea, and Send button
- ✅ Streaming response displays word-by-word as chunks arrive (tested 3 prompts, all streamed correctly)
- ✅ General help prompt → advisory guidance only (no corrected sentence volunteered)
- ✅ Structural question → organizational strategies (no rewritten paragraph)
- ✅ Explicit rewrite request → corrected/rewritten sentence provided (escalation works)
- ✅ Ollama stopped → error banner: "Ollama is not running. Start it with: ollama serve" (not blank screen or crash)
- ✅ `npm run build` succeeds with /test-chat as static page

### Slice-level verification (S01 — final task):
- ✅ `npm run build` completes without errors
- ✅ `curl http://localhost:11434/api/tags` confirms llama3 model available
- ✅ `/test-chat` page loads, accepts prompt, displays streaming advisory response
- ✅ When Ollama is not running, `/api/chat` returns clear JSON error `{ "error": "Ollama is not running..." }` with 503 status
- ✅ Advisory behavior correct: guidance by default, corrections on explicit request
- ✅ `npm run dev` starts and pages render without errors

## Diagnostics

- **Interactive proof:** Navigate to `http://localhost:3000/test-chat` with Ollama running
- **Ollama health:** `curl http://localhost:11434/api/tags` — must show llama3
- **API health:** `curl -X POST http://localhost:3000/api/chat -H 'Content-Type: application/json' -d '{"messages":[{"role":"user","content":"test"}]}'`
- **Error shape:** Stop Ollama, submit prompt → red error banner with descriptive message
- **Build check:** `npm run build` — /test-chat shows as static (○) route

## Deviations

None. System prompt from T02 worked correctly without iteration — no changes to `src/lib/prompts.ts` were needed.

## Known Issues

- Llama 3 8B responses occasionally truncate mid-sentence (likely model token/context limit), but this doesn't affect the advisory behavior proof
- Response generation is slow (~30-60 seconds for full response) due to running 8B model on CPU

## Files Created/Modified

- `src/app/test-chat/page.tsx` — Streaming proof page with textarea input, optional writing sample, Send button, chunk-by-chunk response display, and error handling
- `.gsd/milestones/M001/slices/S01/tasks/T03-PLAN.md` — Added missing Observability Impact section
