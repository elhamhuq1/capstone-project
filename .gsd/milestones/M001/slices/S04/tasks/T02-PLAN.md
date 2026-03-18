---
estimated_steps: 6
estimated_files: 5
---

# T02: Build survey + completion UI and wire into study flow with verification

**Slice:** S04 — Data Logging + Survey + Completion
**Milestone:** M001

## Description

Create the SurveyForm and CompletionScreen components, modify WritingEditor's submit flow to delegate to the study page instead of calling /advance directly, add the `survey` phase to the study page state machine with timing calls, handle session resume when survey is pending, and write the comprehensive verification script. This is the integration task that ties T01's data layer into the user-facing flow.

## Steps

1. **Create `src/components/SurveyForm.tsx`.**

   A client component that renders 5 Likert questions and collects ratings.

   Props:
   ```typescript
   interface SurveyFormProps {
     sessionId: string;
     sampleId: number;
     sampleIndex: number;      // 1-based for display
     totalSamples: number;
     onSurveyComplete: () => void;
   }
   ```

   Implementation:
   - Import `SURVEY_QUESTIONS` from `@/lib/survey`.
   - State: `ratings: Record<string, number>` (questionId → rating), `submitting: boolean`, `error: string`.
   - Render a centered card (not side-by-side — takes the full width of the editing area). Header: "Sample {sampleIndex} of {totalSamples} — Quick Survey".
   - For each question, display the question text and a row of 5 clickable buttons labeled 1–5 (with "Strongly Disagree" under 1 and "Strongly Agree" under 5). Use radio-button-like styling — selected button gets a filled blue background.
   - Submit button: disabled until all 5 questions have ratings. On click, POST to `/api/session/${sessionId}/survey` with `{ sampleId, responses: Object.entries(ratings).map(([questionId, rating]) => ({ questionId, rating })) }`. On success, call `onSurveyComplete()`. On error, display error message.

   Styling: Use Tailwind. Card with `rounded-xl border bg-white p-8 shadow-sm dark:bg-zinc-900 dark:border-zinc-800`. Max width ~640px, centered horizontally.

2. **Create `src/components/CompletionScreen.tsx`.**

   Props:
   ```typescript
   interface CompletionScreenProps {
     sessionId: string;
   }
   ```

   Implementation:
   - Thank-you message: "Thank you for completing the study!"
   - Summary: "You have completed all 3 writing samples and surveys."
   - Session ID displayed in a subtle mono-font box: "Your session ID: {sessionId}" — for participant records.
   - Optionally a "Return to Home" link to `/register`.

   Styling: centered in viewport (matching loading/error screen pattern), clean and simple.

