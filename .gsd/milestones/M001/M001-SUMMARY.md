---
id: M001
provides:
  - Complete research-ready web application for conducting a controlled prompt engineering study
  - Participant registration with balanced random group assignment (single-shot / iterative / scaffold)
  - 3-sample writing revision flow with in-place editor and full revision history
  - Streaming AI chat panel (Ollama/Llama 3 8B) with advisory-by-default system prompt
  - Three-mode enforcement — single-shot (one prompt limit), iterative (unlimited), scaffold (unlimited + instruction panel)
  - Post-sample Likert survey (5 questions × 3 samples) with per-sample timing
  - Completion screen with session ID and thank-you message
  - Researcher dashboard with group filtering, per-sample detail views, and 18-column CSV export
  - Full interaction data logging — prompts, AI responses, revision snapshots, survey responses, timestamps
  - Session persistence for browser crash recovery
key_decisions:
  - D001: Next.js App Router with TypeScript — full-stack framework
  - D002: SQLite local file database — no server setup needed
  - D003: Ollama with Llama 3 8B — free, local, no API key dependency
  - D004: Advisory AI behavior by default — core experimental design constraint
  - D005: Random balanced group assignment — eliminates self-selection bias
  - D009: Drizzle ORM with better-sqlite3 — type-safe, schema-as-code
  - D013: Full-text revision snapshots, not character-level diffs
  - D017: Centralized query layer — all DB ops through queries.ts
  - D018: Save AI response before controller.close() in streaming routes
  - D020: Manual CSV field escaping — no external library for fixed 18-column schema
patterns_established:
  - Database singleton at src/lib/db/index.ts with WAL mode
  - Drizzle ORM schema-as-code with drizzle-kit push (no migration files)
  - Centralized query layer — routes never import schema directly
  - Streaming AI pipeline — chatWithOllama() AsyncGenerator → ReadableStream → getReader()+TextDecoder client display
  - Advisory system prompt injected with writing sample context per request
  - Study page state machine — loading → instructions → editing → survey → completed → error
  - Server as source of truth — client re-fetches session data after every mutation
  - Component reset on data change via React key={sampleId}
  - Idempotent seeding — seedWritingSamples() safe to call multiple times
  - Structured API responses with appropriate HTTP status codes (200/201/400/404/500/503)
  - Verification scripts per slice (verify-s02.sh through verify-s05.sh) using node+better-sqlite3 for DB queries
observability_surfaces:
  - "curl http://localhost:11434/api/tags — Ollama health and model availability"
  - "GET /api/session/{sessionId} — complete session state including current sample, revisions, messages, survey/timing flags"
  - "GET /api/researcher/sessions — session overview with computed stats (samplesCompleted, totalPrompts, totalTimeSeconds)"
  - "GET /api/researcher/export — full denormalized CSV data dump (18 columns)"
  - "npm run build exit code — TypeScript + bundler health"
  - "scripts/verify-s02.sh through verify-s05.sh — automated slice-level regression tests"
  - "node -e DB query against sqlite.db — raw table inspection"
