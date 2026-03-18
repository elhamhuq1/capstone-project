---
id: S01
parent: M001
milestone: M001
provides:
  - Next.js 16 App Router scaffold with TypeScript, Tailwind CSS, src/ directory
  - Drizzle ORM + better-sqlite3 database layer with participants table and WAL mode
  - serverExternalPackages config preventing native module bundling crash
  - chatWithOllama() streaming AsyncGenerator helper in src/lib/ollama.ts
  - ADVISORY_SYSTEM_PROMPT constant enforcing R005 advisory-by-default behavior
  - POST /api/chat streaming endpoint with input validation (400), Ollama-down handling (503), and general error handling (500)
  - /test-chat browser proof page with streaming response display
requires:
  - slice: none
    provides: first slice — no upstream dependencies
affects:
  - S02 (consumes project scaffold, database layer, Next.js config)
  - S03 (consumes chatWithOllama(), ADVISORY_SYSTEM_PROMPT, /api/chat endpoint)
key_files:
  - package.json
  - next.config.ts
  - drizzle.config.ts
  - src/lib/db/index.ts
  - src/lib/db/schema.ts
  - src/lib/ollama.ts
  - src/lib/prompts.ts
  - src/app/api/chat/route.ts
  - src/app/test-chat/page.tsx
key_decisions:
  - Used Next.js 16.1.7 (latest) — Turbopack default for builds, fully compatible
  - Drizzle ORM with better-sqlite3 driver — type-safe, schema-as-code
  - drizzle-kit push for schema management (no migration files in dev)
  - Ollama installed to ~/.local/bin (user-local) — requires manual `ollama serve`
  - Advisory system prompt validated — guidance by default, corrections only on explicit request
patterns_established:
  - Database singleton at src/lib/db/index.ts with WAL mode enabled
  - Schema files at src/lib/db/schema.ts (Drizzle sqlite-core)
  - Ollama chat helper wraps npm package, prepends system prompt, returns streaming AsyncGenerator
  - API routes return structured JSON errors with appropriate status codes (400/503/500)
  - Streaming fetch pattern with response.body.getReader() + TextDecoder for chunk-by-chunk display
  - AbortController for cancelling in-flight streaming requests
observability_surfaces:
  - "curl http://localhost:11434/api/tags — Ollama health and model availability"
  - "curl POST /api/chat — endpoint health; 503 = Ollama unreachable; 400 = bad input"
  - "/test-chat page — interactive browser proof of full streaming pipeline"
  - "node -e query against sqlite_master — confirms DB schema state"
  - "npm run build exit code — proves TypeScript + bundler health"
drill_down_paths:
  - .gsd/milestones/M001/slices/S01/tasks/T01-SUMMARY.md
  - .gsd/milestones/M001/slices/S01/tasks/T02-SUMMARY.md
  - .gsd/milestones/M001/slices/S01/tasks/T03-SUMMARY.md
duration: ~45m
verification_result: passed
completed_at: 2026-03-17
---

# S01: Project Foundation + Ollama AI Proof

**Shipped a working Next.js 16 project with SQLite/Drizzle database, a streaming /api/chat endpoint powered by Ollama/Llama 3 8B, and a browser proof page validating advisory-by-default AI behavior**

## What Happened

**T01 — Project scaffold:** Generated Next.js 16 App Router project with TypeScript, Tailwind CSS, and src/ directory structure. Installed Drizzle ORM + better-sqlite3 and configured `serverExternalPackages: ['better-sqlite3']` in next.config.ts to prevent native module bundling crashes. Created a database singleton with WAL mode and an initial `participants` table schema. Used `drizzle-kit push` to apply schema to SQLite. Had to scaffold in a temp directory because `create-next-app` rejects directory names with capital letters.

