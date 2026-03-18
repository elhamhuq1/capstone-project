# Prompt Engineering Study App

A web application for conducting a controlled research study investigating how prompt engineering skill affects AI-assisted writing revision. Built for Virginia Tech Capstone Group 7 (Dr. Rho's class).

## What This Does

Participants are randomly assigned to one of three experimental groups, then revise 3 flawed writing samples with AI assistance. The app captures every interaction for research analysis.

### Experimental Groups

| Group | AI Access | Extra Support |
|---|---|---|
| **Single-shot** | 1 prompt per sample | None |
| **Iterative** | Unlimited prompts | None |
| **Scaffold** | Unlimited prompts | Prompt engineering tips panel |

### Participant Flow

1. **Register** — name and email (no passwords)
2. **Instructions** — group-specific guidance
3. **Sample 1** — edit writing + use AI chat → submit → short survey
4. **Sample 2** — same flow → survey
5. **Sample 3** — same flow → survey
6. **Completion** screen

### What Gets Logged

- Every prompt sent to the AI and every AI response
- Every revision snapshot with timestamps
- Time spent per writing sample
- Survey responses (authorship, satisfaction, cognitive load, helpfulness, future intent)
- Group assignment and sample ordering

## Tech Stack

- **Next.js 16** (App Router) — full-stack framework
- **SQLite** via Drizzle ORM + better-sqlite3 — local database, zero setup
- **Google Gemini 2.5 Flash** — AI model via API
- **Tailwind CSS** — styling

## Setup

### Prerequisites

- **Node.js 18+** (20 recommended)
- **npm**
- A **Google Gemini API key** (free tier works)

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

### 3. Create environment file

Create a `.env.local` file in the project root:

```
GEMINI_API_KEY=your_key_here
```

### 4. Initialize the database

```bash
npx drizzle-kit push
```

This creates `sqlite.db` with all required tables. Writing samples are auto-seeded on first participant registration.

### 5. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to the registration page.

## Usage

### Running a Study Session

1. Start the dev server (`npm run dev`)
2. Have each participant open `http://localhost:3000` in their browser
3. They register, complete all 3 samples + surveys, and see the completion screen
4. Repeat for each participant

### Researcher Dashboard

Navigate to [http://localhost:3000/researcher](http://localhost:3000/researcher) to:

- **Browse all sessions** — see every participant's group, status, and timing
- **Filter by group** — compare single-shot vs. iterative vs. scaffold
- **Drill into a session** — view prompts, AI responses, revision history, and survey ratings per sample
- **Export CSV** — download all study data as an 18-column CSV for analysis in Excel, R, Python, etc.

CSV columns include: participant name/email, group, sample info, prompt count, total prompt characters, revision count, time spent, all 5 survey ratings, session status, and timestamps.

### Resetting Between Studies

To start fresh with a clean database:

```bash
rm sqlite.db
npx drizzle-kit push
```

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── register/       # Participant registration + group assignment
│   │   ├── session/         # Session data, prompts, revisions, timing, survey, advance
│   │   ├── chat/            # Direct chat endpoint
│   │   └── researcher/      # Dashboard data + CSV export
│   ├── study/[sessionId]/   # Main study page (state machine)
│   ├── researcher/          # Dashboard UI
│   └── register/            # Registration form
├── components/
│   ├── ChatPanel.tsx        # AI chat with markdown rendering
│   ├── WritingEditor.tsx    # Text editor + revision history
│   ├── ScaffoldPanel.tsx    # Prompt engineering tips (scaffold group only)
│   ├── SurveyForm.tsx       # Post-sample Likert survey
│   ├── InstructionsScreen.tsx
│   └── CompletionScreen.tsx
└── lib/
    ├── db/                  # Schema, queries, database connection
    ├── gemini.ts            # Gemini API streaming client
    ├── ollama.ts            # AI provider abstraction (re-exports Gemini)
    ├── prompts.ts           # Advisory system prompt
    └── samples.ts           # Writing sample content + seeding
```

## Troubleshooting

| Problem | Fix |
|---|---|
| `GEMINI_API_KEY is not set` | Create `.env.local` with your key, restart the dev server |
| 429 rate limit errors | Free tier allows 10 requests/min. Wait 60 seconds. |
| `sqlite.db` not found | Run `npx drizzle-kit push` |
| Chat responses are slow | Gemini 2.5 Flash typically responds in 2-5 seconds. Check your network. |
| Page shows "Session not found" | The session UUID in the URL doesn't exist. Re-register. |

## Notes

- **No authentication** — by design for localhost-only supervised study sessions
- **Session persistence** — if a browser closes mid-study, re-entering the same email resumes where they left off
- **Sample order is randomized** per participant to prevent ordering effects
- **The AI is advisory by default** — it gives guidance but doesn't volunteer corrections unless explicitly asked (this is the core experimental design)