requirement_outcomes:
  - id: R001
    from_status: active
    to_status: validated
    proof: S02 — POST /api/register creates participant+session; RegistrationForm UI; verify-s02.sh check 1
  - id: R002
    from_status: active
    to_status: validated
    proof: S02 — balanced min-count assignment with random tie-breaking; 3 registrations produce 3 groups; verify-s02.sh
  - id: R003
    from_status: active
    to_status: validated
    proof: S02 — 3 seeded samples, Fisher-Yates shuffle, sequential progression; verify-s02.sh confirms advancement
  - id: R004
    from_status: active
    to_status: validated
    proof: S02 — WritingEditor with textarea, save, revision history sidebar; S04 — per-sample timing completes data logging
  - id: R005
    from_status: active
    to_status: validated
    proof: S01 — ADVISORY_SYSTEM_PROMPT validated with 3 prompt types; S03 — ChatPanel streams via Ollama with system prompt; verify-s03.sh
  - id: R006
    from_status: active
    to_status: validated
    proof: S03 — input disabled after promptCount >= 1 for single-shot group; amber notice; persists on reload via initialMessages count
  - id: R007
    from_status: active
    to_status: validated
    proof: S03 — no prompt limit for iterative group; multi-turn context carried across prompts; verify-s03.sh
  - id: R008
    from_status: active
    to_status: validated
    proof: S03 — ScaffoldPanel with 6 tips renders above ChatPanel for scaffold group; collapsible; unlimited prompting
  - id: R009
    from_status: active
    to_status: validated
    proof: S04 — SurveyForm with 5 Likert questions (1-5 scale); POST /survey validates; 15 rows across 3 samples; verify-s04.sh
  - id: R010
    from_status: active
    to_status: validated
    proof: S02 revisions + S03 prompts/responses + S04 surveys/timing; verify-s04.sh confirms 15 survey rows + 3 timing records
  - id: R011
    from_status: active
    to_status: validated
    proof: S05 — /researcher page with group filter; /researcher/[sessionId] detail; verify-s05.sh checks 1-6
  - id: R012
    from_status: active
    to_status: validated
    proof: S05 — GET /api/researcher/export returns text/csv with 18 columns; verify-s05.sh checks 7-11
  - id: R013
    from_status: active
    to_status: validated
    proof: S04 — CompletionScreen with thank-you message, session ID, home link; verify-s04.sh flow completion
  - id: R014
    from_status: active
    to_status: validated
    proof: S02 — Fisher-Yates shuffle produces different sampleOrder per participant; JSON stored in sessions table
  - id: R015
    from_status: active
    to_status: validated
    proof: S02 — InstructionsScreen with group-specific content; scaffold group omits prompt engineering tips
  - id: R016
    from_status: active
    to_status: validated
    proof: S02 — same email returns same sessionId (HTTP 200); study page resumes at correct phase; verify-s02.sh check 2
duration: ~3h
verification_result: passed
completed_at: 2026-03-17
---

# M001: Prompt Engineering Study App

**Research-ready web application for a controlled study on prompt engineering skill and AI-assisted writing revision — complete participant flow, three-mode enforcement, full interaction data logging, and researcher dashboard with CSV export**

## What Happened

Built a complete research instrument in 5 slices across ~3 hours, progressing from empty repository to a feature-complete study application.

**Foundation (S01)** established the technical stack: Next.js 16 App Router with TypeScript and Tailwind CSS, SQLite via Drizzle ORM with WAL mode, and a streaming AI pipeline through Ollama/Llama 3 8B. The critical proof-of-concept was the advisory system prompt — validated with three diverse prompt types to confirm the AI gives guidance by default and only provides corrected text when explicitly asked. This behavior is the core of the experimental design.

**Participant flow (S02)** built registration with balanced group assignment (min-count algorithm with random tie-breaking), session persistence via email lookup, group-specific pre-study instructions, and a writing editor with explicit save and revision history sidebar. Three writing samples (~500 words each, Grammarly scores 54/64/75) are seeded and presented in Fisher-Yates shuffled order per participant. A centralized query layer pattern was established — all database operations go through `queries.ts`, never directly from routes.

**AI integration (S03)** added the streaming chat panel alongside the editor in a side-by-side layout. Mode enforcement is the key differentiator: single-shot disables the input after one prompt (with an amber notice), iterative allows unlimited multi-turn conversation, and scaffold adds a collapsible panel with 6 prompt engineering tips above the chat. Every prompt and AI response is persisted server-side with auto-incrementing prompt numbers. Chat history resets on sample advance via React key remounting, and resumes correctly on page reload.

**Data completion (S04)** closed the study loop by inserting a 5-question Likert survey between each sample submission and the next sample. Per-sample timing (started_at on editing load, completed_at on submit) captures time investment. The study page state machine gained a survey phase, and the WritingEditor was refactored to delegate submission to the parent rather than calling the advance endpoint directly. A completion screen with session ID and thank-you message appears after all 3 samples.

