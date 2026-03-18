# S02: Registration + Writing Editor + Sample Flow — UAT

**Milestone:** M001
**Written:** 2026-03-17

## UAT Type

- UAT mode: mixed (artifact-driven API checks + live-runtime browser walkthrough)
- Why this mode is sufficient: The slice delivers API endpoints and client UI — both must be verified. The automated script validates API contracts; a browser walkthrough confirms the visual flow works end-to-end.

## Preconditions

1. Working directory: `/home/elham/capstone/.gsd/worktrees/M001`
2. Run `npx drizzle-kit push` to ensure database schema is applied
3. Start dev server: `npm run dev` — wait for "Ready" on port 3000
4. Delete any existing `sqlite.db` if starting clean (the app auto-seeds writing samples on first registration)

## Smoke Test

Run `bash scripts/verify-s02.sh` — all 12 checks should pass. If any fail, stop and investigate before proceeding with manual UAT.

## Test Cases

### 1. New Participant Registration

1. Open `http://localhost:3000` in a browser
2. Confirm you are redirected to `/register`
3. Enter name: "Alice Test", email: "alice@test.com"
4. Click "Start Study"
5. **Expected:** Redirected to `/study/[some-uuid]`. The page shows an instructions screen with numbered steps explaining the study task.

### 2. Group-Specific Instructions

1. Register three participants with different emails: `user1@test.com`, `user2@test.com`, `user3@test.com`
2. Each should be assigned a different group (check the `/api/register` response or the instructions screen content)
3. For the participant assigned to **scaffold** group: instructions should NOT contain prompt engineering tips (just mention "a helpful guide will be available")
4. For **single-shot**: instructions should mention "one opportunity" to interact with AI
5. For **iterative**: instructions should mention interacting "as many times as you like"
6. **Expected:** Each group sees different instructional text appropriate to their mode.

### 3. Begin Study and See First Sample

1. After registration, on the instructions screen, click "Begin Study"
2. **Expected:** The page transitions to the editing view showing "Sample 1 of 3" with a progress indicator, the sample title, a textarea pre-filled with the writing sample text, "Save Revision" and "Submit & Next Sample" buttons, and a revision history sidebar (empty).

### 4. Save Revision and View History

1. In the textarea, make an edit (change a few words)
2. Click "Save Revision"
3. **Expected:** A brief "Saved!" feedback appears. The revision history sidebar shows "Revision 1" with a timestamp.
4. Make another edit and save again
5. **Expected:** Revision history shows "Revision 1" and "Revision 2"
6. Click "Revision 1" in the history sidebar
7. **Expected:** The textarea is replaced with a read-only view of the Revision 1 text and a "Back to editing" button
8. Click "Back to editing"
9. **Expected:** The textarea returns with the current (latest) content

### 5. Sample Progression Through All 3 Samples

1. On Sample 1, click "Submit & Next Sample →"
2. **Expected:** A confirmation dialog appears asking to confirm submission
3. Confirm the dialog
4. **Expected:** Page transitions to "Sample 2 of 3" with a new sample title, fresh content in the textarea, and an empty revision history
5. Submit Sample 2 (click "Submit & Next Sample →" and confirm)
6. **Expected:** Page shows "Sample 3 of 3". The button text changes to "Submit Final Sample"
7. Submit Sample 3 and confirm
8. **Expected:** Page shows "You have completed all writing samples. Thank you!" (or similar completion message)

### 6. Session Resume

1. Close the browser tab
2. Navigate to `http://localhost:3000`
3. Enter the same email used for a previous incomplete session (e.g., register a new user, complete only 1 sample, then close)
4. Click "Start Study"
5. **Expected:** Redirected to the same session. The page loads directly at the editing phase (skipping instructions) showing the next unfinished sample — not sample 1 again.

### 7. API Contract — Registration

1. `curl -s -X POST http://localhost:3000/api/register -H 'Content-Type: application/json' -d '{"name":"Curl User","email":"curl@test.com"}'`
2. **Expected:** HTTP 201 with JSON body containing `sessionId` (UUID), `group` (one of single-shot/iterative/scaffold), `sampleOrder` (array of 3 numbers)
3. Same curl again
4. **Expected:** HTTP 200 with same `sessionId` (resume, not duplicate)

### 8. API Contract — Session Data