**T02 — Ollama integration + API route:** Installed Ollama 0.18.1 to `~/.local/bin/` (user-local, no sudo) and pulled the llama3 8B model (~4.7GB). Built `chatWithOllama()` as a streaming AsyncGenerator wrapper around the ollama npm package. Authored `ADVISORY_SYSTEM_PROMPT` — instructs the model to identify issues, explain why, suggest strategies, but NOT provide corrected text unless explicitly asked. Created `POST /api/chat` handler that validates input (400), streams Ollama responses as `ReadableStream` with `text/plain` content type, and returns structured JSON errors on connection failure (503).

**T03 — Proof page + advisory validation:** Built `/test-chat` client component with textarea input, optional writing sample context, and streaming response display using `getReader()` + `TextDecoder`. Tested with three diverse prompts: (1) general grammar help → advisory guidance only, (2) structural/organization question → strategies without rewriting, (3) explicit rewrite request → corrected text provided. System prompt produced correct behavior on all three tests without iteration.

## Verification

All slice-level checks passed:

- ✅ `npm run build` completes without errors — compiled in 5.7s, routes: / (static), /api/chat (dynamic), /test-chat (static)
- ✅ `npm run dev` starts and localhost:3000 renders without errors
- ✅ `curl http://localhost:11434/api/tags` confirms Ollama running with `llama3:latest` (8B, Q4_0)
- ✅ `curl POST /api/chat` with writing improvement prompt returns streaming advisory text — identifies issues, suggests strategies, does NOT rewrite the sentence
- ✅ `/test-chat` page loads, accepts prompt, displays streaming advisory response word-by-word
- ✅ When Ollama is stopped, `/api/chat` returns `{"error":"Ollama is not running. Start it with: ollama serve"}` with HTTP 503 (no crash)
- ✅ Input validation: empty body/messages → 400 with descriptive error
- ✅ `sqlite.db` exists (16384 bytes) with `participants` table confirmed via node query
- ✅ `serverExternalPackages: ['better-sqlite3']` confirmed in next.config.ts
- ✅ Advisory behavior validated across 3 prompt types: guidance by default, corrections only on explicit request

## Requirements Advanced

- R005 (AI chat panel with advisory system prompt) — System prompt authored and validated with real Llama 3 8B responses. Advisory-by-default behavior confirmed: guidance for general requests, corrections only when participant explicitly asks. This is S01's supporting contribution to R005 (primary owner: S03).

## Requirements Validated

- None — S01 is a foundation slice. Full requirement validation depends on downstream slices integrating these components into the study flow.

## New Requirements Surfaced

- None

## Requirements Invalidated or Re-scoped

- None

## Deviations

- **Next.js 16 instead of 14+**: `create-next-app@latest` installed v16.1.7. Fully compatible — Turbopack is the new default for builds, `serverExternalPackages` works correctly.
- **Ollama user-local install**: Standard install script requires sudo. Used direct tar.zst download to `~/.local/bin/`. Functional, but requires manual `ollama serve` start (no systemd service).
- **Scaffold in temp directory**: `create-next-app` rejects directory names with capital letters (the `M001` worktree). Scaffolded in `/tmp/nextapp-scaffold` and copied files back. No functional impact.

## Known Limitations

- **Llama 3 8B on CPU is slow** (~10 tokens/sec, 30-60s for full response). Streaming masks this partially since tokens appear incrementally, but study participants will experience noticeable wait times. GPU acceleration would improve this significantly.
- **Occasional response truncation**: Llama 3 8B sometimes truncates mid-sentence, likely due to context/token limits. Does not affect advisory behavior proof but may impact study experience.
- **Ollama must be started manually**: No systemd service — researcher must run `~/.local/bin/ollama serve` before each study session.
- **Advisory prompt edge case**: T02 noted the model occasionally included an example rewrite even in advisory mode ("I didn't rewrite... but..."). T03 testing showed this was not a consistent issue, but warrants monitoring during actual study use.

## Follow-ups

