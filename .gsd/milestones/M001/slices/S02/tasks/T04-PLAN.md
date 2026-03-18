---
estimated_steps: 5
estimated_files: 5
---

# T04: Build writing editor with revision saving, sample progression, and end-to-end verification

**Slice:** S02 — Registration + Writing Editor + Sample Flow
**Milestone:** M001

## Description

Build the core editing experience: a `WritingEditor` component with a textarea for editing writing samples, a "Save Revision" button that creates text snapshots, a revision history sidebar for viewing past versions, and "Submit & Next Sample" button for progressing through all 3 samples. Wire this into the study flow page and create the verification script proving the entire S02 flow works end-to-end.

Delivers R004 (in-place text editor with revision history) and completes R003 (sample progression through all 3 samples).

## Steps

1. **Create `src/app/api/session/[sessionId]/revision/route.ts`** — POST handler:
   - Accepts `{ content: string }` from request body
   - Extracts `sessionId` from route params (`const { sessionId } = await params;`)
   - Calls `getSession(sessionId)` to get session and determine current sample ID from `sampleOrder[currentSampleIndex]`
   - Validates: session exists (404 if not), content is non-empty string (400 if missing)
   - Calls `saveRevision(sessionId, sampleId, content)` from queries.ts
   - Returns `{ revisionNumber, sampleId, createdAt }` with HTTP 201
   - Also validates session isn't completed (return 400 "Session is already completed" if status is 'completed')

2. **Create `src/app/api/session/[sessionId]/advance/route.ts`** — POST handler:
   - Extracts `sessionId` from route params
   - Optionally accepts `{ content: string }` — if provided, saves a final revision before advancing
   - Calls `getSession(sessionId)` to validate session exists and isn't already completed
   - If content is provided, saves final revision via `saveRevision()`
   - Calls `advanceSample(sessionId)` from queries.ts
   - Returns updated session data: `{ currentSampleIndex, status, completed: status === 'completed' }`
   - After advancing, if not completed, also return the next sample data by calling `getSessionWithCurrentSample(sessionId)` so the client doesn't need a separate fetch

3. **Create `src/components/WritingEditor.tsx`** — `'use client'` component:
   - Props: `{ sessionId: string, sample: { id: number, title: string, content: string }, revisions: Array<{ id: number, content: string, revisionNumber: number, createdAt: string }>, onSampleComplete: () => void }`
   - **Editor area:** `<textarea>` pre-filled with `sample.content`, full-width, tall (min-height 400px). Controlled input with `useState`.
   - **Save Revision button:** Calls POST `/api/session/${sessionId}/revision` with current textarea content. On success, adds the new revision to the local revisions list. Shows brief "Saved!" feedback. Disable during save.
   - **Revision history sidebar:** Right side panel or below the editor. Lists revisions as "Revision 1 — {timestamp}", "Revision 2 — {timestamp}", etc. Clicking a revision shows its full content in a read-only overlay or replaces the textarea temporarily with a "Viewing Revision N" banner and a "Back to editing" button. Keep this simple — a modal or expanding section is fine.
   - **Submit & Next Sample button:** Distinct from "Save Revision". Calls POST `/api/session/${sessionId}/advance` with current content (saves final revision automatically). On success, calls `onSampleComplete()`. Confirm dialog: "Submit this sample and move to the next one? You cannot return to edit this sample."
   - **Progress indicator:** Show "Sample 1 of 3", "Sample 2 of 3", etc. based on a `sampleIndex` prop or derive from revision data.
   - **Styling:** Clean layout with Tailwind — textarea with border and padding, sidebar with revision list, buttons clearly distinguished (save = secondary, submit = primary). The editor and sidebar can be in a flex row layout.

4. **Wire WritingEditor into `src/app/study/[sessionId]/page.tsx`:**
   - Replace the placeholder editing div from T03 with `<WritingEditor />` component
   - Pass the current sample data, revisions, and sessionId as props
   - Implement `onSampleComplete` callback: re-fetch session data from GET `/api/session/${sessionId}`. If the response shows `status: 'completed'`, transition to completed phase. Otherwise, load the new current sample into the editor.
   - Add `sampleIndex` to props or derive from session data for the progress indicator
   - The study flow page now handles the full editing loop: edit → save revisions → submit → next sample → ... → completed

