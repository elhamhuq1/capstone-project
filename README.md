# Prompt Engineering Study App

A web application for conducting a controlled research study investigating how prompt engineering skill affects AI-assisted writing revision and psychological ownership. Built for Virginia Tech Capstone Group 7 (Dr. Rho's class).

## What This Does

Participants are randomly assigned to one of three experimental groups, then revise 3 flawed writing samples with AI assistance. The app captures every interaction for research analysis.

### Experimental Groups

| Group | AI Access | Extra Support |
|---|---|---|
| **Single-shot** | 1 prompt per sample | None |
| **Iterative** | Unlimited prompts | None |
| **Scaffold** | Unlimited prompts | Prompt engineering tips panel |

Group assignment uses round-robin to ensure balanced enrollment.

### Participant Flow

1. **Register** — name and email (no passwords)
2. **Pre-study survey** — 8-item Writing Self-Efficacy Scale (SEWS)
3. **Instructions** — group-specific guidance
4. **Sample 1** — edit writing + use AI chat → submit → 11-item survey
5. **Sample 2** — same flow → survey
6. **Sample 3** — same flow → survey
7. **Post-study survey** — same 8-item SEWS (measures change in self-efficacy)
8. **Completion** screen

### What Gets Logged

- Every prompt sent to the AI and every AI response
- Every revision snapshot with timestamps
- Time spent per writing sample
- **Pre/post writing self-efficacy** (8 items, SEWS — Bruning et al., 2013)
- **Per-task survey** (11 items per sample):
  - Calibration prediction (how many Grammarly points improved?)
  - Psychological ownership (7 items — Joshi & Vogel, 2025)
  - NASA-TLX cognitive load subscales: mental demand, effort, frustration
- Group assignment and sample ordering

## Tech Stack

- **Next.js 16** (App Router) — full-stack framework
- **Supabase Postgres** via Drizzle ORM — cloud database
- **Google Gemini 2.5 Flash** — AI model via API
- **Tailwind CSS** — styling
- **Vercel** — deployment

## Setup

### Prerequisites

- **Node.js 18+** (20 recommended)
- **npm**
- A **Google Gemini API key** (free tier works)
- A **Supabase project** (free tier works) — for the database

### 1. Clone and install

```bash
git clone git@github.com:elhamhuq1/capstone-project.git
cd capstone-project
npm install
```

### 2. Get a Gemini API key

1. Go to [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Click **Create API Key**
3. Copy the key (starts with `AIza...`)

### 3. Set up Supabase

1. Go to [https://supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. In your project dashboard, go to **Settings → Database**
4. Under **Connection string**, select **URI** and copy the connection string (use the **Transaction pooler** URL on port 6543 for serverless/Vercel compatibility)

The URL looks like:
```
postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

### 4. Create environment file

Create a `.env.local` file in the project root:

```
GEMINI_API_KEY=your_gemini_key_here
DATABASE_URL=your_supabase_connection_string_here
```

### 5. Initialize the database

Push the schema to your Supabase database:

```bash
npx drizzle-kit push
```

This creates all required tables. Writing samples are auto-seeded on first participant registration.

### 6. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to the registration page.

## Usage

### Running a Study Session

1. Start the dev server (`npm run dev`)
2. Have each participant open `http://localhost:3000` in their browser
3. They register, complete the pre-survey, all 3 samples + surveys, post-survey, and see the completion screen
4. Repeat for each participant

### Researcher Dashboard

Navigate to [http://localhost:3000/researcher](http://localhost:3000/researcher) to:

- **Browse all sessions** — see every participant's group, status, and timing
- **Filter by group** — compare single-shot vs. iterative vs. scaffold
- **Drill into a session** — view prompts, AI responses, revision history, and survey ratings per sample
- **Delete sessions** — remove test or incomplete sessions
- **Export CSV** — download all study data for analysis in Excel, R, Python, etc.

CSV columns include: participant info, group, sample info, prompt count, prompt text, AI response text, revision count, final revision text, time spent, all 11 per-task survey ratings, all 8 pre-study self-efficacy ratings, all 8 post-study self-efficacy ratings, and timestamps (38+ columns total).

### Resetting Between Studies

To clear all participant data (keeps the database tables intact):

```sql
-- Run in Supabase SQL Editor
TRUNCATE participants, sessions, revisions, prompts, ai_responses,
         survey_responses, pre_post_survey_responses, sample_timings,
         final_submissions CASCADE;
```

Or delete individual sessions from the researcher dashboard.

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── register/            # Participant registration + round-robin group assignment
│   │   ├── session/[sessionId]/ # Session data, prompts, revisions, timing, surveys, advance
│   │   │   ├── pre-post-survey/ # Pre/post self-efficacy survey submission
│   │   │   └── survey/          # Per-task survey submission
│   │   ├── chat/                # Gemini streaming chat endpoint
│   │   └── researcher/          # Dashboard data + CSV export
│   ├── study/[sessionId]/       # Main study page (state machine)
│   ├── researcher/              # Researcher dashboard UI
│   └── register/                # Registration form
├── components/
│   ├── ChatPanel.tsx            # AI chat with markdown rendering
│   ├── WritingEditor.tsx        # Text editor + revision history
│   ├── ScaffoldPanel.tsx        # Prompt engineering tips (scaffold group only)
│   ├── SurveyForm.tsx           # Per-task 11-item survey
│   ├── PrePostSurveyForm.tsx    # Pre/post self-efficacy survey (SEWS)
│   ├── WritingAssistantBlocker.tsx  # Blocks browser writing assistants during study
│   ├── InstructionsScreen.tsx
│   └── CompletionScreen.tsx
└── lib/
    ├── db/                      # Schema (Postgres/Drizzle), queries, connection
    ├── gemini.ts                # Gemini API streaming client
    ├── survey.ts                # Survey question definitions + validated scales
    └── samples.ts               # Writing sample content + seeding
```

## Troubleshooting

| Problem | Fix |
|---|---|
| `GEMINI_API_KEY is not set` | Add to `.env.local`, restart dev server |
| `DATABASE_URL is not set` | Add Supabase connection string to `.env.local` |
| Database connection error | Check your Supabase project is active; use the Transaction pooler URL (port 6543) |
| 429 rate limit errors | Free Gemini tier allows ~10 requests/min. Wait 60 seconds. |
| Tables don't exist | Run `npx drizzle-kit push` |
| Chat responses are slow | Gemini 2.5 Flash typically responds in 2–5 seconds. Check your network. |
| "Session not found" | The session UUID in the URL doesn't exist. Re-register. |
| Single-shot group gets extra prompts | The chat panel enforces the 1-prompt limit client-side and server-side |

## Notes

- **No authentication** — by design for supervised, in-person study sessions
- **Session persistence** — if a browser closes mid-study, re-entering the same email resumes where they left off
- **Sample order is randomized** per participant to prevent ordering effects
- **Writing assistants are blocked** — the app detects and warns against browser grammar tools (Grammarly, etc.) to keep conditions consistent
- **The AI is advisory by default** — gives guidance but doesn't volunteer corrections unless asked (core experimental design)
- **Mobile responsive** — participants can use tablets or phones if needed
