# M001: Prompt Engineering Study App

**Vision:** A complete, research-ready web application that runs a controlled study on how prompt engineering skill affects AI-assisted writing revision — measuring the tradeoff between effort invested and utility gained across three interaction modes.

## Success Criteria

- A participant can complete the full study flow end-to-end: register → get assigned → revise 3 samples with AI assistance → complete surveys → see completion screen
- All three modes (single-shot, iterative, scaffold) enforce their constraints correctly
- The AI gives advisory suggestions by default, not copy-pastable rewrites (unless explicitly asked)
- Every research-relevant interaction is logged: prompts, AI responses, revision snapshots, timestamps, time per sample
- Researchers can browse all session data and export to CSV
- The app runs reliably on localhost for supervised in-person study sessions

## Key Risks / Unknowns

- Ollama/Llama 3 8B advisory response quality — system prompt must produce useful suggestions without doing the work for the participant
- Revision history tracking — edit snapshots without character-level diffing adds UI and storage complexity
- Llama 3 8B latency on the host machine — slow responses could break the study flow
- Tight timeline (7 days to production-quality)

## Proof Strategy

- Ollama response quality → retire in S01 by proving the system prompt produces advisory suggestions with real Llama 3 8B responses
- Revision history complexity → retire in S02 by building the editor with snapshot tracking
- End-to-end flow integrity → retire in S04 by running a simulated full study session

## Verification Classes

- Contract verification: automated tests for API endpoints, mode enforcement logic, data capture completeness
- Integration verification: real Ollama chat responses with streaming, full data round-trip from participant action to CSV export
- Operational verification: complete study session simulation — multiple participants, all groups, all samples, no data loss
- UAT / human verification: research team reviews data quality, survey flow, and overall study experience

## Milestone Definition of Done

This milestone is complete only when all are true:

- All 5 slice deliverables are complete
- A simulated participant can complete the entire flow in each of the 3 modes with real AI responses
- All research data appears in the researcher dashboard and CSV export
- The AI system prompt produces advisory behavior by default
- The app can run a multi-participant study session without crashes or data loss

## Requirement Coverage

- Covers: R001, R002, R003, R004, R005, R006, R007, R008, R009, R010, R011, R012, R013, R014, R015, R016
- Partially covers: none
- Leaves for later: R017 (automated Grammarly scoring)
- Orphan risks: none

## Slices

- [ ] **S01: Project Foundation + Ollama AI Proof** `risk:high` `depends:[]`
  > After this: API endpoint accepts a prompt with writing sample context and returns advisory suggestions from Llama 3 8B via Ollama (proven with real responses, not mocked).

- [ ] **S02: Registration + Writing Editor + Sample Flow** `risk:medium` `depends:[S01]`
  > After this: Participant registers, gets randomly assigned a group, sees a pre-study instructions screen, and can edit writing samples in-place with revision history — progressing through all 3 randomized samples.

- [ ] **S03: AI Chat Panel + Mode Enforcement** `risk:medium` `depends:[S01,S02]`
  > After this: Participant prompts the AI for suggestions inside the study flow — single-shot disables input after one prompt, iterative allows multi-turn conversation, scaffold shows prompt engineering instruction panel alongside chat.

- [ ] **S04: Data Logging + Survey + Completion** `risk:low` `depends:[S02,S03]`
  > After this: Full end-to-end study run captures all research data — prompts, AI responses, revision snapshots, timestamps, time per sample, prompt length — plus Likert survey after each sample and a completion screen.

- [ ] **S05: Researcher Dashboard + CSV Export** `risk:low` `depends:[S04]`
  > After this: Researchers browse all participant sessions, view prompt/response history, revision diffs, survey answers, filter by group, and export everything to CSV.

## Boundary Map

### S01 → S02

Produces:
- `src/app/api/chat/route.ts` → POST handler accepting `{ messages, model }`, returns streaming Ollama response
- `src/lib/ollama.ts` → `chatWithOllama(messages, systemPrompt)` helper wrapping Ollama JS client
- `src/lib/prompts.ts` → `ADVISORY_SYSTEM_PROMPT` constant — the tuned system prompt for advisory behavior
- Next.js project scaffold with TypeScript, SQLite (via better-sqlite3 or Drizzle), Tailwind CSS

Consumes: nothing (first slice)

### S01 → S03

Produces:
- `src/lib/ollama.ts` → `chatWithOllama()` — reused by the chat panel component
- `src/lib/prompts.ts` → `ADVISORY_SYSTEM_PROMPT` — wired into chat context

Consumes: nothing (first slice)

### S02 → S03

Produces:
- `src/lib/db/schema.ts` → `participants`, `sessions`, `writingSamples` tables
- `src/app/study/[sessionId]/page.tsx` → study flow page with editor, accepts sessionId param
- `src/components/WritingEditor.tsx` → editable text area with revision history
- Session management — participant has a sessionId, assigned group, current sample index

Consumes from S01:
- Next.js project scaffold, database setup

### S02 → S04

Produces:
- Database schema for participants, sessions, writing samples, revisions
- Session flow logic — sample progression, revision snapshots
- `src/lib/db/queries.ts` → CRUD operations for sessions and revisions

Consumes from S01:
- Project scaffold, database setup

### S03 → S04

Produces:
- `src/components/ChatPanel.tsx` → AI chat component with mode-aware behavior
- `src/lib/db/schema.ts` (extended) → `prompts`, `aiResponses` tables
- Mode enforcement logic — single-shot limit, iterative multi-turn, scaffold panel display

Consumes from S01:
- `chatWithOllama()`, `ADVISORY_SYSTEM_PROMPT`
Consumes from S02:
- Session context (sessionId, group assignment, current sample)
- Writing editor integration (side-by-side layout)

### S04 → S05

Produces:
- Complete data in SQLite: participants, sessions, prompts, AI responses, revision snapshots, survey responses, timestamps, computed metrics (time per sample, prompt length)
- `src/lib/db/schema.ts` (extended) → `surveyResponses` table
- `src/lib/db/queries.ts` (extended) → aggregate queries for researcher views

Consumes from S02:
- Session and revision data
Consumes from S03:
- Prompt and AI response data, mode metadata
