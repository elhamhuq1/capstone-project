---
id: T02
parent: S02
milestone: M001
provides:
  - POST /api/register endpoint with balanced group assignment, session resume, and input validation
  - RegistrationForm client component with loading/error states
  - /register page and root redirect
key_files:
  - src/app/api/register/route.ts
  - src/components/RegistrationForm.tsx
  - src/app/register/page.tsx
  - src/app/page.tsx
  - src/app/layout.tsx
key_decisions:
  - Email normalized to lowercase before lookup to prevent duplicate participants from case differences
  - Fisher-Yates shuffle for sample order randomization (in-place, unbiased)
  - Balanced assignment picks group with min sessions; ties broken randomly
patterns_established:
  - API routes return structured JSON with appropriate HTTP status codes (200 resume, 201 created, 400 validation, 500 error)
  - seedWritingSamples(db) called before first session creation to ensure samples exist
  - Client forms POST to API routes and redirect on success via window.location.href
observability_surfaces:
  - POST /api/register response codes distinguish new (201), resume (200), and error (400/500) paths
  - Group distribution queryable via sessions table GROUP BY group_assignment
  - console.error('[register] Error:', message) for server-side error logging
duration: ~15min
verification_result: passed
completed_at: 2026-03-17
blocker_discovered: false
---

# T02: Build registration page with balanced group assignment and session resume

**Added registration endpoint with balanced group assignment, session resume, Fisher-Yates sample randomization, and form UI with redirect**

## What Happened

Built 5 files implementing the full registration flow:

1. **API route** (`/api/register`): POST handler validates name/email, checks for existing participant/session (R016 resume), seeds writing samples, assigns to lowest-count group with random tie-breaking, shuffles sample order [1,2,3] via Fisher-Yates, creates session, returns `{ sessionId, group, sampleOrder }`.

2. **RegistrationForm**: Client component with name/email inputs, loading state ("Registering…"), error display with `role="alert"`, and redirect to `/study/[sessionId]` on success.

3. **Register page**: Server component at `/register` rendering the form inside a centered card with heading and intro text.

4. **Root redirect**: `src/app/page.tsx` uses `redirect('/register')` from next/navigation.

5. **Layout metadata**: Title updated to "Prompt Engineering Study".

## Verification

- `npm run build` → ✅ exits 0, all routes compiled
- `curl POST /api/register {"name":"Alice","email":"alice@test.com"}` → ✅ 201 with sessionId, group, sampleOrder
- Same curl again → ✅ 200 with same sessionId (resume)
- `curl POST /api/register {"name":"","email":""}` → ✅ 400 with error message
- Registered 3 different emails → ✅ all 3 groups represented (single-shot, scaffold, iterative)
- Browser: `http://localhost:3000` → ✅ redirected to `/register` → filled form → ✅ redirected to `/study/[sessionId]` (404 expected — route built in later task)
- Sample orders vary across registrations → ✅ Fisher-Yates shuffle producing different orders

### Slice-Level Verification (T02 scope)

- ✅ `curl POST /api/register` returns JSON with `sessionId`, `group`, `sampleOrder` (3 items)
- ✅ Second POST with same email returns same `sessionId` (resume)
- ⏳ `curl GET /api/session/[id]` — not yet built (T03)
- ⏳ `curl POST /api/session/[id]/revision` — not yet built (T03/T04)
- ⏳ `curl POST /api/session/[id]/advance` — not yet built (T03/T04)
- ⏳ `scripts/verify-s02.sh` — not yet created (final task)
- ⏳ Browser walkthrough end-to-end — registration portion works, study pages pending

## Diagnostics

- **Registration probe:** `curl -s -X POST http://localhost:3000/api/register -H 'Content-Type: application/json' -d '{"name":"Test","email":"test@example.com"}'`
- **Group distribution:** `node -e "const Database = require('better-sqlite3'); const db = new Database('sqlite.db'); console.log(db.prepare('SELECT group_assignment, COUNT(*) as count FROM sessions GROUP BY group_assignment').all())"`
- **Session resume check:** POST same email twice; second should return HTTP 200 with same sessionId

## Deviations

- Email is normalized to lowercase before lookup (`email.trim().toLowerCase()`) — not explicitly in plan but prevents duplicate participants from case variations.

## Known Issues

None.

## Files Created/Modified

- `src/app/api/register/route.ts` — POST handler with balanced group assignment, session resume, validation
- `src/components/RegistrationForm.tsx` — Client component with form, loading/error states
- `src/app/register/page.tsx` — Registration page rendering the form
- `src/app/page.tsx` — Root redirect to /register
- `src/app/layout.tsx` — Updated metadata title/description
- `.gsd/milestones/M001/slices/S02/tasks/T02-PLAN.md` — Added Observability Impact section
