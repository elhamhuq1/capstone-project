# Prompt Engineering Study App

## What This Is

A web application for conducting a controlled research study investigating how prompt engineering skill affects AI-assisted writing revision. Participants are randomly assigned to one of three modes (single-shot, iterative, scaffold), presented with flawed writing samples, and use an AI chat panel to get suggestions before manually revising the text. The study measures the tradeoff between time/energy invested in prompting and the utility gained — tracked through perceived authorship, cognitive load, satisfaction, prompt behavior, and revision quality.

Built for a Virginia Tech capstone project (Group 7, Dr. Rho's class).

## Core Value

A working research instrument that captures the full interaction loop — prompt, AI suggestion, human revision — with enough granularity to measure both quantitative signals (prompt length, time spent, acceptance rate) and qualitative experience (authorship, cognitive load, satisfaction).

## Current State

**M001 complete — milestone verified and closed.** The full research application is feature-complete and verified: participant registration with balanced group assignment → pre-study instructions → 3-sample writing revision flow with AI chat (advisory Llama 3 8B via Ollama) → per-sample Likert survey → completion screen → researcher dashboard with group filtering and 18-column CSV export. All 16 requirements (R001-R016) are validated with automated verification scripts. R017 (automated Grammarly scoring) is deferred — manual scoring planned.

The app is ready for supervised in-person study sessions on localhost.

## Architecture / Key Patterns

- **Next.js 16** (App Router) — full-stack framework, API routes for AI + data endpoints
- **SQLite** via Drizzle ORM + better-sqlite3 — local database, WAL mode, schema-as-code, 8 tables
- **Ollama** (Llama 3 8B) — local AI model, advisory system prompt (doesn't volunteer corrections unless explicitly asked)
- **Streaming** — API returns ReadableStream, client uses getReader() + TextDecoder for word-by-word display
- **Centralized query layer** — all DB operations through src/lib/db/queries.ts (~20 functions)
- **Study page state machine** — loading → instructions → editing → survey → completed → error
- **Localhost deployment** — runs on one machine during in-person study sessions

## Capability Contract

See `.gsd/REQUIREMENTS.md` for the explicit capability contract, requirement status, and coverage mapping.

## Milestone Sequence

- [x] M001: Prompt Engineering Study App — Complete research-ready web application with all 16 requirements validated
  - [x] S01: Project Foundation + Ollama AI Proof
  - [x] S02: Registration + Writing Editor + Sample Flow
  - [x] S03: AI Chat Panel + Mode Enforcement
  - [x] S04: Data Logging + Survey + Completion
  - [x] S05: Researcher Dashboard + CSV Export

## Operational Notes

- **Ollama must be started manually** before each study session: `~/.local/bin/ollama serve`
- **Dev server must start from project root** — SQLite path resolves relative to CWD
- **No authentication** on any routes — by design for localhost-only deployment
- **Llama 3 8B on CPU** produces ~10 tokens/sec; streaming masks latency but participants will notice waits
- **Verification scripts** at `scripts/verify-s02.sh` through `scripts/verify-s05.sh` provide automated regression testing
