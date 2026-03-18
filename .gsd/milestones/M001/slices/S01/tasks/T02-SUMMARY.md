---
id: T02
parent: S01
milestone: M001
provides:
  - Ollama 0.18.1 installed at ~/.local/bin/ollama with llama3 8B model pulled
  - chatWithOllama() streaming helper in src/lib/ollama.ts
  - ADVISORY_SYSTEM_PROMPT constant in src/lib/prompts.ts enforcing R005 advisory-by-default
  - POST /api/chat streaming endpoint with error handling (400/503/500)
key_files:
  - src/lib/ollama.ts
  - src/lib/prompts.ts
  - src/app/api/chat/route.ts
key_decisions:
  - Installed Ollama to ~/.local/bin (user-local) via direct tar.zst download since sudo is unavailable; ollama serve must be started manually
patterns_established:
  - Ollama chat helper wraps ollama npm package, prepends system prompt, returns streaming AsyncGenerator
  - API routes return 503 JSON with descriptive message on Ollama connection failure, 400 for invalid input
  - System prompt appended with writingSample when provided, giving AI context about student's text
observability_surfaces:
  - "curl http://localhost:11434/api/tags — Ollama health and model availability"
  - "curl POST /api/chat — endpoint health; 503 means Ollama unreachable; 400 means bad input"
  - "Response header Content-Type: text/plain; charset=utf-8 confirms streaming mode"
duration: ~15m (code) + ~2m (model pull)
verification_result: passed
completed_at: 2026-03-17
blocker_discovered: false
---

# T02: Install Ollama, build chat helper with advisory system prompt, and create streaming API route

**Installed Ollama 0.18.1 to user-local, pulled llama3 8B, built streaming /api/chat endpoint with advisory system prompt and graceful error handling**

## What Happened

Installed Ollama 0.18.1 by downloading the `ollama-linux-amd64.tar.zst` archive directly to `~/.local/bin/` (sudo unavailable, so the standard install script couldn't write to `/usr/local`). Started `ollama serve` manually and pulled the llama3 model (~4.7GB).

Created three files:
1. **`src/lib/ollama.ts`** — Chat helper wrapping the `ollama` npm package. `chatWithOllama(messages, systemPrompt, model)` prepends the system prompt and returns a streaming AsyncGenerator.
2. **`src/lib/prompts.ts`** — `ADVISORY_SYSTEM_PROMPT` constant that instructs the model to identify issues, explain why, and suggest strategies without providing corrected text unless explicitly asked (R005).
3. **`src/app/api/chat/route.ts`** — POST handler accepting `{ messages, writingSample? }`. Validates input (400), streams Ollama response as `ReadableStream` with `text/plain` content type, catches connection errors and returns 503 JSON.

## Verification

All must-haves verified:

- **Ollama running**: `curl http://localhost:11434/api/tags` → `llama3:latest` (8B, Q4_0) ✅
- **Build passes**: `npm run build` exit 0, route `/api/chat` listed as dynamic ✅
- **Streaming response**: `curl POST /api/chat` with writing improvement prompt → received 1333+ bytes of streaming advisory text identifying vague adjectives, suggesting specific word choices, and strategies — did NOT rewrite the sentence ✅
- **Input validation**: Empty body and empty messages array both return `{"error":"messages array is required and must not be empty"}` ✅
- **Error handling (503)**: Stopped Ollama, curled API → `{"error":"Ollama is not running. Start it with: ollama serve"}` with HTTP 503 ✅
- **Ollama restarted** after error test ✅

### Slice-Level Verification (partial — T02 of 3)
- [x] `npm run build` completes without errors
- [x] `curl http://localhost:11434/api/tags` confirms llama3 model available
- [x] `curl POST /api/chat` returns streaming advisory text
- [x] Ollama-down → clear JSON error (not crash)
- [ ] `/test-chat` page (T03)

## Diagnostics

- **Ollama health**: `curl http://localhost:11434/api/tags` — must show llama3 in models array
- **Ollama binary location**: `~/.local/bin/ollama` (not system-wide — requires PATH or absolute path)
- **Start Ollama manually**: `~/.local/bin/ollama serve` (no systemd service configured)
- **API health**: `curl -X POST http://localhost:3000/api/chat -H 'Content-Type: application/json' -d '{"messages":[{"role":"user","content":"test"}]}'`
- **Error shape**: `{"error":"..."}` with appropriate status (400/503/500)

## Deviations

- **Ollama installed to user-local (`~/.local/bin/`) instead of system-wide** — `sudo` is unavailable, so the standard `install.sh` failed. Downloaded `ollama-linux-amd64.tar.zst` directly and extracted to `~/.local/`. Ollama must be started manually with `~/.local/bin/ollama serve` rather than via systemd.
- **Download URL was `tar.zst` not `tgz`** — The documented `.tgz` URL returned 404; the `.tar.zst` URL worked. Current Ollama releases use zstd compression.

## Known Issues

- Llama3 8B on CPU is slow (~10 tokens/sec). Responses may take 60+ seconds for full completion. The streaming interface masks this partially since tokens appear incrementally.
- The advisory prompt did include an example rewrite in the test response (model said "I didn't rewrite... but..." then showed one). T03 should test diverse prompts and may need to strengthen the prompt.

## Files Created/Modified

- `src/lib/ollama.ts` — Chat helper wrapping ollama npm package with streaming AsyncGenerator
- `src/lib/prompts.ts` — Advisory system prompt constant enforcing R005 guidance-by-default
- `src/app/api/chat/route.ts` — Streaming POST handler with input validation and error handling
