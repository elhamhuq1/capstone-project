# S01: Project Foundation + Ollama AI Proof — UAT

**Milestone:** M001
**Written:** 2026-03-17

## UAT Type

- UAT mode: live-runtime
- Why this mode is sufficient: S01's deliverables are a running dev server, a streaming API endpoint, and real Ollama/Llama 3 8B responses — all require live runtime verification, not just artifact inspection.

## Preconditions

1. Ollama is running: `~/.local/bin/ollama serve` (or system-installed `ollama serve`)
2. Llama 3 model is pulled: `curl http://localhost:11434/api/tags` shows `llama3` in models
3. Dependencies installed: `npm install` completed in project root
4. Dev server running: `npm run dev` started from project root, listening on port 3000
5. SQLite database exists: `sqlite.db` file present in project root

## Smoke Test

Navigate to `http://localhost:3000/test-chat`, type "Help me improve this paragraph" in the message box, click Send. You should see streaming text appearing word-by-word with advisory writing guidance.

## Test Cases

### 1. Project builds successfully

1. Run `npm run build` from project root
2. **Expected:** Exit code 0, output shows routes: `/` (static), `/api/chat` (dynamic), `/test-chat` (static). No TypeScript errors, no webpack/Turbopack errors.

### 2. Dev server starts and landing page renders

1. Run `npm run dev`
2. Open `http://localhost:3000` in a browser
3. **Expected:** Default Next.js landing page renders without errors. No console errors in browser DevTools.

### 3. Database schema is applied

1. Run: `node -e "const Database = require('better-sqlite3'); const db = new Database('sqlite.db'); console.log(db.prepare(\"SELECT name FROM sqlite_master WHERE type='table'\").all())"`
2. **Expected:** Output includes `{ name: 'participants' }`. The sqlite.db file should be non-empty.

### 4. Streaming API — advisory response for general help

