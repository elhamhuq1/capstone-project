# S05: Researcher Dashboard + CSV Export — UAT

**Milestone:** M001
**Written:** 2026-03-17

## UAT Type

- UAT mode: mixed (artifact-driven API checks + live-runtime UI walkthrough)
- Why this mode is sufficient: The researcher dashboard is a read-only data browser — core correctness is verifiable through API responses and CSV output, but UI layout and usability require visual confirmation.

## Preconditions

- Dev server running: `npm run dev` from the project root (http://localhost:3000)
- At least 3 completed study sessions in the database (run `bash scripts/verify-s05.sh` to seed if empty, or register participants manually through the full flow)
- Sessions should span at least 2 different groups for filter testing

## Smoke Test

Navigate to http://localhost:3000/researcher — you should see a table of participant sessions with names, emails, group badges, and status indicators.

## Test Cases

### 1. Session List Loads With All Participants

1. Navigate to http://localhost:3000/researcher
2. Wait for the page to load (loading spinner → table appears)
3. **Expected:** A table with columns: Participant Name (clickable links), Email, Group (colored badge), Status (colored badge), Samples (X/3), Started At. Footer shows total count.

### 2. Group Filter Buttons Work

1. On `/researcher`, click the "Single-Shot" filter button
2. **Expected:** Table shows only sessions with "single-shot" group badge (amber color). The "Single-Shot" button appears as filled/active, others as outlined.
3. Click "All" button
4. **Expected:** All sessions reappear.
5. Click "Iterative" button
6. **Expected:** Only iterative sessions shown (sky blue badge).
7. Click "Scaffold" button
8. **Expected:** Only scaffold sessions shown (violet badge).

### 3. Session Detail Navigation

1. On `/researcher`, click a participant's name link
2. **Expected:** Navigates to `/researcher/[sessionId]` with a "← Back to Sessions" link at top, participant info header showing name, email, group badge, status badge, start timestamp.

### 4. Per-Sample Cards With Collapsible Sections

1. On a session detail page, observe the sample cards
2. **Expected:** 3 sample cards displayed, each showing sample title, sample index, and time duration.
3. Click "Prompts & AI Responses" section header on a sample card
4. **Expected:** Section expands to show prompt text (blue background) and AI response (green with border accent). If no prompts were sent, section shows "No prompts" message.
5. Click "Revisions" section header
6. **Expected:** Section expands showing numbered revision snapshots with timestamps. Long content is truncated with "Show more" option.
7. Click "Survey Ratings" section header
8. **Expected:** Section expands showing 5 inline badges: Ownership, Satisfaction, Cognitive Load, Helpfulness, Future Intent — each with a numeric value 1-5.

### 5. CSV Export Download

1. On any researcher page, click the "Export CSV" button in the header
2. **Expected:** Browser downloads a file named `study-export.csv`.
3. Open the CSV file in a text editor or spreadsheet program
4. **Expected:** First row has 18 column headers: participant_name, participant_email, group, sample_id, sample_title, sample_index, prompt_count, total_prompt_chars, revision_count, time_seconds, survey_authorship, survey_satisfaction, survey_cognitive_load, survey_helpfulness, survey_future_intent, session_status, session_started_at, session_completed_at.
5. **Expected:** Each data row has values for all columns. Survey columns show numeric 1-5 ratings. All fields are double-quote wrapped.

### 6. API Session List With Group Filter

1. Run: `curl -s http://localhost:3000/api/researcher/sessions | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).length))"`
2. **Expected:** A number ≥ 3 (the count of all sessions)
3. Run: `curl -s "http://localhost:3000/api/researcher/sessions?group=single-shot" | node -e "process.stdin.on('data',d=>{const arr=JSON.parse(d);console.log(arr.length, arr.every(s=>s.group==='single-shot'))})"`
4. **Expected:** A positive number followed by `true` — all returned sessions have group "single-shot"

### 7. API Session Detail

1. Get a session ID from step 6, then run: `curl -s http://localhost:3000/api/researcher/sessions/[SESSION_ID] | node -e "process.stdin.on('data',d=>{const s=JSON.parse(d);console.log('samples:',s.samples.length,'prompts:',Array.isArray(s.samples[0].prompts),'survey:',typeof s.samples[0].survey)})"`
2. **Expected:** `samples: 3 prompts: true survey: object`

### 8. CSV Export Headers and Content-Type

1. Run: `curl -s -D - -o /dev/null http://localhost:3000/api/researcher/export 2>&1 | head -10`
2. **Expected:** Response includes `content-type: text/csv` and `content-disposition: attachment; filename="study-export.csv"`

## Edge Cases

### Nonexistent Session Returns 404

1. Run: `curl -s http://localhost:3000/api/researcher/sessions/nonexistent-id-00000`
2. **Expected:** `{"error":"Session not found"}` with HTTP status 404

### Invalid Group Filter Returns 400

1. Run: `curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/api/researcher/sessions?group=invalid-group"`
2. **Expected:** HTTP status 400

### Empty Filter Result

1. If all sessions are a single group (e.g., only "single-shot"), click a filter for a different group
2. **Expected:** "No sessions found" empty state message — no error, no crash

### Session Detail for Incomplete Session

1. Register a participant but do NOT complete all 3 samples
2. Navigate to `/researcher/[sessionId]` for that incomplete session
3. **Expected:** Page loads showing available data. Completed samples show full data. Missing samples have empty prompts/revisions/survey sections. Status badge shows "active" (not "completed").

## Failure Signals

- `/researcher` shows a blank page or error banner → API route or DB connection issue
- Group filter doesn't change displayed sessions → fetch URL not including ?group= parameter
- Session detail shows "Session not found" for a valid ID → getSessionDetail query not finding the session
- CSV download produces empty file → getExportData query returning no rows
- CSV has wrong column count or missing headers → column list in export route mismatched
- Survey columns show empty/null instead of numbers → survey join not working in getExportData
- "Export CSV" button doesn't trigger download → missing download attribute or wrong Content-Disposition header

## Requirements Proved By This UAT

- R011 — Test cases 1-4, 6-7 prove researchers can browse sessions, filter by group, and view per-sample detail
- R012 — Test cases 5, 8 prove CSV export with correct headers, content type, and 18-column schema

## Not Proven By This UAT

- AI response quality in researcher view (this UAT doesn't verify Ollama content, only that stored responses display)
- Performance under large data volumes (UAT uses study-scale data, not stress testing)
- Cross-browser CSS rendering (UAT assumes a single modern browser)

## Notes for Tester

- The database accumulates sessions across verification runs. The session count will grow — this is expected.
- Group assignment is balanced, not deterministic — you may not get exactly one of each group per 3 registrations.
- Survey ratings in the CSV are the raw 1-5 values as entered, not labels.
- The researcher pages are localhost-only (D008) — no authentication is present or expected.
- The Export CSV button is in the sticky header — visible on both the list and detail pages.
