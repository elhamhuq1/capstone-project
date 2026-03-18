---
estimated_steps: 5
estimated_files: 4
---

# T03: Integrate chat into study page layout and write verification script

**Slice:** S03 — AI Chat Panel + Mode Enforcement
**Milestone:** M001

## Description

Wire ChatPanel and ScaffoldPanel into the study flow page's editing phase, restructure the layout to side-by-side (editor left, chat right), extend the session GET API to return prompt/response history, and write the verification script that proves S03 works end-to-end. This is the integration task that makes the slice deliverable real.

## Steps

1. **Extend `GET /api/session/[sessionId]/route.ts`** — Add prompt/response history to the session API response. After loading the current sample and revisions, also call `getPromptsForSample(sessionId, currentSampleId)` and include the result in the response JSON as a `messages` array formatted as `Array<{ role: 'user' | 'assistant', content: string }>`. This is what the study page passes as `initialMessages` to ChatPanel for session resume.

   The current response shape is:
   ```json
   { "id", "participantId", "group", "status", "currentSampleIndex", "totalSamples", "sampleOrder", "currentSample", "revisions" }
   ```
   Add a `messages` field:
   ```json
   { ...existing, "messages": [{ "role": "user", "content": "..." }, { "role": "assistant", "content": "..." }, ...] }
   ```
   Build this by iterating `getPromptsForSample()` results: for each prompt, push `{ role: 'user', content: prompt.content }`, then if it has an aiResponse, push `{ role: 'assistant', content: prompt.aiResponse }`.

2. **Modify `src/app/study/[sessionId]/page.tsx`** — Change the editing phase to include the chat panel:
   - Update the `SessionData` interface to include `messages: Array<{ role: 'user' | 'assistant', content: string }>`.
   - Import `ChatPanel` and `ScaffoldPanel` from `@/components/`.
   - In the editing phase render block, replace the current single `<WritingEditor>` render with a side-by-side layout:
     ```
     <div className="flex min-h-screen flex-col">
       {/* Header bar — keep existing */}
       {/* Main content area */}
       <div className="flex flex-1">
         {/* Left: Editor (takes ~60% width) */}
         <div className="flex-1 min-w-0">
           <WritingEditor ... />
         </div>
         {/* Right: Chat panel + optional scaffold (~40% width) */}
         <div className="w-[440px] flex-shrink-0 border-l flex flex-col">
           {group === 'scaffold' && <ScaffoldPanel />}
           <ChatPanel
             key={sessionData.currentSample.id}  // Force remount on sample change
             sessionId={sessionId}
             sampleId={sessionData.currentSample.id}
             sampleContent={sessionData.currentSample.content}
             group={sessionData.group}
             initialMessages={sessionData.messages || []}
           />
         </div>
       </div>
     </div>
     ```
   - The `key={sampleId}` on ChatPanel is critical — it forces a full remount when the participant advances to the next sample, which clears local chat state and reloads from DB (empty for new sample).
   - **Important:** The WritingEditor currently renders its own header bar and wrapping layout. The restructuring must preserve the editor's header, textarea, action buttons, and revision sidebar. The simplest approach: keep `WritingEditor` self-contained and let the study page handle the outer side-by-side split. The header bar (sample title, progress dots) should move to the study page level so it spans both panels, or remain inside the editor — whichever is simpler.

3. **Ensure WritingEditor still works correctly** — After restructuring, the editor must still: save revisions, show revision history sidebar, submit-and-advance, display progress dots. The only change is that it's now constrained to a flex-1 container instead of full page width. The revision sidebar (`w-64`) should still be visible within the editor panel.