- S02 should extend `src/lib/db/schema.ts` with sessions, writingSamples, and revisions tables — the participants table and DB singleton are ready.
- S03 should wire `chatWithOllama()` and `ADVISORY_SYSTEM_PROMPT` into the chat panel component — the imports and interfaces are stable.
- Consider adding a startup script that checks Ollama availability before starting the dev server, to prevent confusion during study sessions.

## Files Created/Modified

- `package.json` — Next.js project manifest with ollama, better-sqlite3, drizzle-orm, drizzle-kit dependencies
- `package-lock.json` — Lockfile for reproducible installs
- `next.config.ts` — serverExternalPackages: ['better-sqlite3']
- `tsconfig.json` — TypeScript config (generated)
- `eslint.config.mjs` — ESLint config (generated)
- `postcss.config.mjs` — PostCSS config for Tailwind
- `drizzle.config.ts` — Drizzle Kit config pointing to sqlite.db
- `src/lib/db/index.ts` — Database singleton with WAL mode
- `src/lib/db/schema.ts` — Participants table schema (Drizzle sqlite-core)
- `src/lib/ollama.ts` — chatWithOllama() streaming AsyncGenerator wrapping ollama npm package
- `src/lib/prompts.ts` — ADVISORY_SYSTEM_PROMPT constant enforcing R005
- `src/app/api/chat/route.ts` — Streaming POST handler with validation and error handling
- `src/app/test-chat/page.tsx` — Browser proof page with streaming display
- `src/app/page.tsx` — Default landing page
- `src/app/layout.tsx` — Root layout
- `src/app/globals.css` — Tailwind imports
- `.gitignore` — *.db, *.db-journal, *.db-wal patterns

## Forward Intelligence

### What the next slice should know
- The database singleton at `src/lib/db/index.ts` uses `new Database('sqlite.db')` with a relative path — it resolves to the project root. All Drizzle queries go through the `db` export.
- `chatWithOllama()` returns the raw Ollama streaming response (AsyncGenerator). The `/api/chat` route wraps it in a `ReadableStream` — S03's chat panel should reuse the same streaming fetch pattern from `/test-chat/page.tsx` (getReader + TextDecoder loop).
- The `ADVISORY_SYSTEM_PROMPT` accepts appended context — the API route already demonstrates appending `writingSample` content. S03 should follow the same pattern.
- `ChatMessage` interface is exported from `src/lib/ollama.ts` with roles: 'system' | 'user' | 'assistant'.

### What's fragile
- **Ollama availability** — if `ollama serve` isn't running, every `/api/chat` call returns 503. There's no retry logic or health-check middleware. The study facilitator must ensure Ollama is running before participants start.
- **CPU inference speed** — 30-60s for a full response on CPU. If participants send multiple rapid requests, Ollama may queue them and compound latency. The study design should account for this.
- **SQLite relative path** — `new Database('sqlite.db')` resolves relative to CWD. If the dev server is started from a different directory, the DB file will be created elsewhere. Always start from project root.

### Authoritative diagnostics
- `curl http://localhost:11434/api/tags` — confirms Ollama is running and which models are loaded. If this fails, nothing downstream works.
- `npm run build` exit code — proves TypeScript compiles and all imports resolve. Run after any schema or route changes.
- `node -e "const Database = require('better-sqlite3'); const db = new Database('sqlite.db'); console.log(db.prepare(\"SELECT name FROM sqlite_master WHERE type='table'\").all())"` — lists all tables, confirms schema state.

### What assumptions changed
- **Next.js version**: Plan said "14+", got 16.1.7. No compatibility issues found — Turbopack works, serverExternalPackages works, App Router API is the same.
- **Ollama download format**: Documented as `.tgz`, actual releases use `.tar.zst` (zstd compression). The `.tgz` URL returns 404.
- **Advisory prompt strength**: Expected to need iteration — worked correctly on first test across all prompt types.
