# Prompt Engineering Study App

## What This Is

A web application for conducting a controlled research study investigating how prompt engineering skill affects AI-assisted writing revision. Participants are randomly assigned to one of three modes (single-shot, iterative, scaffold), presented with flawed writing samples, and use an AI chat panel to get suggestions before manually revising the text. The study measures the tradeoff between time/energy invested in prompting and the utility gained — tracked through perceived authorship, cognitive load, satisfaction, prompt behavior, and revision quality.

Built for a Virginia Tech capstone project (Group 7, Dr. Rho's class).

## Core Value

A working research instrument that captures the full interaction loop — prompt, AI suggestion, human revision — with enough granularity to measure both quantitative signals (prompt length, time spent, acceptance rate) and qualitative experience (authorship, cognitive load, satisfaction).

## Current State

Empty project. Planning complete, no code yet.

## Architecture / Key Patterns

- **Next.js** (App Router) — full-stack framework, API routes for AI + data endpoints
- **SQLite** — local database for study data (participants, prompts, revisions, surveys)
- **Ollama** (Llama 3 8B) — local AI model, advisory system prompt (doesn't volunteer copy-pastable corrections unless explicitly asked)
- **Localhost deployment** — runs on one machine during in-person study sessions

## Capability Contract

See `.gsd/REQUIREMENTS.md` for the explicit capability contract, requirement status, and coverage mapping.

## Milestone Sequence

- [ ] M001: Prompt Engineering Study App — Complete research-ready web application for conducting the prompt engineering study