4. **Write `scripts/verify-s03.sh`** — Automated verification script (similar to verify-s02.sh). The script should:
   - Prereq: register a participant and begin the session (reuse verify-s02.sh pattern, or do fresh registration)
   - Check 1: `prompts` and `ai_responses` tables exist in sqlite.db
   - Check 2: POST `/api/session/{sessionId}/prompt` with `{ content: "Help me improve the grammar", sampleId: <currentSampleId> }` returns HTTP 200 with streaming text (check response is non-empty)
   - Check 3: After the prompt API call, a row exists in `prompts` table for this session
   - Check 4: After the prompt API call, a row exists in `ai_responses` table
   - Check 5: GET `/api/session/{sessionId}` includes a `messages` array with the prompt and response
   - Check 6: A second POST to the prompt API for the same sample creates a second prompt with promptNumber=2
   - Note: Browser-level checks (single-shot enforcement, scaffold panel visibility) are manual — the script covers API-level verification only.
   - If Ollama is not running, the script should detect the 503 and print a warning rather than failing — API structure can still be verified by checking table existence and request validation.

5. **Run `npm run build`** — Verify the full project compiles with all new components and modified pages.

## Must-Haves

- [ ] Session GET API returns `messages` array with prompt/response history for current sample
- [ ] Study page editing phase has side-by-side layout: editor left, chat right
- [ ] ChatPanel receives correct props: sessionId, sampleId, sampleContent, group, initialMessages
- [ ] ChatPanel uses `sampleId` as React key — remounts on sample change
- [ ] ScaffoldPanel rendered only for scaffold group
- [ ] WritingEditor functionality preserved: save, revision sidebar, submit-and-advance, progress dots
- [ ] `scripts/verify-s03.sh` exercises prompt API and verifies DB persistence
- [ ] `npm run build` exits 0

## Verification

- `bash scripts/verify-s03.sh` — all checks pass (with graceful degradation if Ollama is offline)
- `npm run build` exits 0
- Browser manual check: navigate to a study session in editing phase — editor and chat panel visible side-by-side
- Browser manual check: type a prompt, see streaming response
- Browser manual check: single-shot group — input disabled after one prompt
- Browser manual check: scaffold group — instruction panel visible above chat
- Browser manual check: reload page — chat history reappears from DB

## Observability Impact

- **New signal:** `GET /api/session/{sessionId}` response now includes a `messages` array — inspect this to verify prompt/response history is round-tripping correctly for session resume.
- **Layout inspection:** Study page editing phase renders a side-by-side flex layout. Browser DevTools → Elements panel: look for `flex flex-1` wrapper around WritingEditor and `w-[440px]` wrapper around ChatPanel.
- **Failure visibility:** If `getPromptsForSample()` throws, the GET route returns 500 with descriptive error — visible in network tab and server logs (`[session] GET error:`).
- **Verification script:** `scripts/verify-s03.sh` exercises the full prompt API flow and checks DB persistence. Gracefully degrades with a warning if Ollama is offline (503).
- **React key signal:** ChatPanel uses `key={sampleId}` — when sample changes, React DevTools shows a full remount (new component instance), confirming local state reset.

## Inputs

- T01 output: `src/lib/db/schema.ts` with prompts/aiResponses tables, `src/lib/db/queries.ts` with `savePrompt()`, `saveAiResponse()`, `getPromptsForSample()`, `src/app/api/session/[sessionId]/prompt/route.ts`
- T02 output: `src/components/ChatPanel.tsx`, `src/components/ScaffoldPanel.tsx`
- `src/app/study/[sessionId]/page.tsx` — current study flow page (will be modified)
- `src/app/api/session/[sessionId]/route.ts` — current session GET/POST handler (will be extended)
- `src/components/WritingEditor.tsx` — reference for existing layout (should NOT be modified unless minor adjustments needed for flex containment)
- `scripts/verify-s02.sh` — reference for verification script patterns

## Expected Output

- `src/app/api/session/[sessionId]/route.ts` — extended GET handler returning `messages` array
- `src/app/study/[sessionId]/page.tsx` — modified editing phase with side-by-side layout, ChatPanel, conditional ScaffoldPanel
- `scripts/verify-s03.sh` — automated verification script
- `npm run build` passes cleanly
