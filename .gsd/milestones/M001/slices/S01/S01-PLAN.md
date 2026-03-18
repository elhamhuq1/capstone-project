# S01: Project Foundation + Ollama AI Proof

**Goal:** A working Next.js App Router project with TypeScript, Tailwind CSS, SQLite via Drizzle ORM, and a streaming `/api/chat` endpoint that returns advisory suggestions from Llama 3 8B via Ollama.
**Demo:** POST to `/api/chat` with a writing improvement request → receive a streaming advisory response from real Llama 3 8B that gives guidance without volunteering corrected text. Browser proof at `/test-chat` shows streaming text appearing word-by-word.

## Must-Haves

- Next.js 14+ App Router project with TypeScript, Tailwind CSS, `src/` directory structure
- SQLite database via Drizzle ORM + `better-sqlite3` with initial schema and working migrations
- `next.config.ts` includes `serverExternalPackages: ['better-sqlite3']` (prevents webpack crash)
- `src/lib/ollama.ts` exports `chatWithOllama(messages, systemPrompt)` returning an AsyncGenerator
- `src/lib/prompts.ts` exports `ADVISORY_SYSTEM_PROMPT` that enforces advisory-by-default behavior (R005)
- `src/app/api/chat/route.ts` POST handler that streams Ollama responses as `ReadableStream`
- API route handles Ollama unavailability gracefully (clear error, no crash)
- Proof page at `/test-chat` demonstrates real streaming advisory responses in the browser

## Proof Level

- This slice proves: integration
- Real runtime required: yes (Ollama with Llama 3 8B must be running)
- Human/UAT required: no

## Verification

- `npm run build` completes without errors
- `npm run dev` starts the dev server and `http://localhost:3000` renders without errors
- `curl http://localhost:11434/api/tags` confirms Ollama is running with `llama3` model available
- `curl -X POST http://localhost:3000/api/chat -H 'Content-Type: application/json' -d '{"messages":[{"role":"user","content":"Help me improve this sentence: The dog was very big and it was running fast."}]}'` returns a streaming text response with advisory guidance (not a corrected sentence)
- `/test-chat` page loads, accepts a prompt, and displays streaming advisory response from Llama 3 8B
- When Ollama is not running, `/api/chat` returns a clear JSON error (not a 500 crash)

## Observability / Diagnostics

- Runtime signals: console logs on Ollama connection errors; streaming response headers confirm `text/plain; charset=utf-8`
- Inspection surfaces: `curl http://localhost:11434/api/tags` for Ollama status; `/test-chat` for interactive proof; `sqlite.db` file at project root for database state
- Failure visibility: API route returns JSON `{ error: "..." }` with descriptive message when Ollama is unreachable
- Redaction constraints: none (no secrets or PII in this slice)

## Integration Closure

- Upstream surfaces consumed: none (first slice)
- New wiring introduced in this slice: Next.js project scaffold, Drizzle DB init, Ollama chat helper, streaming API route
- What remains before the milestone is truly usable end-to-end: S02 (registration + editor), S03 (chat panel + mode enforcement), S04 (data logging + surveys), S05 (researcher dashboard)

## Tasks

- [x] **T01: Scaffold Next.js project with dependencies and Drizzle database layer** `est:30m`
  - Why: Creates the project foundation that all downstream slices (S02–S05) depend on. No code can be written until the scaffold exists, and the database layer is needed by every slice.
  - Files: `package.json`, `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `drizzle.config.ts`, `src/lib/db/index.ts`, `src/lib/db/schema.ts`, `src/app/page.tsx`, `.gitignore`
  - Do: Run `npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"` with defaults. Install additional deps: `ollama`, `better-sqlite3`, `@types/better-sqlite3`, `drizzle-orm`, `drizzle-kit`. Add `serverExternalPackages: ['better-sqlite3']` to `next.config.ts`. Create Drizzle config, DB init module, and minimal `participants` table schema. Run `npx drizzle-kit push` to create SQLite database. Add `*.db` to `.gitignore`.
  - Verify: `npm run build` succeeds; `npm run dev` starts and `http://localhost:3000` renders the landing page; `sqlite.db` exists with `participants` table.
  - Done when: Next.js dev server runs without errors, database file exists with schema applied, and `better-sqlite3` doesn't crash webpack.