**Researcher access (S05)** provided the data pipeline endpoint: a dashboard listing all sessions with group filter badges (amber/sky/violet), per-session detail pages with collapsible sections for prompts, revisions, survey ratings, and timing, plus an 18-column CSV export with proper field escaping and Content-Disposition headers.

The slices connected cleanly through well-defined boundaries: S01's `chatWithOllama()` and `ADVISORY_SYSTEM_PROMPT` flowed into S03's chat panel; S02's session schema and query layer were extended by S03 (prompts/responses) and S04 (surveys/timing); S04's complete data set fed directly into S05's aggregate queries and CSV export.

## Cross-Slice Verification

Each success criterion from the roadmap was verified:

**1. Full study flow end-to-end (register → assign → revise 3 with AI → surveys → completion)**
- `scripts/verify-s04.sh` runs a complete 3-sample flow: register → begin → (timing start + revision save + timing complete + survey submission + advance) ×3 → completed status. 13/13 checks pass.
- `scripts/verify-s05.sh` seeds 3 participants through the same full flow and confirms all data appears in researcher APIs. 12/12 checks pass.
- Browser walkthroughs in S02, S03, and S04 task summaries confirm the UI flow works end-to-end.

**2. All three modes enforce constraints correctly**
- Single-shot: S03 browser walkthrough confirmed input disables after one prompt with amber "You've used your one prompt" notice. Enforcement persists on page reload (promptCount initialized from initialMessages).
- Iterative: Multiple prompts accepted with multi-turn conversation context (prior prompts/responses included in chatWithOllama call). Verified by code review and verify-s03.sh prompt numbering.
- Scaffold: ScaffoldPanel with 6 tips renders above ChatPanel for scaffold group only; collapsible with aria-expanded. Same unlimited prompting as iterative. Verified by browser walkthrough.

**3. AI gives advisory suggestions by default**
- S01/T03 tested with 3 diverse prompts against real Llama 3 8B: (1) general grammar help → advisory guidance only, (2) structural question → strategies without rewriting, (3) explicit rewrite request → corrected text provided. System prompt worked correctly on first attempt.
- S03's prompt route injects ADVISORY_SYSTEM_PROMPT with writing sample context on every request.

**4. Every research-relevant interaction is logged**
- Prompts and AI responses: `prompts` and `ai_responses` tables with timestamps and auto-incrementing promptNumber (S03)
- Revision snapshots: `revisions` table with full text and timestamps (S02)
- Survey responses: `survey_responses` table — 5 rows per sample per session (S04)
- Per-sample timing: `sample_timings` table with started_at and completed_at (S04)
- verify-s04.sh confirms: 15 survey rows (5 × 3 samples) + 3 timing records + completed status

**5. Researchers can browse data and export to CSV**
- `/researcher` page: session list table with group filter buttons (All/Single-Shot/Iterative/Scaffold)
- `/researcher/[sessionId]`: per-sample cards with collapsible prompts, revisions, survey ratings, timing
- `/api/researcher/export`: 18-column CSV with Content-Type text/csv and Content-Disposition attachment
- verify-s05.sh confirms: API returns correct structures, filtering works, CSV has all 18 headers, ≥9 data rows, survey ratings present

**6. Runs reliably on localhost**
- `npm run build` passes across all 5 slices (checked in every verification script)
- Dev server starts consistently on localhost:3000
- S05 verification seeds 3 participants through full flows without crashes
- Ollama connection failure handled gracefully (503 with descriptive error, no crash)

## Requirement Changes

