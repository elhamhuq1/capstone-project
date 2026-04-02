# External Integrations

**Analysis Date:** 2026-04-02

## APIs & External Services

**AI / Language Models:**
- Google Gemini (gemini-2.5-flash) - Powers all AI writing advisory chat
  - SDK/Client: `@google/generative-ai` 0.24.1
  - Auth: `GEMINI_API_KEY` environment variable
  - Entry point: `src/lib/gemini.ts`
  - Usage: streaming chat via `sendMessageStream`; system prompt injected as `systemInstruction`; history passed as `history` to `startChat()`
  - Model default: `gemini-2.5-flash` (configurable parameter in `chatWithGemini`)

- Ollama (legacy/proxied) - Previously used for local Llama 3 8B inference
  - SDK/Client: `ollama` 0.6.3 (still in `package.json`)
  - Auth: None (local service at `http://localhost:11434`)
  - Current state: `src/lib/ollama.ts` re-exports Gemini functions under the `chatWithOllama` alias — Ollama is not called in active code paths
  - Error handling code in `src/app/api/chat/route.ts` and `src/app/api/session/[sessionId]/prompt/route.ts` still references Ollama error messages (ECONNREFUSED)

**Fonts:**
- Google Fonts (via `next/font/google`) - Inter and IBM Plex Mono loaded at build time
  - Entry point: `src/app/layout.tsx`
  - No API key required

## Data Storage

**Databases:**
- PostgreSQL (Supabase-hosted, inferred from git history and connection string pattern)
  - Connection: `DATABASE_URL` environment variable
  - Client: Drizzle ORM with `drizzle-orm/node-postgres` adapter (`pg` Pool)
  - Pool settings: max 3 connections, 10s connection timeout, SSL enabled
  - Entry point: `src/lib/db/index.ts`
  - Schema: `src/lib/db/schema.ts` (8 tables: `participants`, `sessions`, `writing_samples`, `revisions`, `prompts`, `ai_responses`, `survey_responses`, `sample_timings`, `final_submissions`)
  - All queries centralized in: `src/lib/db/queries.ts`

- SQLite (legacy) - `sqlite.db` and `study.db` files present in project root; used only in `scripts/backfill-final-submissions.js` via `better-sqlite3`; no longer used by the running application

**File Storage:**
- Local filesystem only — no object storage (S3, etc.)
- CSV export generated in-memory and streamed directly from `GET /api/researcher/export`

**Caching:**
- None — no Redis, Memcached, or Next.js cache configuration

## Authentication & Identity

**Auth Provider:**
- None — no authentication on any routes
- Researcher dashboard at `/researcher` and all `/api/researcher/*` endpoints are publicly accessible by design
- Participant identity tracked via name + email at registration; session IDs generated with `crypto.randomUUID()`
- Email normalized to lowercase before lookup (`src/lib/db/queries.ts` → `findParticipantByEmail`)

## Monitoring & Observability

**Error Tracking:**
- None — no Sentry, Datadog, or similar service integrated

**Logs:**
- `console.error()` used in API route catch blocks with route-prefixed labels (e.g., `[register] Error:`, `[researcher/export] GET error:`)
- No structured logging library

## CI/CD & Deployment

**Hosting:**
- Vercel (inferred from `public/vercel.svg`, git commit history referencing Vercel deployment, and serverless-optimized DB pool settings)

**CI Pipeline:**
- None detected — no `.github/workflows/`, `vercel.json`, or CI config files present
- Manual verification scripts at `scripts/verify-s02.sh` through `scripts/verify-s05.sh` for regression testing

## Environment Configuration

**Required env vars (from source inspection):**
- `DATABASE_URL` — PostgreSQL connection string (must include credentials, host, and database name)
- `GEMINI_API_KEY` — Google Generative AI API key for chat functionality

**Secrets location:**
- `.env.local` at project root (gitignored; contents not inspected)

## Webhooks & Callbacks

**Incoming:**
- None — no webhook endpoints

**Outgoing:**
- None — no outbound webhook calls; AI requests are synchronous request/response with streaming

## Browser Integration Notes

- **Grammarly blocking**: CSS in `src/app/globals.css` hides Grammarly DOM elements; `src/components/WritingAssistantBlocker.tsx` sets `data-gramm="false"` on all textareas via MutationObserver
- **Google Gemini "Help me write" blocking**: CSS and DOM attribute suppression in the same files above
- These measures are intentional for study integrity — participants must not receive AI assistance outside the controlled chat panel

---

*Integration audit: 2026-04-02*
