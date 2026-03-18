# S04: Data Logging + Survey + Completion — UAT

**Milestone:** M001
**Written:** 2026-03-17

## UAT Type

- UAT mode: mixed (live-runtime + human-experience)
- Why this mode is sufficient: The automated script verifies data integrity and API behavior, but the survey UX (clickable Likert buttons, phase transitions, visual completion screen) requires human visual confirmation in a browser.

## Preconditions

- Dev server running: `cd /home/elham/capstone/.gsd/worktrees/M001 && npm run dev`
- Ollama running with llama3 model (for AI chat during editing — optional for survey-only testing)
- SQLite database exists at `sqlite.db` (created by prior slices)

## Smoke Test

Register a new participant, begin the study, edit sample 1, click "Submit & Next", and confirm the survey form appears with 5 Likert questions. If the survey form renders, S04 is basically working.

## Test Cases

### 1. Survey Form Renders After Submit

1. Open `http://localhost:3000` and register with a new email
2. Click through instructions to begin editing
3. Make any edit to the writing sample
4. Click "Submit & Next"
5. **Expected:** A survey form appears with heading "Survey - Sample 1 of 3", showing 5 questions (authorship, satisfaction, cognitive load, helpfulness, future intent) each with 1-5 clickable buttons

### 2. Survey Requires All Answers

1. On the survey form, answer only 3 of the 5 questions (click buttons for 3 questions, leave 2 unanswered)
2. Check the "Submit Survey" button
3. **Expected:** The "Submit Survey" button is disabled/grayed out — cannot submit until all 5 questions have a rating selected

### 3. Survey Submission Advances to Next Sample

1. Answer all 5 survey questions by clicking a 1-5 button for each
2. Click "Submit Survey"
3. **Expected:** The page transitions to sample 2's editing view with fresh content. The AI chat panel resets (no prior messages).

### 4. Full 3-Sample Flow to Completion

1. Complete the full cycle for all 3 samples: edit → submit → survey → next sample (repeat 3 times)
2. After the 3rd survey submission:
3. **Expected:** A completion screen appears with:
   - Green checkmark icon
   - "Study Complete!" or similar heading
   - "You have completed all 3 writing samples" summary text
   - Session ID displayed in a monospace font box
   - "Return to Home" link

### 5. Session Resume Shows Survey When Pending

1. Register a new participant and begin editing
2. Edit sample 1 and click "Submit & Next" (survey appears)
3. **Before completing the survey**, close the browser tab
4. Open a new tab and navigate to `http://localhost:3000`
5. Re-enter the same email to resume the session
6. **Expected:** The study page loads directly to the survey form for sample 1 (not back to the editing view) — the survey is still pending

### 6. Per-Sample Timing Recorded

1. After completing a full 3-sample session, query the database:
   ```
   node -e "const db=require('better-sqlite3')('sqlite.db'); console.log(db.prepare('SELECT * FROM sample_timings WHERE session_id=?').all('<sessionId>'))"
   ```
2. **Expected:** 3 timing records, each with a non-null `started_at` and `completed_at` timestamp. The `completed_at` should be later than `started_at` for each record.

### 7. Survey Data Persisted Correctly

1. After completing a full 3-sample session, query the database:
   ```
   node -e "const db=require('better-sqlite3')('sqlite.db'); console.log(db.prepare('SELECT * FROM survey_responses WHERE session_id=?').all('<sessionId>'))"
   ```
2. **Expected:** 15 rows total (5 questions × 3 samples). Each row has a valid question_id (authorship, satisfaction, cognitive_load, helpfulness, future_intent), a rating between 1-5, and a sample_id corresponding to one of the 3 writing samples.

### 8. Completion Screen Session ID Matches

1. On the completion screen, note the displayed session ID
2. Check the URL bar — it should contain the same session ID as a path parameter
3. **Expected:** The session ID on-screen matches the URL session ID exactly

## Edge Cases

### Page Reload During Editing

1. Start editing a sample (make some edits)
2. Refresh the browser page (F5)
3. **Expected:** The page reloads to the editing view for the same sample. No duplicate timing records are created (the start timing is idempotent).

### Double-Click Submit & Next

1. Edit a sample and rapidly double-click "Submit & Next"
2. **Expected:** Only one submission occurs. The survey appears once. No errors in the console.

### Direct URL Navigation After Completion

1. After completing all 3 samples, note the session URL
2. Navigate directly to that URL again
3. **Expected:** The completion screen appears (not an error or editing view)

## Failure Signals

- Survey form does not appear after clicking "Submit & Next" — phase transition broken
- "Submit Survey" button active with unanswered questions — validation not enforced
- Page shows editing view after submitting survey instead of next sample — advance call failing
- Completion screen missing after 3rd survey — session status not transitioning to 'completed'
- Database shows 0 rows in survey_responses after completing surveys — POST /survey failing silently
- Database shows null completed_at in sample_timings — timing complete not firing
- Console errors about failed fetch to /api/session/.../survey or .../timing — API routes not registered

## Requirements Proved By This UAT

- R009 — Post-sample Likert survey: tests 1-3, 5, 7 prove the survey appears, validates, saves, and integrates with the flow
- R010 — Full data logging: tests 6-7 prove timing and survey data persist correctly alongside existing revision/prompt data
- R013 — Completion screen: tests 4, 8 prove the completion screen renders with correct content after all samples
- R004 — Revision history with data logging: test 6 proves per-sample timing closes the data logging loop for R004
- R016 — Session persistence: test 5 proves survey resume works correctly

## Not Proven By This UAT

- AI advisory response quality (R005) — this UAT does not test the AI response content
- Researcher dashboard and CSV export (R011, R012) — deferred to S05
- Automated Grammarly scoring (R017) — deferred
- Multi-participant concurrent sessions — this UAT tests single-participant flow only
- Computed metrics (prompt length, suggestion acceptance rate) — raw data captured, aggregation is S05

## Notes for Tester

- The Ollama server is not required for survey/timing testing — you can skip the AI chat and just submit edits. However, for a truly end-to-end test, having Ollama running with `llama3` model gives the realistic experience.
- Survey button selection uses blue highlight — if the buttons look unstyled, check that Tailwind is compiling correctly.
- The verification script (`bash scripts/verify-s04.sh`) covers the data integrity side comprehensively. This UAT focuses on the human experience that the script cannot verify (visual layout, UX flow, button responsiveness).
- Test emails must be unique per test run. Use a pattern like `uat-s04-1@test.com`, `uat-s04-2@test.com`, etc.