1. `curl -s http://localhost:3000/api/session/VALID_SESSION_ID`
2. **Expected:** JSON with `id`, `group`, `status`, `currentSampleIndex`, `currentSample` (object with `id`, `title`, `content`), `revisions` (array), `sampleOrder`
3. `curl -s http://localhost:3000/api/session/nonexistent-id`
4. **Expected:** HTTP 404 with `{"error":"Session not found"}`

### 9. API Contract — Revision Save

1. Begin a session first: `curl -s -X POST http://localhost:3000/api/session/VALID_SESSION_ID -H 'Content-Type: application/json' -d '{"action":"begin"}'`
2. `curl -s -X POST http://localhost:3000/api/session/VALID_SESSION_ID/revision -H 'Content-Type: application/json' -d '{"content":"My edited text"}'`
3. **Expected:** HTTP 201 with `revisionNumber: 1`
4. Same curl again with different content
5. **Expected:** HTTP 201 with `revisionNumber: 2`

### 10. API Contract — Sample Advancement

1. `curl -s -X POST http://localhost:3000/api/session/VALID_SESSION_ID/advance -H 'Content-Type: application/json' -d '{"content":"Final text"}'`
2. **Expected:** JSON with incremented `currentSampleIndex`, `completed: false`, and `nextSample` object
3. Advance two more times
4. **Expected:** After 3rd advance: `completed: true`, `status: "completed"`

## Edge Cases

### Empty Registration Fields

1. `curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/register -H 'Content-Type: application/json' -d '{}'`
2. **Expected:** HTTP 400

### Revision on Completed Session

1. Complete a session (advance through all 3 samples)
2. `curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/session/COMPLETED_SESSION_ID/revision -H 'Content-Type: application/json' -d '{"content":"Should fail"}'`
3. **Expected:** HTTP 400

### Email Case Sensitivity

1. Register with email "Test@Example.com"
2. Register again with email "test@example.com"
3. **Expected:** Same sessionId returned (email normalized to lowercase)

### Concurrent Group Distribution

1. Register 6 participants with unique emails
2. Check group distribution: `node -e "const Database = require('better-sqlite3'); const db = new Database('sqlite.db'); console.log(db.prepare('SELECT group_assignment, COUNT(*) as count FROM sessions GROUP BY group_assignment').all())"`
3. **Expected:** Each group has exactly 2 participants (balanced assignment)

## Failure Signals

- `npm run build` fails — TypeScript compilation errors or missing imports
- `scripts/verify-s02.sh` reports any "✗" lines — API contract broken
- Registration returns 500 — likely database or seeding issue
- Session API returns wrong sample content — JSON parsing of sampleOrder broken
- Revision numbers don't increment — saveRevision query not counting correctly
- Session never reaches "completed" — advanceSample logic not detecting 3rd sample boundary
- Instructions screen shows same text for all groups — switch/case on group string broken
- Resume returns new sessionId instead of existing — findByEmail or getIncompleteSession query issue

## Requirements Proved By This UAT

- R001 — Registration with name/email: Test Cases 1, 7
- R002 — Random group assignment: Test Cases 2, edge case "Concurrent Group Distribution"
- R003 — Writing sample presentation (3 samples, randomized order): Test Cases 3, 5, 10
- R004 — In-place text editor with revision history: Test Cases 3, 4
- R014 — Sample order randomization per participant: Test Case 7 (sampleOrder varies)
- R015 — Pre-study instructions screen: Test Cases 2, 3
- R016 — Session persistence (resume): Test Cases 6, 7

## Not Proven By This UAT

- R005 — AI chat panel: not built yet (S03)
- R006/R007/R008 — Mode enforcement (single-shot/iterative/scaffold): not built yet (S03)
- R009 — Post-sample Likert survey: not built yet (S04)
- R010 — Full data logging (prompts, AI responses): revision snapshots captured, but prompt/response logging requires S03/S04
- R013 — Completion screen: only a placeholder message shown; proper screen in S04

## Notes for Tester

- The writing samples contain deliberate grammar errors — this is intentional (they're the flawed text participants are supposed to revise).
- The "completed" state currently shows a basic message, not the final completion screen — S04 will add surveys and a proper thank-you page.
- There is no AI chat panel yet — the editor works standalone. S03 adds the chat panel alongside.
- Group assignment is pseudo-random — if you're testing with exactly 3 registrations, you should see one of each group, but the order is non-deterministic.
- The verify-s02.sh script creates test data in the database. Delete `sqlite.db` and re-run `npx drizzle-kit push` if you want a clean slate.
