---
estimated_steps: 5
estimated_files: 6
---

# T02: Build registration page with balanced group assignment and session resume

**Slice:** S02 — Registration + Writing Editor + Sample Flow
**Milestone:** M001

## Description

Build the participant entry point: a registration form at `/register` that creates a participant and session with balanced random group assignment and randomized sample order. Handles session resume — if a participant re-enters an email that has an incomplete session, the same sessionId is returned instead of creating a new one.

Delivers R001 (registration), R002 (balanced random group assignment), R014 (sample order randomization), R016 (session persistence/resume).

## Steps

1. **Create `src/app/api/register/route.ts`** — POST handler that:
   - Accepts `{ name: string, email: string }` from request body
   - Validates both fields are present and non-empty (return 400 with JSON error if missing)
   - Calls `findParticipantByEmail(email)` — if found, calls `getIncompleteSessionByParticipant(participantId)`. If an incomplete session exists, return it immediately (R016 resume). If participant exists but all sessions complete, create a new session.
   - If participant doesn't exist, calls `createParticipant(name, email)`
   - Before creating a session, calls `seedWritingSamples()` to ensure writing samples exist (idempotent)
   - For group assignment: call `getGroupCounts()` to get counts for each group. Assign to the group with the fewest sessions. Break ties randomly using `Math.random()`. The three groups are: `'single-shot'`, `'iterative'`, `'scaffold'`.
   - Generate randomized sample order: Fisher-Yates shuffle of `[1, 2, 3]` — `const order = [1,2,3]; for(let i = order.length-1; i>0; i--) { const j = Math.floor(Math.random()*(i+1)); [order[i],order[j]]=[order[j],order[i]]; }`
   - Call `createSession(participantId, group, sampleOrder)` and return JSON `{ sessionId, group, sampleOrder }`
   - Return appropriate HTTP status: 200 for resume, 201 for new session
   - Use `import { NextRequest, NextResponse } from 'next/server'` pattern (established in S01's `/api/chat/route.ts`)

2. **Create `src/components/RegistrationForm.tsx`** — Client component (`'use client'`):
   - Two inputs: Name (text, required) and Email (email, required)
   - "Begin Study" submit button
   - On submit: POST to `/api/register` with JSON body, get sessionId from response, redirect to `/study/${sessionId}` using `window.location.href` or Next.js `useRouter().push()`
   - Show loading state during submission (disable button, show "Registering...")
   - Show error message if API returns non-2xx (e.g., "Please provide name and email")
   - Simple, clean styling with Tailwind: centered card, form fields stacked, clear labels

3. **Create `src/app/register/page.tsx`** — Server component page that renders `<RegistrationForm />`:
   - Import and render the form component
   - Add a page title/heading: "Prompt Engineering Study" or similar
   - Brief introductory text: "Welcome! Please enter your name and email to begin."

4. **Update `src/app/page.tsx`** — Replace the default Next.js landing page content. Two options (choose the simpler one):
   - Option A: Use `redirect('/register')` from `next/navigation` to auto-redirect (server-side)
   - Option B: Render a simple welcome page with a "Get Started" link to `/register`
   - Go with Option A (server-side redirect) — it's the cleanest UX

5. **Update `src/app/layout.tsx`** — Change the metadata title from "Create Next App" to "Prompt Engineering Study" and update the description to something appropriate like "A controlled study on prompt engineering and AI-assisted writing revision".

## Must-Haves

- [ ] POST `/api/register` accepts `{ name, email }` and returns `{ sessionId, group, sampleOrder }`
- [ ] Balanced random group assignment — assigns to group with fewest participants
- [ ] Fisher-Yates shuffle of `[1,2,3]` for sample order randomization
- [ ] Session resume — same email with incomplete session returns existing sessionId (R016)
- [ ] Input validation — 400 error for missing name/email
- [ ] Registration form with name/email inputs and loading/error states
- [ ] Root page (`/`) redirects to `/register`
- [ ] Layout metadata updated to "Prompt Engineering Study"
- [ ] Writing samples are seeded before first session creation

## Verification

- `curl -X POST http://localhost:3000/api/register -H 'Content-Type: application/json' -d '{"name":"Alice","email":"alice@test.com"}'` → returns `{ sessionId: "...", group: "...", sampleOrder: [...] }` with HTTP 201
- Same curl again → returns same sessionId with HTTP 200 (resume)
- `curl -X POST http://localhost:3000/api/register -H 'Content-Type: application/json' -d '{"name":"","email":""}'` → returns 400 error
- Register 3 different emails → all 3 groups should be represented (balanced assignment)
- Browser: visit `http://localhost:3000` → redirected to `/register` → fill form → redirected to `/study/[sessionId]`
- `npm run build` exits 0

## Inputs

- `src/lib/db/queries.ts` — T01's query functions: `createParticipant`, `findParticipantByEmail`, `createSession`, `getIncompleteSessionByParticipant`, `getGroupCounts`
- `src/lib/samples.ts` — T01's `seedWritingSamples` function
- `src/lib/db/schema.ts` — T01's extended schema (sessions table with groupAssignment, sampleOrder)
- `src/app/api/chat/route.ts` — S01's existing API route for pattern reference (NextRequest/NextResponse usage)

## Expected Output

- `src/app/api/register/route.ts` — POST handler with balanced assignment, resume, validation
- `src/components/RegistrationForm.tsx` — Client component with form, loading, errors
- `src/app/register/page.tsx` — Registration page rendering the form
- `src/app/page.tsx` — Redirects to `/register`
- `src/app/layout.tsx` — Updated metadata

## Observability Impact

- **New signal — POST `/api/register` response codes:** 201 for new session creation, 200 for session resume, 400 for validation errors. These status codes distinguish the three code paths in logs and curl testing.
- **New signal — group assignment distribution:** `getGroupCounts()` query against the `sessions` table shows how many sessions exist per group (`single-shot`, `iterative`, `scaffold`). Inspect via `node -e "const Database = require('better-sqlite3'); const db = new Database('sqlite.db'); console.log(db.prepare('SELECT group_assignment, COUNT(*) as count FROM sessions GROUP BY group_assignment').all())"`.
- **New signal — sample order randomization:** Each session's `sampleOrder` column stores the shuffled `[1,2,3]` array as a JSON string. Verify randomization by registering multiple participants and inspecting orders.
- **Session resume detection:** When a returning participant hits `/api/register`, the API returns the existing `sessionId` with HTTP 200 instead of creating a duplicate. This is verifiable by repeating the same curl request.
- **Failure visibility:** Missing/empty name or email returns structured `{ error: "..." }` JSON with HTTP 400. Server-side errors return 500 with a descriptive message.
- **Inspection surface:** `curl -s POST /api/register -H 'Content-Type: application/json' -d '{"name":"Test","email":"test@example.com"}'` is the primary probe — returns `{ sessionId, group, sampleOrder }`.