1. Run: `curl -X POST http://localhost:3000/api/chat -H 'Content-Type: application/json' -d '{"messages":[{"role":"user","content":"Help me improve this sentence: The dog was very big and it was running fast."}]}'`
2. **Expected:** Streaming text response that:
   - Identifies specific issues (vague adjectives like "very big", weak verb phrase "running fast")
   - Explains WHY they're problematic
   - Suggests strategies (use specific adjectives, show-don't-tell)
   - Does NOT provide a corrected/rewritten sentence

### 5. Streaming API — advisory response for structural question

1. Run: `curl -X POST http://localhost:3000/api/chat -H 'Content-Type: application/json' -d '{"messages":[{"role":"user","content":"My paragraph about climate change feels disorganized. The first sentence talks about rising temperatures, then I mention polar bears, then go back to CO2 emissions. How can I fix the flow?"}]}'`
2. **Expected:** Response gives organizational strategies (topic sentences, logical ordering, transitions) without rewriting the paragraph.

### 6. Streaming API — correction on explicit rewrite request

1. Run: `curl -X POST http://localhost:3000/api/chat -H 'Content-Type: application/json' -d '{"messages":[{"role":"user","content":"Please rewrite this sentence to be more descriptive: The dog was very big and it was running fast."}]}'`
2. **Expected:** Response includes actual rewritten/corrected sentence(s) because the user explicitly asked for a rewrite.

### 7. Streaming API with writing sample context

1. Run: `curl -X POST http://localhost:3000/api/chat -H 'Content-Type: application/json' -d '{"messages":[{"role":"user","content":"What are the main issues with my writing?"}],"writingSample":"The weather was bad. It rained alot. Everyone was sad because of the weather being bad. The rain made everything wet and also it was cold too."}'`
2. **Expected:** Response references the specific writing sample — mentions specific phrases from the sample text, identifies issues like repetition ("bad" used twice, "weather" repeated), and suggests improvements without rewriting.

### 8. Input validation — empty messages

1. Run: `curl -X POST http://localhost:3000/api/chat -H 'Content-Type: application/json' -d '{"messages":[]}'`
2. **Expected:** HTTP 400 with body `{"error":"messages array is required and must not be empty"}`

### 9. Input validation — missing messages field

1. Run: `curl -X POST http://localhost:3000/api/chat -H 'Content-Type: application/json' -d '{}'`
2. **Expected:** HTTP 400 with body `{"error":"messages array is required and must not be empty"}`

### 10. Error handling — Ollama not running

1. Stop Ollama: kill the `ollama serve` process
2. Run: `curl -X POST http://localhost:3000/api/chat -H 'Content-Type: application/json' -d '{"messages":[{"role":"user","content":"test"}]}'`
3. **Expected:** HTTP 503 with body `{"error":"Ollama is not running. Start it with: ollama serve"}` — NOT a 500 crash or unhandled error
4. Restart Ollama after test: `~/.local/bin/ollama serve`

### 11. Test-chat page — streaming display

1. Navigate to `http://localhost:3000/test-chat`
2. Type "How can I make my essay introduction more engaging?" in the message textarea
3. Click Send
4. **Expected:** 
   - Send button shows loading state or is disabled during response
   - Text appears incrementally (word-by-word streaming, not all at once)
   - Response is advisory — suggests strategies for engaging introductions
   - No JavaScript errors in browser console

### 12. Test-chat page — writing sample context

1. Navigate to `http://localhost:3000/test-chat`
2. Paste a short paragraph into the "Writing Sample" textarea: "Technology is important. Many people use technology. It helps with many things."
3. Type "What's wrong with this paragraph?" in the message textarea
4. Click Send
5. **Expected:** Response references the specific writing sample text and identifies issues like repetition, vague language ("many things"), and lack of specifics.

### 13. Test-chat page — error display

1. Stop Ollama
2. Navigate to `http://localhost:3000/test-chat`
3. Type any message and click Send
4. **Expected:** Red error banner appears with descriptive message about Ollama not running. Page does NOT crash or show blank screen.
5. Restart Ollama after test

### 14. Native module config

1. Run: `grep serverExternalPackages next.config.ts`
2. **Expected:** Output contains `'better-sqlite3'` — prevents webpack from attempting to bundle the native module.

## Edge Cases

### Rapid consecutive submissions on test-chat

1. Navigate to `/test-chat`
2. Submit a prompt
3. While the response is still streaming, submit another prompt
4. **Expected:** Previous request is cancelled (AbortController), new request starts. No duplicate responses or jumbled text.

### Very long prompt

1. Submit a message with 2000+ characters to `/api/chat`
2. **Expected:** Response streams normally. No timeout or truncation of the input.

### Empty writing sample field

1. POST to `/api/chat` with `{"messages":[{"role":"user","content":"test"}],"writingSample":""}`
2. **Expected:** Works normally — empty writingSample is treated as no sample (system prompt not appended with empty context).

## Failure Signals

- `npm run build` fails → TypeScript or import errors, likely schema/route mismatch
- `/api/chat` returns 500 instead of 503 when Ollama is down → error detection regex is wrong
- `/api/chat` returns corrected/rewritten text for a general help request → system prompt is too weak
- `/test-chat` shows blank response area after submitting → streaming reader or TextDecoder broken
- `sqlite.db` missing or empty → Drizzle init failed, check `src/lib/db/index.ts`
- Build error mentioning `better-sqlite3` → `serverExternalPackages` config missing

## Requirements Proved By This UAT

- R005 (supporting) — Advisory system prompt demonstrated with real Llama 3 8B: guidance by default, corrections only on explicit request. Tests 4, 5, 6 directly validate this behavior.

## Not Proven By This UAT

- R005 (full) — Chat panel integration with mode enforcement is S03's responsibility
- R001–R004, R006–R016 — Registration, editor, modes, surveys, data logging, dashboard — all downstream slices
- Multi-turn conversation behavior — S01 only tests single request/response; multi-turn is S03
- Performance under load — only tested with single sequential requests

## Notes for Tester

- **Ollama must be running** before any API or test-chat tests. Start with `~/.local/bin/ollama serve` (or `ollama serve` if system-installed).
- **Responses are slow** (30-60 seconds) because Llama 3 8B runs on CPU. Be patient — streaming means text appears incrementally even during long generations.
- **Test cases 4-6 are the core advisory behavior proof** — these validate the experimental design's key constraint (R005). Pay close attention to whether the AI volunteers corrected text without being asked.
- The `/test-chat` page is a developer proof tool, not the final participant UI. Visual polish is not relevant.
- After running test case 10 or 13 (Ollama stopped), remember to restart Ollama before continuing other tests.
