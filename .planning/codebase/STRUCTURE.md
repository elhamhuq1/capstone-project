# Codebase Structure

**Analysis Date:** 2026-04-02

## Directory Layout

```
capstone/
├── src/
│   ├── app/                        # Next.js App Router — pages and API routes
│   │   ├── layout.tsx              # Root layout (fonts, WritingAssistantBlocker)
│   │   ├── page.tsx                # Root route — redirects to /register
│   │   ├── globals.css             # Global CSS reset and keyframe animations
│   │   ├── favicon.ico
│   │   ├── register/
│   │   │   └── page.tsx            # Participant registration page
│   │   ├── study/
│   │   │   └── [sessionId]/
│   │   │       └── page.tsx        # Main study interface (editor + chat)
│   │   ├── researcher/
│   │   │   ├── layout.tsx          # Researcher dashboard shell (top bar)
│   │   │   ├── page.tsx            # Session list + stats
│   │   │   └── [sessionId]/
│   │   │       └── page.tsx        # Per-session detail view
│   │   ├── test-chat/
│   │   │   └── page.tsx            # Dev-only Ollama/Gemini smoke test page
│   │   └── api/
│   │       ├── register/
│   │       │   └── route.ts        # POST — create participant + session
│   │       ├── chat/
│   │       │   └── route.ts        # POST — dev chat endpoint (no DB persistence)
│   │       ├── session/
│   │       │   └── [sessionId]/
│   │       │       ├── route.ts    # GET session state | POST action:begin
│   │       │       ├── advance/
│   │       │       │   └── route.ts  # POST — increment sample index
│   │       │       ├── prompt/
│   │       │       │   └── route.ts  # POST — save prompt + stream AI response
│   │       │       ├── revision/
│   │       │       │   └── route.ts  # POST — save revision snapshot
│   │       │       ├── submit/
│   │       │       │   └── route.ts  # POST — save final submission with diff
│   │       │       ├── survey/
│   │       │       │   └── route.ts  # POST — save 5 survey ratings
│   │       │       └── timing/
│   │       │           └── route.ts  # POST — start/complete sample timer
│   │       └── researcher/
│   │           ├── sessions/
│   │           │   ├── route.ts    # GET — list all sessions (optional group filter)
│   │           │   └── [sessionId]/
│   │           │       └── route.ts  # GET detail | DELETE cascade
│   │           └── export/
│   │               └── route.ts    # GET — download CSV of all study data
│   ├── components/
│   │   ├── ChatPanel.tsx           # Streaming AI chat UI (dark panel)
│   │   ├── CompletionScreen.tsx    # Study complete screen
│   │   ├── InstructionsScreen.tsx  # Pre-study instructions screen
│   │   ├── RegistrationForm.tsx    # Name + email form
│   │   ├── ScaffoldPanel.tsx       # Prompt engineering tips (scaffold group only)
│   │   ├── SurveyForm.tsx          # Post-sample 5-question Likert survey
│   │   ├── WritingAssistantBlocker.tsx  # Detects/suppresses Grammarly + Gemini
│   │   └── WritingEditor.tsx       # Textarea + revision history bar
│   └── lib/
│       ├── db/
│       │   ├── index.ts            # Drizzle + pg.Pool singleton (exports `db`)
│       │   ├── schema.ts           # All table definitions
│       │   └── queries.ts          # All SQL — the only file that touches `db`
│       ├── gemini.ts               # Gemini 2.5 Flash streaming implementation
│       ├── ollama.ts               # Re-export shim (chatWithGemini as chatWithOllama)
│       ├── prompts.ts              # ADVISORY_SYSTEM_PROMPT constant
│       ├── samples.ts              # WRITING_SAMPLES + seedWritingSamples()
│       └── survey.ts               # SURVEY_QUESTIONS constant + SurveyQuestionId type
├── public/                         # Static assets (empty except Next.js defaults)
├── scripts/                        # Ad-hoc migration/seed scripts (shell or TS)
├── drizzle.config.ts               # Drizzle Kit config (schema path, dialect)
├── next.config.ts                  # Next.js config (empty — no custom settings)
├── package.json
├── tsconfig.json
└── .env.local                      # DATABASE_URL, GEMINI_API_KEY (not committed)
```

## Directory Purposes

**`src/app/`:**
- Purpose: All Next.js App Router routes — both pages and API handlers
- Contains: Page components (`.tsx`), API route handlers (`route.ts`), layouts
- Key files: `src/app/layout.tsx` (root layout), `src/app/study/[sessionId]/page.tsx` (main study UI)

**`src/app/api/`:**
- Purpose: Server-side HTTP handlers — the backend layer
- Contains: One `route.ts` per endpoint; each file exports named HTTP method functions (`GET`, `POST`, `DELETE`)
- Key files: `src/app/api/register/route.ts`, `src/app/api/session/[sessionId]/prompt/route.ts`

**`src/components/`:**
- Purpose: Reusable React client components
- Contains: All `'use client'` components; no server components here
- Key files: `src/components/WritingEditor.tsx`, `src/components/ChatPanel.tsx`

**`src/lib/`:**
- Purpose: Shared business logic, DB access, and AI provider code
- Contains: Database client and queries, AI provider wrappers, study constants
- Key files: `src/lib/db/queries.ts`, `src/lib/gemini.ts`

