# Decisions Register

<!-- Append-only. Never edit or remove existing rows.
     To reverse a decision, add a new row that supersedes it.
     Read this file at the start of any planning or research phase. -->

| # | When | Scope | Decision | Choice | Rationale | Revisable? |
|---|------|-------|----------|--------|-----------|------------|
| D001 | M001 | arch | Web framework | Next.js (App Router) with TypeScript | Full-stack, API routes for AI endpoints, fast setup, team familiarity | No |
| D002 | M001 | arch | Database | SQLite (local file) | No server setup, perfect for localhost deployment, sufficient for study data volume | No |
| D003 | M001 | arch | AI provider | Ollama with Llama 3 8B | Free, local, no API key dependency, sufficient quality for writing suggestions | Yes — if response quality is inadequate |
| D004 | M001 | pattern | AI default behavior | Advisory — suggestions and guidance, not copy-pastable corrections unless explicitly asked | Core experimental design constraint — measures prompt sophistication | No |
| D005 | M001 | pattern | Group assignment | Random assignment, not participant choice | Eliminates self-selection bias — proper experimental design | No |
| D006 | M001 | pattern | Grammarly scoring | Manual post-study (paste into Grammarly) | Grammarly Writing Score API requires Enterprise plan; manual is sufficient for study size | Yes — if API access obtained |
| D007 | M001 | convention | Styling | Tailwind CSS | Fast iteration, utility-first, minimal config | No |
| D008 | M001 | arch | Deployment | Localhost only | In-person supervised study sessions, no need for cloud infrastructure | No |
| D009 | M001/S01 | arch | ORM layer | Drizzle ORM with better-sqlite3 driver | Type-safe, lightweight, schema-as-code fits simple data model | No |
| D010 | M001/S01 | convention | Schema management | drizzle-kit push (no migration files) | Dev-only localhost app — push-based sync simpler than migration files | Yes — if multi-machine deployment needed |
| D011 | M001/S01 | ops | Ollama installation method | User-local at ~/.local/bin via tar.zst download | sudo unavailable; requires manual `ollama serve` start | Yes — use system install if sudo available |
| D012 | M001/S02 | convention | Session ID generation | crypto.randomUUID() — no nanoid dependency | Standard Node.js crypto API, no additional dependency for a simple UUID need | No |
| D013 | M001/S02 | convention | Revision storage format | Full text snapshots, not character-level diffs | Simpler implementation, sufficient for study-scale data, each snapshot independently readable | No |
| D014 | M001/S02 | convention | Sample order storage | JSON string in TEXT column, parsed on read | SQLite has no native array type; JSON string is simple and Drizzle handles it cleanly | No |
| D015 | M001/S02 | pattern | Balanced group assignment algorithm | Assign to group with fewest sessions; ties broken randomly; Fisher-Yates shuffle for sample order | Ensures equal group sizes for valid experimental design; Fisher-Yates is unbiased | No |
| D016 | M001/S02 | convention | Email normalization | Lowercase before lookup | Prevents duplicate participants from case differences | No |
| D017 | M001/S02 | pattern | All DB queries through query layer | No direct schema access from routes — all operations via src/lib/db/queries.ts | Single source of truth for data operations; easier to audit and test | No |
| D018 | M001/S03 | pattern | ReadableStream DB save ordering | Save AI response to DB BEFORE calling controller.close() in streaming response | controller.close() triggers connection teardown which can abort pending async DB writes; save-first ordering ensures data persists | No |
| D019 | M001/S03 | pattern | Prompt API route architecture | Call chatWithOllama() directly from prompt route, not via internal HTTP to /api/chat | Avoids extra network hop and error handling complexity; prompt route needs DB access for conversation history which /api/chat doesn't have | No |
| D020 | M001/S05 | convention | CSV field escaping | Manual string escaping (double-quote wrapping, internal quote doubling, newline replacement) — no external CSV library | Single export endpoint with fixed 18-column schema; no need for papaparse/csv-stringify dependency | Yes — if CSV complexity grows |
| D021 | M001/S05 | pattern | Researcher dashboard rendering | Client components with useState+useEffect fetch to /api/researcher/* routes; server component layout only | Consistent with existing study page patterns; enables group filter state; API routes already provide the data layer | No |
