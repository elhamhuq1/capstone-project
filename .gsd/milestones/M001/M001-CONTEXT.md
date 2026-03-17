# M001: Prompt Engineering Study App — Context

**Gathered:** 2026-03-17
**Status:** Ready for planning

## Project Description

A web application for a Virginia Tech capstone research study (Group 7, Dr. Rho's class) investigating how prompt engineering skill affects AI-assisted writing revision. The core research question is the tradeoff between time/energy invested in prompting and the utility gained — measured through both quantitative signals (prompt length, time spent, acceptance rate of AI suggestions) and qualitative experience (perceived authorship, cognitive load, satisfaction).

## Why This Milestone

This is the only milestone. The team needs a working prototype — "essentially a finished product" — for the Milestone 2 demo on March 24th, and ready for actual participant study sessions shortly after.

## User-Visible Outcome

### When this milestone is complete, the user can:

- A participant registers, gets randomly assigned to a group, works through 3 writing samples with AI-assisted revision, completes post-sample surveys, and sees a completion screen
- A researcher browses all collected data and exports it to CSV for analysis

### Entry point / environment

- Entry point: http://localhost:3000
- Environment: local dev — one team member's laptop
- Live dependencies involved: Ollama running locally with Llama 3 8B model

## Completion Class

- Contract complete means: all screens render, AI integration works, data is captured and exportable
- Integration complete means: Ollama chat responds with advisory suggestions, data flows from participant action through to researcher CSV export
- Operational complete means: the app can run a full study session (multiple participants, all 3 groups, all 3 samples) without crashes or data loss

## Final Integrated Acceptance

To call this milestone complete, we must prove:

- A simulated participant can complete the entire study flow end-to-end in each of the three modes
- All research data (prompts, AI responses, revision history, timestamps, surveys) is captured and appears in the researcher dashboard
- CSV export contains all required data fields for analysis
- Ollama integration returns real advisory suggestions with streaming

## Risks and Unknowns

- Ollama/Llama 3 8B response quality — the system prompt must produce advisory suggestions, not direct rewrites, by default
- Revision history implementation complexity — tracking meaningful edit snapshots without character-level diffing
- Llama 3 8B response time on the host machine — if too slow, study sessions could be painful
- Timeline — 7 days to a finished product is tight

## Existing Codebase / Prior Art

- Empty repository — greenfield project
- 3 writing samples exist in `writing samples capstone 2026.docx` (scored 54, 64, 75 by Grammarly)
- Weekly reports and milestone presentations document the study design evolution

> See `.gsd/DECISIONS.md` for all architectural and pattern decisions — it is an append-only register; read it during planning, append to it during execution.

## Relevant Requirements

- R001–R016: All active requirements are owned by this milestone
- R005: Advisory system prompt design is the highest-risk requirement — the AI behavior is the experiment
- R010: Full data logging is the research instrument — everything else supports this

## Scope

### In Scope

- Participant registration and random group assignment
- Writing sample editor with revision history
- AI chat panel with Ollama/Llama 3 8B integration
- Three study modes: single-shot, iterative, scaffold
- Post-sample Likert surveys
- Full interaction data logging
- Researcher dashboard with CSV export
- Session persistence for browser crash recovery

### Out of Scope / Non-Goals

- Cloud deployment — localhost only
- Authentication — no passwords, no accounts
- Automated Grammarly scoring — manual post-study
- Mobile responsiveness — study sessions use laptops
- Multi-language support — English only

## Technical Constraints

- Next.js (App Router) with TypeScript
- SQLite for local data storage — no external database
- Ollama must be running on the same machine or local network
- Llama 3 8B model must be pre-pulled before study sessions

## Integration Points

- Ollama REST API (localhost:11434) — chat completions with streaming, system prompt for advisory behavior

## Open Questions

- Exact Likert survey questions — team needs to finalize wording
- Scaffold panel content — prompt engineering tips need to be authored by the research team
- Writing sample content is drafted but may need final review before the study
- Balanced random assignment strategy — simple random or stratified (e.g., ensure equal group sizes)?