5. **Create `scripts/verify-s02.sh`** — Bash verification script that exercises the full API flow:
   ```
   #!/usr/bin/env bash
   set -euo pipefail
   BASE="http://localhost:3000"
   
   echo "=== S02 Verification ==="
   
   # 1. Register a participant
   RESULT=$(curl -s -X POST "$BASE/api/register" -H 'Content-Type: application/json' -d '{"name":"Test User","email":"verify-s02@test.com"}')
   SESSION_ID=$(echo $RESULT | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).sessionId))")
   echo "✓ Registration: sessionId=$SESSION_ID"
   
   # 2. Verify resume — same email returns same session
   RESULT2=$(curl -s -X POST "$BASE/api/register" -H 'Content-Type: application/json' -d '{"name":"Test User","email":"verify-s02@test.com"}')
   SESSION_ID2=$(echo $RESULT2 | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).sessionId))")
   [ "$SESSION_ID" = "$SESSION_ID2" ] && echo "✓ Session resume works" || { echo "✗ Session resume FAILED"; exit 1; }
   
   # 3. Get session data
   SESSION=$(curl -s "$BASE/api/session/$SESSION_ID")
   STATUS=$(echo $SESSION | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).status))")
   echo "✓ Session status: $STATUS"
   
   # 4. Save a revision
   REV=$(curl -s -X POST "$BASE/api/session/$SESSION_ID/revision" -H 'Content-Type: application/json' -d '{"content":"Edited text for sample 1"}')
   REV_NUM=$(echo $REV | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).revisionNumber))")
   [ "$REV_NUM" = "1" ] && echo "✓ Revision saved: #$REV_NUM" || { echo "✗ Revision number FAILED"; exit 1; }
   
   # 5. Advance through all 3 samples
   for i in 1 2 3; do
     ADV=$(curl -s -X POST "$BASE/api/session/$SESSION_ID/advance" -H 'Content-Type: application/json' -d '{"content":"Final text for sample '$i'"}')
     echo "✓ Advanced past sample $i"
   done
   
   # 6. Verify session is completed
   FINAL=$(curl -s "$BASE/api/session/$SESSION_ID")
   FINAL_STATUS=$(echo $FINAL | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).status))")
   [ "$FINAL_STATUS" = "completed" ] && echo "✓ Session completed" || { echo "✗ Session not completed: $FINAL_STATUS"; exit 1; }
   
   # 7. Verify input validation
   ERR=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/register" -H 'Content-Type: application/json' -d '{}')
   [ "$ERR" = "400" ] && echo "✓ Validation: empty body returns 400" || { echo "✗ Validation FAILED: $ERR"; exit 1; }
   
   # 8. Verify balanced group assignment (register 2 more participants)
   curl -s -X POST "$BASE/api/register" -H 'Content-Type: application/json' -d '{"name":"User2","email":"verify-s02-2@test.com"}' > /dev/null
   curl -s -X POST "$BASE/api/register" -H 'Content-Type: application/json' -d '{"name":"User3","email":"verify-s02-3@test.com"}' > /dev/null
   echo "✓ Registered 2 more participants for balanced assignment check"
   
   echo ""
   echo "=== All S02 checks passed ==="
   ```
   - Make it executable: `chmod +x scripts/verify-s02.sh`
   - Run `npm run build` to verify TypeScript compilation

## Must-Haves

- [ ] POST `/api/session/[sessionId]/revision` saves full text snapshot with incrementing revision_number
- [ ] POST `/api/session/[sessionId]/advance` advances sample index, saves final revision, returns next sample or marks completed
- [ ] WritingEditor has textarea pre-filled with sample content
- [ ] "Save Revision" button creates snapshot and shows in revision history
- [ ] Revision history sidebar shows timestamped list, click to view past version
- [ ] "Submit & Next Sample" advances to next sample with confirmation
- [ ] Progress indicator shows "Sample N of 3"
- [ ] After 3rd sample submission, session status becomes 'completed'
- [ ] `scripts/verify-s02.sh` exercises full API flow and passes
- [ ] `npm run build` exits 0

## Verification

- `bash scripts/verify-s02.sh` — all checks pass (registration, resume, revision, advancement, completion, validation)
- `npm run build` exits 0 with no TypeScript errors
- Browser walkthrough: register → instructions → edit sample 1 → save revision → submit → edit sample 2 → submit → edit sample 3 → submit → completed screen

## Inputs

- `src/lib/db/queries.ts` — T01's query functions: `getSession`, `saveRevision`, `advanceSample`, `getSessionWithCurrentSample`, `getRevisions`
- `src/app/study/[sessionId]/page.tsx` — T03's study flow page with state machine and placeholder editing div
- `src/app/api/session/[sessionId]/route.ts` — T03's session data endpoint
- `src/lib/db/schema.ts` — T01's schema for type imports
- `src/app/api/register/route.ts` — T02's registration endpoint (used by verification script)

## Observability Impact

- **New signals:** Revision save events (POST `/revision` → 201 with `revisionNumber`), sample advancement events (POST `/advance` → 200 with `currentSampleIndex` and `completed` flag), session completion (status transitions to `completed`)
- **Inspection surfaces:** `GET /api/session/[id]` returns current sample, revisions list, and status — the single source of truth for session state. `scripts/verify-s02.sh` exercises the full flow as an automated health check.
- **Failure visibility:** Revision route returns 404 for missing session, 400 for empty content or completed session. Advance route returns 404/400 similarly. All errors are structured JSON with descriptive messages.
- **Console logging:** API routes log errors with `[revision]` and `[advance]` prefixes for server-side debugging.

## Expected Output

- `src/app/api/session/[sessionId]/revision/route.ts` — POST handler for saving revisions
- `src/app/api/session/[sessionId]/advance/route.ts` — POST handler for sample advancement
- `src/components/WritingEditor.tsx` — Full editor with revision history and sample progression
- `src/app/study/[sessionId]/page.tsx` — Updated with WritingEditor wired in (replaces T03 placeholder)
- `scripts/verify-s02.sh` — End-to-end API verification script