- R001: active → validated — POST /api/register + RegistrationForm + verify-s02.sh
- R002: active → validated — Balanced min-count assignment; 3 registrations → 3 groups; verify-s02.sh
- R003: active → validated — 3 seeded samples, Fisher-Yates shuffle, sequential progression; verify-s02.sh
- R004: active → validated — WritingEditor + revision history (S02); per-sample timing (S04); full flow verified
- R005: active → validated — ADVISORY_SYSTEM_PROMPT tested with real Llama 3 8B (S01); ChatPanel streams via prompt route (S03)
- R006: active → validated — Single-shot enforcement: input disabled after 1 prompt, persists on reload (S03)
- R007: active → validated — Iterative: unlimited prompts, multi-turn context carried (S03)
- R008: active → validated — Scaffold: 6-tip instruction panel + unlimited prompting (S03)
- R009: active → validated — SurveyForm with 5 Likert questions; 15 rows across full flow (S04)
- R010: active → validated — Revisions (S02) + prompts/responses (S03) + surveys/timing (S04); all data captured
- R011: active → validated — /researcher dashboard with group filter + detail views (S05); verify-s05.sh
- R012: active → validated — 18-column CSV export with proper headers (S05); verify-s05.sh
- R013: active → validated — CompletionScreen with session ID and thank-you (S04)
- R014: active → validated — Fisher-Yates shuffle produces different orders per participant (S02)
- R015: active → validated — Group-specific InstructionsScreen; scaffold group omits prompt tips (S02)
- R016: active → validated — Same email returns same sessionId; correct phase resume (S02)
- R017: remains deferred — Grammarly API requires Enterprise plan; manual scoring planned

## Forward Intelligence

### What the next milestone should know
- The application is feature-complete for R001-R016. The only deferred capability is R017 (automated Grammarly scoring) — researchers will paste revisions into Grammarly manually post-study.
- The entire data pipeline is: participant action → SQLite (8 tables) → aggregate queries in `src/lib/db/queries.ts` → API routes → JSON or CSV. All researcher data access goes through the centralized query layer.
- Ollama must be started manually with `~/.local/bin/ollama serve` before each study session. There is no health-check middleware or startup script — the facilitator must verify Ollama availability before participants begin.
- The study is designed for supervised in-person sessions on localhost:3000. No authentication protects any routes (including researcher dashboard). This is by design for localhost deployment.
- Writing samples are pre-seeded via `seedWritingSamples()` during the first registration call. The 3 samples have deliberate grammar errors with Grammarly scores of 54, 64, and 75.

### What's fragile
- **Ollama availability** — if `ollama serve` isn't running, every AI chat request returns 503. No retry logic, no health-check middleware. The study facilitator must ensure Ollama is running before participants start.
- **CPU inference speed** — Llama 3 8B on CPU produces ~10 tokens/sec (30-60s full response). Streaming masks this partially, but rapid sequential requests from multiple participants could compound latency since Ollama queues them.
- **SQLite relative path** — `new Database('sqlite.db')` resolves relative to CWD. The dev server must always start from the project root.
- **ReadableStream save ordering** — the `saveAiResponse()` call in the prompt route's streaming finally block MUST stay before `controller.close()`. Refactoring this code path without understanding D018 will silently lose AI response data.
- **CSV escaping** — manual string manipulation for CSV fields. Current content (writing samples, survey ratings, timestamps) is safe, but complex nested quotes or multi-line content beyond simple text could surface edge cases.
- **Study page state machine** — 6 phases (loading, instructions, editing, survey, completed, error) driven by `fetchSession()` re-reads. Changes to the GET /session response shape would break phase transition logic.

### Authoritative diagnostics
- `bash scripts/verify-s05.sh` — the most comprehensive check; seeds 3 participants through full flows and validates all researcher endpoints + CSV export. Exit 0 = everything works.
- `bash scripts/verify-s04.sh` — exercises the complete participant flow (register through completion with surveys and timing). 13 checks.
- `curl http://localhost:11434/api/tags` — confirms Ollama is running and llama3 model is available. If this fails, AI chat won't work.
- `npm run build` — proves TypeScript compiles and all imports resolve. Run after any code changes.
- `GET /api/session/{sessionId}` — returns complete session state; the single source of truth for debugging any session issue.

