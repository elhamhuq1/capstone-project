---
estimated_steps: 4
estimated_files: 3
---

# T03: Build study flow page with instructions screen and session data API

**Slice:** S02 — Registration + Writing Editor + Sample Flow
**Milestone:** M001

## Description

Build the session data API endpoint and the study flow page that acts as the state-machine shell for the entire participant experience. On mount, it fetches session data. First, it shows a pre-study instructions screen (R015) with content that varies by group — the scaffold group's instructions omit prompt engineering tips (those come from S03's scaffold panel during the task). After clicking "Begin", it transitions to the editing phase (T04 wires in the full editor component).

Delivers R015 (pre-study instructions with group-aware content) and the structural page for R003 (sample presentation — the progression logic is completed in T04).

## Steps

1. **Create `src/app/api/session/[sessionId]/route.ts`** — GET handler that:
   - Extracts `sessionId` from the URL params (Next.js App Router: `{ params }: { params: Promise<{ sessionId: string }> }` — in Next.js 16 with App Router, route params may be accessed via `await params` or directly depending on version. Follow the pattern: `const { sessionId } = await params;`)
   - Calls `getSessionWithCurrentSample(sessionId)` from queries.ts
   - If session not found, return 404 with `{ error: "Session not found" }`
   - If found, return JSON with: `{ id, participantId, group: session.groupAssignment, status: session.status, currentSampleIndex, totalSamples: 3, sampleOrder: JSON.parse(session.sampleOrder), currentSample: { id, title, content }, revisions: [...] }` — the current sample's data and any existing revisions for the current sample
   - Also calls `getRevisions(sessionId, currentSampleId)` to include revision history for the current sample
   - Import `NextResponse` from `next/server`

2. **Create `src/components/InstructionsScreen.tsx`** — Client component:
   - Props: `{ group: string, onBegin: () => void }`
   - Shows a study overview explaining:
     - "You will revise 3 writing samples with the help of an AI assistant"
     - "Edit the text directly in the editor"
     - "You can ask the AI for help using the chat panel" (note: chat panel added by S03, but instructions can reference it)
     - "Take your time — there is no time limit"
   - **Group-specific content:**
     - For `single-shot`: "You will have one opportunity to ask the AI for assistance per sample."
     - For `iterative`: "You can ask the AI for assistance as many times as you like per sample."
     - For `scaffold`: "You can ask the AI for assistance as many times as you like per sample. A helpful guide will be available during the task." Do NOT include prompt engineering tips here — R015 specifically says scaffold group should not see tips in the instructions (they appear in the scaffold panel during editing, which S03 builds).
   - "Begin" button at bottom that calls `onBegin()`
   - Clean, readable styling — centered container, clear headings, adequate spacing, Tailwind classes

3. **Create `src/app/study/[sessionId]/page.tsx`** — `'use client'` component with state machine:
   - State: `phase` (`'loading'` | `'instructions'` | `'editing'` | `'completed'`), `sessionData` (fetched from API)
   - On mount (`useEffect`): fetch `GET /api/session/${sessionId}` to load session data. Set phase based on `session.status`:
     - `'instructions'` → show InstructionsScreen
     - `'in-progress'` → show editing view (for resume — R016)
     - `'completed'` → show completed message
   - Access `sessionId` from URL params using `useParams()` from `next/navigation`
   - When `onBegin` is called: POST to update session status to `'in-progress'` (add a PATCH/POST endpoint or handle via `/api/session/[sessionId]/advance` — simplest: add a `beginSession` handler to the session route, or create a small POST on the same route). Alternative: since the status only matters for resume, update it when the first revision is saved (T04). **Simplest approach:** Add a POST handler to `/api/session/[sessionId]/route.ts` that accepts `{ action: 'begin' }` and updates status to `'in-progress'`.
   - In the `'editing'` phase: render a placeholder `<div>` that says "Editor will appear here — [Sample {n}/3]: {title}" with the current sample info. T04 will replace this with the real `WritingEditor` component.
   - In the `'completed'` phase: show "You have completed all writing samples. Thank you!" (S04 will extend this with surveys before completion)
   - Loading state: show a centered spinner or "Loading session..." text
   - Error state: if session fetch returns 404, show "Session not found" with a link back to `/register`
   - Re-fetch session data after any state change (begin, advance) to stay in sync

4. **Verify the page works end-to-end with the registration flow:**
   - Start dev server, register a participant, confirm redirect to `/study/[sessionId]`
   - Instructions screen appears with correct group-specific text
   - "Begin" button transitions to editing placeholder
   - `npm run build` exits 0 with no TypeScript errors

## Must-Haves

- [ ] GET `/api/session/[sessionId]` returns session state with current sample content and revisions
- [ ] 404 response for non-existent sessionId
- [ ] InstructionsScreen shows group-specific content — scaffold group has NO prompt engineering tips
- [ ] Study flow page state machine: loading → instructions → editing → completed
- [ ] Session resume works — re-entering email loads existing session at correct phase
- [ ] POST to session route updates status to 'in-progress' when participant begins

## Verification

- `curl http://localhost:3000/api/session/VALID_SESSION_ID` → returns JSON with group, status, currentSample, revisions
- `curl http://localhost:3000/api/session/nonexistent` → returns 404
- Browser: register → see instructions with group-specific text → click Begin → see editing placeholder
- Resume: register same email → study flow loads at correct phase (instructions or editing)
- `npm run build` exits 0

## Inputs

- `src/lib/db/queries.ts` — T01's query functions: `getSessionWithCurrentSample`, `getRevisions`, `getSession`
- `src/app/api/register/route.ts` — T02's registration endpoint (creates sessions that this page loads)
- `src/lib/db/schema.ts` — T01's sessions/writingSamples tables for type context

## Expected Output

- `src/app/api/session/[sessionId]/route.ts` — GET + POST handler for session data and begin action
- `src/components/InstructionsScreen.tsx` — Group-aware pre-study instructions
- `src/app/study/[sessionId]/page.tsx` — Study flow page with state machine (loading/instructions/editing/completed)

## Observability Impact

- **New signal — session status transition:** POST `/api/session/[sessionId]` with `{ action: 'begin' }` transitions status from `instructions` → `in-progress`, enabling resume detection.
- **Inspection surface — session API:** `GET /api/session/[sessionId]` returns full session state (group, status, currentSample, revisions). Useful for debugging participant progress.
- **Failure visibility:** API returns structured JSON errors — 404 for missing session, 400 for invalid action. Console logs `[session]` prefix for server-side errors.
- **Future agent diagnostic:** Run `curl http://localhost:3000/api/session/SESSION_ID` to inspect any session's current state, sample, and revision history.
