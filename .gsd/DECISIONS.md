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
