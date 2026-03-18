# S03: AI Chat Panel + Mode Enforcement — UAT

**Milestone:** M001
**Written:** 2026-03-17

## UAT Type

- UAT mode: mixed (artifact-driven + live-runtime)
- Why this mode is sufficient: Core data layer and API behavior verified via automated script and curl; mode enforcement and UI layout require browser observation but not deep human judgment.

## Preconditions

- Dev server running: `npm run dev` on port 3000
- Ollama running with llama3 model loaded: `ollama serve` (and `ollama pull llama3` completed)
- Database initialized: `npx drizzle-kit push` has been run
- At least one test participant not yet registered (use fresh email for each test run)

## Smoke Test

Register a participant, begin the session, and verify the editing phase shows a side-by-side layout with the writing editor on the left and an AI chat panel on the right. Type a prompt and confirm a streaming AI response appears.

## Test Cases

### 1. Single-shot mode: input disables after one prompt

1. Register a new participant (e.g. `single-test@uat.com`)
2. If assigned a non-single-shot group, register another participant until one is assigned `single-shot` (check `/api/session/{sessionId}` for `group` field)
3. Click "Begin" on instructions screen
4. In the AI chat panel on the right, type "Help me improve the grammar in this essay" and press Enter (or click send)
5. Wait for the streaming AI response to complete
6. **Expected:** The AI response appears word-by-word in a gray bubble on the left side of the chat. After the response completes, the textarea shows placeholder text "No more prompts available" and is visually disabled (grayed out, cursor not-allowed). An amber notice reads "You've used your one prompt for this sample."
7. Attempt to type in the textarea
8. **Expected:** No text can be entered — the input is disabled
9. The writing editor on the left should still be fully functional — type edits, click "Save Revision", and click "Submit & Next Sample"
10. **Expected:** After advancing to the next sample, the chat panel resets (empty, no messages). The input is enabled again (one new prompt allowed for this sample).

### 2. Iterative mode: unlimited multi-turn conversation

1. Register a participant assigned to the `iterative` group
2. Begin the session and navigate to the editing phase
3. Send a first prompt: "What grammar issues do you see?"
4. Wait for the AI response to complete
5. Send a second prompt: "Can you explain the issue in the second paragraph in more detail?"
6. **Expected:** Both prompts and both AI responses are visible in the chat history. The second response should reference the context from the first exchange (multi-turn conversation).
7. Send a third prompt: "How about the conclusion?"
8. **Expected:** Input remains enabled after 3 prompts — no limit enforced. All 3 exchanges visible.

### 3. Scaffold mode: instruction panel + unlimited prompts

1. Register a participant assigned to the `scaffold` group
2. Begin the session
3. **Expected:** The right column shows TWO panels stacked: "Prompt Engineering Tips" (green/emerald header with lightbulb icon) at the top, and "AI Assistant" (chat panel) below
4. Verify the tips panel shows 6 numbered tips: Be Specific, Ask for Explanations, Focus on One Thing, Provide Context, Iterate and Refine, Ask for Strategies Not Answers
5. Click the tips panel header to collapse it
6. **Expected:** Tips content hides, only the header bar remains. Chat panel expands to fill the space.
7. Click the header again to expand
8. **Expected:** All 6 tips are visible again
9. Send multiple prompts in the chat
10. **Expected:** Unlimited prompting works (same as iterative mode)

### 4. Session resume preserves chat history

1. Using any active session from tests above that has at least one prompt+response exchange
2. Reload the browser page (Ctrl+R / Cmd+R)
3. **Expected:** The chat panel shows the previously sent prompts and AI responses — conversation history is restored from the database, not lost on reload
4. For single-shot mode: the input should still be disabled after reload (single-shot exhaustion persists)

### 5. Chat resets on sample advance

1. Using an iterative or scaffold session, send 2-3 prompts on the first sample
2. Submit the current sample via "Submit & Next Sample" in the editor
3. **Expected:** The chat panel is now empty — no messages from the previous sample. The input is enabled for new prompts on the new sample.
4. Send a prompt on the new sample
5. Reload the page
6. **Expected:** Only the prompt from the new sample appears — previous sample's conversation does not leak across samples