**`src/lib/db/`:**
- Purpose: Everything Drizzle — schema, connection, queries
- Contains: Three files that form the complete data access layer
- Key files: `src/lib/db/schema.ts` (table definitions), `src/lib/db/queries.ts` (all SQL)

**`scripts/`:**
- Purpose: One-off migration or utility scripts run outside Next.js
- Contains: Shell or TypeScript scripts for database operations
- Key files: check `scripts/` for any seeding or migration helpers

**`public/`:**
- Purpose: Static files served at the root URL
- Contains: Default Next.js placeholder files; no app-specific assets currently

## Key File Locations

**Entry Points:**
- `src/app/page.tsx`: Root `/` — immediately redirects to `/register`
- `src/app/layout.tsx`: Root layout wrapping all pages
- `src/app/register/page.tsx`: First participant-facing page
- `src/app/study/[sessionId]/page.tsx`: Core study experience

**Configuration:**
- `drizzle.config.ts`: Points Drizzle Kit at `src/lib/db/schema.ts`
- `next.config.ts`: Empty — no custom Next.js settings
- `tsconfig.json`: TypeScript config; includes `@/*` path alias for `src/*`
- `.env.local`: `DATABASE_URL` (Supabase Postgres), `GEMINI_API_KEY`

**Core Logic:**
- `src/lib/db/queries.ts`: All database operations — add new queries here
- `src/lib/db/schema.ts`: All table definitions — extend schema here
- `src/lib/gemini.ts`: AI streaming logic — swap provider here
- `src/lib/prompts.ts`: System prompt — modify AI behavior here
- `src/lib/samples.ts`: Essay content + seeder — add/change writing samples here
- `src/lib/survey.ts`: Survey question definitions — change questions here

**Testing:**
- No test files found in the repository — test infrastructure is not set up

## Naming Conventions

**Files:**
- React components: PascalCase — `WritingEditor.tsx`, `ChatPanel.tsx`
- Next.js route handlers: always `route.ts` (required by framework)
- Next.js pages: always `page.tsx` (required by framework)
- Library modules: camelCase — `gemini.ts`, `ollama.ts`, `queries.ts`, `samples.ts`

**Directories:**
- App Router segments: lowercase with hyphens for multi-word — `test-chat/`, `[sessionId]/`
- Component and lib directories: lowercase singular — `components/`, `lib/`, `db/`

**Exports:**
- Components: default export only
- Library functions: named exports only (no default exports in `lib/`)
- Schema tables: named exports (one per table)

**Variables and Functions:**
- Functions: camelCase — `createSession`, `saveRevision`, `handleSend`
- Constants: SCREAMING_SNAKE_CASE — `ADVISORY_SYSTEM_PROMPT`, `SURVEY_QUESTIONS`, `WRITING_SAMPLES`
- Types/interfaces: PascalCase — `SessionData`, `Phase`, `ChatMessage`

## Where to Add New Code

**New API endpoint:**
- Create `src/app/api/[path]/route.ts`
- Export named functions `GET`, `POST`, `DELETE` as needed
- Call query functions from `src/lib/db/queries.ts` — do not use `db` directly in routes unless doing complex multi-table operations (see researcher DELETE for the exception pattern)

**New database table:**
- Add `pgTable(...)` definition to `src/lib/db/schema.ts`
- Add query functions to `src/lib/db/queries.ts`
- Run `drizzle-kit generate` then `drizzle-kit migrate` (or push)

**New query:**
- Add named async function to `src/lib/db/queries.ts`
- Import from routes: `import { myNewQuery } from '@/lib/db/queries'`

**New participant-facing component:**
- Create `src/components/MyComponent.tsx` with `'use client'` at the top
- Import and use in `src/app/study/[sessionId]/page.tsx` or whichever page needs it

**New researcher dashboard feature:**
- Add query to `src/lib/db/queries.ts`
- Add API endpoint under `src/app/api/researcher/`
- Add UI to `src/app/researcher/page.tsx` or a new page under `src/app/researcher/`

**New writing sample:**
- Add to `WRITING_SAMPLES` array in `src/lib/samples.ts` with a unique integer `id`
- `seedWritingSamples()` will upsert on next registration

**New survey question:**
- Add to `SURVEY_QUESTIONS` array in `src/lib/survey.ts`
- Update validation in `src/app/api/session/[sessionId]/survey/route.ts` (currently hard-coded to exactly 5 responses)
- Add corresponding column to `getExportData()` in `src/lib/db/queries.ts`

## Special Directories

**`.next/`:**
- Purpose: Next.js build output and cache
- Generated: Yes
- Committed: No (in `.gitignore`)

**`.planning/`:**
- Purpose: GSD planning documents (architecture, stack, concerns, etc.)
- Generated: Yes (by Claude agents)
- Committed: Yes

**`.gsd/`:**
- Purpose: GSD workflow state (milestones, slices, tasks)
- Generated: Yes
- Committed: Yes

**`node_modules/`:**
- Purpose: Installed npm dependencies
- Generated: Yes
- Committed: No

**`scripts/`:**
- Purpose: Migration/utility scripts run outside Next.js
- Generated: No
- Committed: Yes

---

*Structure analysis: 2026-04-02*