### What assumptions changed
- **Next.js version**: Plan said "14+", got 16.1.7. No compatibility issues — Turbopack default, serverExternalPackages works, App Router API unchanged.
- **Ollama install format**: Documented as `.tgz`, actual releases use `.tar.zst` (zstd compression). The `.tgz` URL returns 404.
- **Advisory prompt strength**: Expected to need multiple iterations on the system prompt — it worked correctly on the first test across all prompt types.
- **Llama 3 8B latency**: Expected "manageable" — actual cold-load is >60s, ongoing inference is ~10 tok/sec on CPU. Streaming makes it tolerable but study participants will notice wait times.
- **sqlite3 CLI availability**: Assumed available for verification scripts — not installed. All DB verification uses `node -e` with better-sqlite3 instead.

## Files Created/Modified

### Project scaffold and config
- `package.json` — Next.js 16 project manifest with all dependencies
- `next.config.ts` — serverExternalPackages: ['better-sqlite3']
- `drizzle.config.ts` — Drizzle Kit config for SQLite
- `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs` — generated configs

### Database layer
- `src/lib/db/index.ts` — Database singleton with WAL mode
- `src/lib/db/schema.ts` — 8 tables: participants, sessions, writingSamples, revisions, prompts, aiResponses, surveyResponses, sampleTimings
- `src/lib/db/queries.ts` — Centralized query layer with ~20 functions covering all CRUD and aggregate operations

### AI integration
- `src/lib/ollama.ts` — chatWithOllama() streaming AsyncGenerator
- `src/lib/prompts.ts` — ADVISORY_SYSTEM_PROMPT constant
- `src/app/api/chat/route.ts` — Standalone streaming chat endpoint (S01 proof)

### Study flow
- `src/lib/samples.ts` — 3 writing samples with idempotent seeding
- `src/lib/survey.ts` — SURVEY_QUESTIONS constant (5 Likert questions)
- `src/app/page.tsx` — Root redirect to /register
- `src/app/register/page.tsx` — Registration page
- `src/app/study/[sessionId]/page.tsx` — Study flow page with 6-phase state machine
- `src/app/test-chat/page.tsx` — S01 proof page for streaming AI display

### Components
- `src/components/RegistrationForm.tsx` — Name/email form with loading/error states
- `src/components/InstructionsScreen.tsx` — Group-specific pre-study instructions
- `src/components/WritingEditor.tsx` — Textarea editor with revision save/view and history sidebar
- `src/components/ChatPanel.tsx` — Streaming AI chat with mode enforcement and session resume
- `src/components/ScaffoldPanel.tsx` — 6 collapsible prompt engineering tips
- `src/components/SurveyForm.tsx` — 5 Likert questions with 1-5 clickable scale
- `src/components/CompletionScreen.tsx` — Thank-you screen with session ID

### API routes
- `src/app/api/register/route.ts` — Registration with balanced group assignment
- `src/app/api/session/[sessionId]/route.ts` — GET session state + POST begin action
- `src/app/api/session/[sessionId]/revision/route.ts` — Save revision snapshots
- `src/app/api/session/[sessionId]/advance/route.ts` — Sample progression
- `src/app/api/session/[sessionId]/prompt/route.ts` — Streaming AI prompt with DB persistence
- `src/app/api/session/[sessionId]/survey/route.ts` — Save Likert survey responses
- `src/app/api/session/[sessionId]/timing/route.ts` — Per-sample timing start/complete
- `src/app/api/researcher/sessions/route.ts` — Session list with group filter
- `src/app/api/researcher/sessions/[sessionId]/route.ts` — Session detail
- `src/app/api/researcher/export/route.ts` — 18-column CSV export

### Researcher dashboard
- `src/app/researcher/layout.tsx` — Dashboard layout with nav and CSV export button
- `src/app/researcher/page.tsx` — Session list with group filter badges
- `src/app/researcher/[sessionId]/page.tsx` — Session detail with collapsible per-sample cards

### Verification
- `scripts/verify-s02.sh` — 12 automated checks for registration and editing flow
- `scripts/verify-s03.sh` — 7 automated checks for AI chat and mode enforcement
- `scripts/verify-s04.sh` — 13 automated checks for surveys, timing, and full flow
- `scripts/verify-s05.sh` — 12 automated checks for researcher dashboard and CSV export