- [x] **T02: Install Ollama, build chat helper with advisory system prompt, and create streaming API route** `est:45m`
  - Why: This is the core integration — wiring Ollama/Llama 3 8B into a streaming Next.js API endpoint with the advisory system prompt that enforces R005 (guidance by default, corrections only when explicitly asked). This is the highest-risk work in the slice.
  - Files: `src/lib/ollama.ts`, `src/lib/prompts.ts`, `src/app/api/chat/route.ts`
  - Do: Install Ollama via `curl -fsSL https://ollama.com/install.sh | sh`, start Ollama service, pull `llama3` model. Create `src/lib/ollama.ts` wrapping the `ollama` npm package with `chatWithOllama(messages, systemPrompt)` returning AsyncGenerator. Create `src/lib/prompts.ts` with `ADVISORY_SYSTEM_PROMPT` — must instruct the model to identify issues, explain why, suggest strategies, but NOT provide corrected text unless explicitly asked. Create `src/app/api/chat/route.ts` POST handler that accepts `{ messages, writingSample? }`, prepends system prompt, streams response via `ReadableStream`, and handles Ollama-down errors gracefully. Verify with curl.
  - Verify: `curl http://localhost:11434/api/tags` shows `llama3`; `curl -X POST http://localhost:3000/api/chat -H 'Content-Type: application/json' -d '{"messages":[{"role":"user","content":"Help me improve this sentence: The dog was very big and it was running fast."}]}'` returns streaming advisory text (guidance, not corrections).
  - Done when: API endpoint returns streaming advisory responses from real Llama 3 8B; stopping Ollama causes the endpoint to return a clear JSON error instead of crashing.

- [x] **T03: Build test-chat proof page and validate advisory behavior end-to-end** `est:30m`
  - Why: The slice's definition of done is a browser-visible proof that the full chain works: user types prompt → API route → Ollama → streaming advisory response displayed word-by-word. This task also validates the system prompt produces correct advisory behavior across diverse inputs.
  - Files: `src/app/test-chat/page.tsx`
  - Do: Create a client component at `/test-chat` with a textarea for user input, a submit button, and a response display area that shows streaming text. Use `fetch` with streaming response handling (`reader.read()` loop). Include a text area to optionally paste a writing sample for context. Test with at least 3 diverse prompts: (1) simple grammar help, (2) structural/organization question, (3) explicit rewrite request — verifying the AI gives guidance for #1 and #2 but provides corrected text for #3. If the system prompt is too weak (model volunteers corrections), iterate on `ADVISORY_SYSTEM_PROMPT` in `src/lib/prompts.ts`.
  - Verify: Navigate to `http://localhost:3000/test-chat`, submit a prompt, see streaming advisory text appear word-by-word. Confirm advisory behavior: model explains issues and suggests strategies for general help requests, but provides corrections when explicitly asked.
  - Done when: `/test-chat` page renders, accepts input, displays streaming Llama 3 8B responses, and the advisory system prompt demonstrably controls the AI's behavior (guidance by default, corrections only on explicit request).

## Files Likely Touched

- `package.json`
- `next.config.ts`
- `tsconfig.json`
- `tailwind.config.ts`
- `drizzle.config.ts`
- `.gitignore`
- `src/lib/db/index.ts`
- `src/lib/db/schema.ts`
- `src/lib/ollama.ts`
- `src/lib/prompts.ts`
- `src/app/page.tsx`
- `src/app/api/chat/route.ts`
- `src/app/test-chat/page.tsx`