### 6. Prompt API data persistence

1. After completing test cases above, inspect the database directly:
   ```bash
   node -e "
     const Database = require('better-sqlite3');
     const db = new Database('sqlite.db');
     console.log('Prompts:', JSON.stringify(db.prepare('SELECT * FROM prompts ORDER BY id').all(), null, 2));
     console.log('AI Responses:', JSON.stringify(db.prepare('SELECT * FROM ai_responses ORDER BY id').all(), null, 2));
   "
   ```
2. **Expected:** Every prompt sent during testing has a row in `prompts` with correct `session_id`, `sample_id`, `content`, and auto-incrementing `prompt_number` (1, 2, 3... per session+sample pair). Every AI response has a row in `ai_responses` linked to its `prompt_id` with non-empty `content`.

### 7. Side-by-side layout structure

1. On any active editing phase, open browser DevTools (Elements tab)
2. Inspect the outer flex container
3. **Expected:** The editor is in a `flex-1 min-w-0` div, and the chat column is in a `w-[440px] flex-shrink-0 border-l` div. The layout fills the full viewport height.
4. Resize the browser window narrower
5. **Expected:** The editor compresses while the chat panel stays at 440px width (flex-shrink-0)

## Edge Cases

### Empty prompt submission
1. In the chat input, try submitting an empty message (press Enter with no text)
2. **Expected:** Nothing happens — the send button is disabled when input is empty

### Ollama not running
1. Stop Ollama (`pkill ollama` or equivalent)
2. Send a prompt in the chat panel
3. **Expected:** An inline red error message appears in the chat area (not a page crash). The error message mentions Ollama not being available.

### Very long prompt
1. Type a prompt longer than 500 characters
2. **Expected:** The prompt is accepted and sent successfully. The user bubble in chat displays the full text with proper wrapping.

### Rapid successive prompts (iterative mode)
1. In iterative mode, send a prompt and immediately type and send another before the first response finishes streaming
2. **Expected:** The first request should be aborted (AbortController), and the second prompt should process normally. No duplicate or corrupted messages.

### Invalid session ID in URL
1. Navigate to `/study/nonexistent-session-id`
2. **Expected:** Error screen with "Session not found" message and a link back to registration

## Failure Signals

- Chat panel not visible in editing phase — layout wiring broken
- AI response never appears after sending prompt — streaming or Ollama connection issue
- Single-shot mode allows second prompt — enforcement logic broken
- ScaffoldPanel not visible for scaffold group — conditional rendering broken
- Chat history empty after page reload — session GET API not returning messages
- Previous sample's messages appear after advancing — sampleId key not forcing remount
- `prompts` or `ai_responses` table empty after sending prompts — DB persistence broken (check save-before-close ordering)
- Page crash or white screen — check browser console for React errors

## Requirements Proved By This UAT

- R005 — Test cases 1-3 prove AI chat panel works with streaming advisory responses
- R006 — Test case 1 proves single-shot enforcement (disabled after one prompt, persists on resume per test 4)
- R007 — Test case 2 proves iterative mode with unlimited multi-turn conversation
- R008 — Test case 3 proves scaffold mode with instruction panel alongside chat
- R010 (partial) — Test case 6 proves prompt and AI response persistence for data logging

## Not Proven By This UAT

- R010 full data logging completeness — survey responses, time per sample, and computed metrics are S04 scope
- Advisory system prompt quality — this UAT verifies the AI responds, but whether responses are genuinely advisory (not copy-pastable rewrites) requires human judgment review of actual response content
- Concurrent multi-participant usage — all tests are single-participant sequential

## Notes for Tester

- Group assignment is balanced — you may need to register 2-3 participants to get each group type for testing. Check `GET /api/session/{sessionId}` to see the assigned group before walking through the full flow.
- Ollama's first response after cold start takes 60+ seconds. Wait patiently or pre-warm by running `ollama run llama3 "hello"` before testing.
- The chat textarea placeholder text ("No more prompts available", "Ask the AI for help…") is in HTML placeholder attributes — it won't appear in page text searches but is visible in the input field.
- ScaffoldPanel starts expanded by default. If you don't see the tips, you may have collapsed it in a prior visit — click the header to expand.