3. **Modify `src/components/WritingEditor.tsx`.**

   Changes to the component:
   - Add new prop: `onSubmitForSurvey: (data: { sampleId: number; sampleIndex: number }) => void`
   - Keep the existing `onSampleComplete` prop (the study page will still use it for the post-survey advance flow, but WritingEditor no longer calls it directly).
   - **Change `handleSubmitAndNext`**: After the user confirms the dialog:
     1. Save final revision: POST to `/api/session/${sessionId}/revision` with `{ content: text }`. If this fails, show error and don't proceed.
     2. Record timing complete: POST to `/api/session/${sessionId}/timing` with `{ sampleId: sample.id, sampleIndex: sampleIndex - 1, event: 'complete' }`. (Fire-and-forget — don't block on failure.)
     3. Call `onSubmitForSurvey({ sampleId: sample.id, sampleIndex })`.
     4. **Do NOT call `/advance`** — the study page will call advance after the survey is complete.
   - Remove the existing fetch to `/api/session/${sessionId}/advance` from handleSubmitAndNext.
   - The `onSampleComplete` prop can be removed from WritingEditor's props since it no longer calls it — but verify the study page isn't passing it. Actually, keep the prop signature but just don't use it in handleSubmitAndNext. The study page will change what it passes. Simplest approach: **replace `onSampleComplete` with `onSubmitForSurvey`** in the props interface.

   Updated props interface:
   ```typescript
   interface WritingEditorProps {
     sessionId: string;
     sample: Sample;
     revisions: RevisionItem[];
     sampleIndex: number;
     totalSamples: number;
     onSubmitForSurvey: (data: { sampleId: number; sampleIndex: number }) => void;
   }
   ```

4. **Modify `src/app/study/[sessionId]/page.tsx`.**

   This is the core integration. Changes:

   a. **Update Phase type**: `type Phase = 'loading' | 'instructions' | 'editing' | 'survey' | 'completed' | 'error';`

   b. **Add state for pending survey**:
   ```typescript
   const [pendingSurvey, setPendingSurvey] = useState<{ sampleId: number; sampleIndex: number } | null>(null);
   ```

   c. **Update `fetchSession` resume logic**: After setting `sessionData`, when status is `'in-progress'`, check the new `sampleSubmitted` and `surveyCompleted` flags from the API response:
   - If `sampleSubmitted && !surveyCompleted`: set phase to `'survey'` and set `pendingSurvey` with the current sample info (from sessionData).
   - Otherwise: set phase to `'editing'` (normal behavior).

   d. **Add timing start call**: When the editing phase renders (or more precisely, when sessionData changes and phase is 'editing'), call POST `/api/session/${sessionId}/timing` with `{ sampleId: sessionData.currentSample.id, sampleIndex: sessionData.currentSampleIndex, event: 'start' }`. Use a `useEffect` that fires when phase is 'editing' and sessionData.currentSample.id changes. Fire-and-forget (don't await or handle errors — timing is best-effort).

   e. **Wire `onSubmitForSurvey` callback from WritingEditor**:
   ```typescript
   function handleSubmitForSurvey(data: { sampleId: number; sampleIndex: number }) {
     setPendingSurvey(data);
     setPhase('survey');
   }
   ```
   Pass this as `onSubmitForSurvey` prop to WritingEditor (replacing `onSampleComplete`).

   f. **Add survey phase rendering**: Between editing and completed phases:
   ```
   if (phase === 'survey' && pendingSurvey && sessionData) {
     return (
       <div className="flex min-h-screen items-center justify-center bg-stone-50 dark:bg-zinc-950 p-6">
         <SurveyForm
           sessionId={sessionId}
           sampleId={pendingSurvey.sampleId}
           sampleIndex={pendingSurvey.sampleIndex}
           totalSamples={sessionData.totalSamples}
           onSurveyComplete={handleSurveyComplete}
         />
       </div>
     );
   }
   ```

   g. **Add `handleSurveyComplete` function**: After survey submission succeeds:
   ```typescript
   async function handleSurveyComplete() {
     // Advance to next sample (or complete)
     try {
       const res = await fetch(`/api/session/${sessionId}/advance`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({}),
       });
       if (!res.ok) {
         setPhase('error');
         setErrorMessage('Failed to advance to next sample');
         return;
       }
     } catch {
       setPhase('error');
       setErrorMessage('Network error — please try again');
       return;
     }
     setPendingSurvey(null);
     await fetchSession();
   }
   ```

   h. **Replace completed block** with `<CompletionScreen sessionId={sessionId} />`.

   i. **Import** SurveyForm, CompletionScreen at the top of the file.

   j. **Update SessionData interface** to include `sampleSubmitted: boolean` and `surveyCompleted: boolean`.

5. **Create `scripts/verify-s04.sh`.**

   Verification script that exercises the full flow via curl + node+better-sqlite3 for DB checks.

   Structure:
   ```bash
   #!/usr/bin/env bash
   set -euo pipefail
   BASE="http://localhost:3000"
   PASS=0; FAIL=0
   check() { ... }  # helper that increments PASS/FAIL

   # 1. Check tables exist
   node -e "const Database = require('better-sqlite3'); const db = new Database('sqlite.db'); const tables = db.prepare(\"SELECT name FROM sqlite_master WHERE type='table' AND name IN ('survey_responses','sample_timings')\").all(); if (tables.length !== 2) { process.exit(1); }"

   # 2. Register a participant
   REG=$(curl -s -X POST "$BASE/api/register" -H 'Content-Type: application/json' -d '{"name":"S04 Test","email":"s04test@example.com"}')
   SESSION_ID=$(echo "$REG" | node -pe "JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).sessionId")

   # 3. Begin session
   curl -s -X POST "$BASE/api/session/$SESSION_ID" -H 'Content-Type: application/json' -d '{"action":"begin"}'

   # 4. Get session, extract current sample ID
   SESSION=$(curl -s "$BASE/api/session/$SESSION_ID")
   SAMPLE_ID=$(echo "$SESSION" | node -pe "JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).currentSample.id")

   # 5. POST timing start
   curl -s -X POST "$BASE/api/session/$SESSION_ID/timing" -H 'Content-Type: application/json' -d "{\"sampleId\":$SAMPLE_ID,\"sampleIndex\":0,\"event\":\"start\"}"

   # 6. POST timing complete
   curl -s -X POST "$BASE/api/session/$SESSION_ID/timing" -H 'Content-Type: application/json' -d "{\"sampleId\":$SAMPLE_ID,\"sampleIndex\":0,\"event\":\"complete\"}"

   # 7. Verify timing in DB
   node -e "const Database = require('better-sqlite3'); const db = new Database('sqlite.db'); const row = db.prepare('SELECT * FROM sample_timings WHERE session_id = ?').get('$SESSION_ID'); if (!row || !row.completed_at) process.exit(1);"

   # 8. POST survey (valid)
   curl -s -X POST "$BASE/api/session/$SESSION_ID/survey" -H 'Content-Type: application/json' -d "{\"sampleId\":$SAMPLE_ID,\"responses\":[{\"questionId\":\"authorship\",\"rating\":4},{\"questionId\":\"satisfaction\",\"rating\":3},{\"questionId\":\"cognitive_load\",\"rating\":2},{\"questionId\":\"helpfulness\",\"rating\":5},{\"questionId\":\"future_intent\",\"rating\":4}]}"

   # 9. Verify survey in DB
   node -e "const Database = require('better-sqlite3'); const db = new Database('sqlite.db'); const rows = db.prepare('SELECT * FROM survey_responses WHERE session_id = ?').all('$SESSION_ID'); if (rows.length !== 5) process.exit(1);"

   # 10. POST survey (invalid — rating 6) → should get 400
   # 11. GET session → check sampleSubmitted and surveyCompleted are true
   # 12. Advance → repeat loop for samples 2 and 3
   # 13. After 3rd advance → session status is 'completed'
   # 14. npm run build exits 0
   ```

   The script should handle the full 3-sample loop: for each sample, start timing → save revision → complete timing → submit survey → advance. After the third, verify completed status.

6. **Run verification.**
   - `npm run build` — must exit 0
   - `bash scripts/verify-s04.sh` — all checks must pass

## Must-Haves

- [ ] SurveyForm component renders 5 Likert questions with 1-5 clickable scale and submits to /survey API
- [ ] CompletionScreen component displays thank-you, session ID, and summary
- [ ] WritingEditor calls onSubmitForSurvey instead of POST /advance — saves revision and timing before handing control back
- [ ] Study page has 'survey' phase that renders SurveyForm between editing and advance
- [ ] handleSurveyComplete calls POST /advance then fetchSession to progress
- [ ] Timing start fires when editing phase loads for a sample (useEffect)
- [ ] Session resume correctly shows survey phase when sampleSubmitted && !surveyCompleted
- [ ] Completed phase renders CompletionScreen component
- [ ] scripts/verify-s04.sh exercises full 3-sample flow with surveys and passes all checks
- [ ] `npm run build` exits 0

## Verification

- `npm run build` exits 0
- `bash scripts/verify-s04.sh` — all checks pass (tables exist, survey/timing APIs work, full 3-sample flow completes, session status is 'completed')
- Manual browser walkthrough: register → instructions → begin → edit sample 1 → submit → survey form appears → fill all 5 ratings → submit survey → sample 2 editing loads → repeat × 2 → completion screen with session ID

## Observability Impact

- Signals added: timing start calls on editing phase load; timing complete + survey POST in submit flow; study page phase transitions now include 'survey'
- How a future agent inspects this: study page phase drives the entire UI — inspect via React DevTools or by checking GET /session response flags; verify-s04.sh exercises the complete flow
- Failure state exposed: SurveyForm shows inline error on failed POST; study page transitions to error phase on failed advance; verify-s04.sh reports per-check pass/fail

## Inputs

- `src/lib/db/schema.ts` — T01 added surveyResponses and sampleTimings tables
- `src/lib/db/queries.ts` — T01 added saveSurveyResponses, getSurveyResponses, startSampleTiming, completeSampleTiming, getSampleTimings
- `src/lib/survey.ts` — T01 created SURVEY_QUESTIONS constant with 5 questions (id + text)
- `src/app/api/session/[sessionId]/survey/route.ts` — T01 created POST handler
- `src/app/api/session/[sessionId]/timing/route.ts` — T01 created POST handler
- `src/app/api/session/[sessionId]/route.ts` — T01 extended GET with sampleSubmitted and surveyCompleted fields
- `src/components/WritingEditor.tsx` — existing component (269 lines) with handleSubmitAndNext that currently calls /advance directly and onSampleComplete prop
- `src/app/study/[sessionId]/page.tsx` — existing study page (199 lines) with Phase type ('loading' | 'instructions' | 'editing' | 'completed' | 'error') and editing phase rendering WritingEditor with onSampleComplete={() => fetchSession()}
- `src/app/api/session/[sessionId]/advance/route.ts` — existing POST handler that advances sample or marks completed (unchanged in this task — study page calls it after survey)

### Key integration details from existing code:

**WritingEditor current submit flow (to be changed):**
- `handleSubmitAndNext` → `window.confirm()` → POST `/advance` with `{ content: text }` → `onSampleComplete()`
- New flow: `handleSubmitAndNext` → `window.confirm()` → POST `/revision` with `{ content: text }` → POST `/timing` complete → `onSubmitForSurvey({ sampleId, sampleIndex })`

**Study page current editing phase (to be modified):**
```tsx
<WritingEditor
  sessionId={sessionId}
  sample={sessionData.currentSample}
  revisions={sessionData.revisions}
  sampleIndex={sessionData.currentSampleIndex + 1}
  totalSamples={sessionData.totalSamples}
  onSampleComplete={() => fetchSession()}
/>
```

**Study page completed phase (to be replaced):**
Currently shows a simple "You have completed all writing samples. Thank you!" message. Replace with `<CompletionScreen sessionId={sessionId} />`.

**Note on advance route:** The advance route accepts optional `content` in body for final revision save. Since WritingEditor now saves the revision separately before handing off, the advance call from `handleSurveyComplete` should send an empty body `{}` — the advance route handles empty body gracefully.

## Expected Output

- `src/components/SurveyForm.tsx` — new component with 5 Likert questions, submit handler, loading/error states
- `src/components/CompletionScreen.tsx` — new component with thank-you message and session ID
- `src/components/WritingEditor.tsx` — modified to use onSubmitForSurvey prop, no longer calls /advance
- `src/app/study/[sessionId]/page.tsx` — extended with survey phase, timing calls, resume handling, CompletionScreen
- `scripts/verify-s04.sh` — comprehensive verification script for full 3-sample flow
