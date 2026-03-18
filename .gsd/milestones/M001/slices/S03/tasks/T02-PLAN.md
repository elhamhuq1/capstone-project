---
estimated_steps: 5
estimated_files: 2
---

# T02: Build ChatPanel and ScaffoldPanel components

**Slice:** S03 — AI Chat Panel + Mode Enforcement
**Milestone:** M001

## Description

Build the two client components that make up the chat UI: `ChatPanel` (the streaming AI chat with mode enforcement) and `ScaffoldPanel` (static prompt engineering tips for the scaffold group). These components are self-contained — they don't require study page integration yet (T03 handles that).

The ChatPanel is the core deliverable of S03, implementing R005 (AI chat), R006 (single-shot enforcement), R007 (iterative multi-turn), and the chat portion of R008 (scaffold = iterative + instruction panel). The ScaffoldPanel is a simple static component for R008's instruction panel.

## Steps

1. **Build `src/components/ChatPanel.tsx`** — 'use client' component with these props:
   ```typescript
   interface ChatPanelProps {
     sessionId: string;
     sampleId: number;
     sampleContent: string;  // For display context, actual AI context is built server-side
     group: string;           // 'single-shot' | 'iterative' | 'scaffold'
     initialMessages: Array<{ role: 'user' | 'assistant'; content: string }>;
   }
   ```

   Internal state:
   - `messages`: array of `{ role: 'user' | 'assistant', content: string }` — initialized from `initialMessages` prop
   - `input`: string — the current input field value
   - `isStreaming`: boolean — true while AI response is streaming
   - `promptCount`: number — computed from messages (count of user messages), or initialized from initialMessages length. Used for single-shot enforcement.

   Behavior:
   - **Send handler**: POST to `/api/session/${sessionId}/prompt` with `{ content: input, sampleId }`. Add the user message to `messages` immediately. Start streaming the response using the `getReader()` + `TextDecoder` pattern (same as test-chat page). Accumulate chunks into a growing assistant message displayed in the message list. When streaming finishes, the assistant message is complete. Increment `promptCount`.
   - **Single-shot enforcement**: When `group === 'single-shot'` and `promptCount >= 1`, disable the input field and send button. Show a subtle message like "You've used your one prompt for this sample."
   - **Iterative/scaffold**: No restrictions on `promptCount`. Standard multi-turn conversation.
   - **AbortController**: Create a new AbortController per request. Store in a ref. Abort on component unmount (useEffect cleanup). Abort previous request if a new one starts.
   - **Empty state**: When no messages exist, show a brief helper text like "Ask the AI for suggestions on improving this writing sample."
   - **Error handling**: If the fetch fails or returns non-200, show an error message in the chat area (not a JS alert).
   - **Scroll behavior**: The message list should auto-scroll to the bottom as new chunks stream in. Use a ref on the message container and `scrollTop = scrollHeight` after state updates.

   UI layout (vertical within its container):
   - Message list (scrollable, flex-1): alternating user/assistant messages with distinct styling. User messages right-aligned or with a different background. Assistant messages left-aligned with a subtle background.
   - Input area (bottom): a textarea (or input) + send button. The textarea should submit on Enter (but Shift+Enter for newline). Disabled state for single-shot.

2. **Build `src/components/ScaffoldPanel.tsx`** — 'use client' component (needs useState for collapsible sections). No props required (static content). Content: numbered prompt engineering tips with brief examples. Structure:
   - Title: "Prompt Engineering Tips"
   - A collapsible wrapper (default: expanded)
   - Tips as a numbered list, each with a short title and 1-2 sentence explanation. Example tips:
     1. **Be Specific** — Instead of "help me improve this," say "identify grammar errors in the second paragraph."
     2. **Ask for Explanations** — Say "explain why this sentence is awkward" to understand the issue, not just fix it.
     3. **Focus on One Thing** — Address one type of issue at a time (grammar, then clarity, then structure).
     4. **Provide Context** — Tell the AI what kind of writing this is (essay, email, report) and who the audience is.
     5. **Iterate and Refine** — Use follow-up prompts to dig deeper: "Can you give me more detail on point #2?"
     6. **Ask for Strategies, Not Answers** — Say "how can I make this paragraph more concise?" instead of "rewrite this paragraph."
   - The panel should have a compact, card-like design that doesn't dominate the screen. Collapsible to save vertical space.

3. **Ensure both components compile** — Run `npm run build` to verify no TypeScript errors.

4. **Style both components with Tailwind** — Match the existing design language: stone/zinc colors for light/dark mode, rounded borders, subtle shadows (consistent with WritingEditor and InstructionsScreen).

5. **Handle the streaming edge case** — When the component unmounts mid-stream (user advances to next sample), the AbortController must cancel the in-flight request. The `finally` block in the streaming loop should check a mounted ref before updating state to avoid React warnings.

## Must-Haves

- [ ] ChatPanel renders a message list with distinct user/assistant styling
- [ ] ChatPanel streams AI responses in real-time using getReader + TextDecoder
- [ ] ChatPanel sends prompts to POST `/api/session/{sessionId}/prompt` with `{ content, sampleId }`
- [ ] Single-shot mode: input disabled after one prompt, with a visible explanation message
- [ ] Iterative/scaffold modes: unlimited prompts, conversation context builds
- [ ] AbortController cancels in-flight request on component unmount
- [ ] ChatPanel accepts and renders `initialMessages` for session resume
- [ ] ScaffoldPanel renders numbered prompt engineering tips with a collapsible wrapper
- [ ] Both components use Tailwind CSS consistent with existing design language
- [ ] `npm run build` passes with both components

## Verification

- `npm run build` exits 0 — both components compile without TypeScript errors
- Code review: ChatPanel has `promptCount` tracking and disables input when `group === 'single-shot'` and `promptCount >= 1`
- Code review: ChatPanel has AbortController in useEffect cleanup
- Code review: ChatPanel renders `initialMessages` on mount
- Code review: ScaffoldPanel has collapsible UI with 5+ numbered tips

## Inputs

- T01 output: POST `/api/session/[sessionId]/prompt` route is available and returns streaming text
- `src/app/test-chat/page.tsx` — reference for the streaming fetch pattern (getReader + TextDecoder + AbortController). Do NOT modify this file. Copy the pattern into ChatPanel.
- Existing component design patterns from `src/components/WritingEditor.tsx` and `src/components/InstructionsScreen.tsx` — match their Tailwind styling approach (stone/zinc colors, rounded-xl borders, shadow-sm)

## Observability Impact

- **ChatPanel streaming**: Console logs on fetch errors (non-200 status, network failure). Error messages rendered in-UI so users and testers see failures without devtools. AbortController cancellation on unmount prevents orphaned streams.
- **Single-shot enforcement**: `promptCount` state visible via React DevTools. Disabled input + explanation message are the observable signal that enforcement is active.
- **ScaffoldPanel**: Pure static UI — no runtime signals. Collapse state is local useState.
- **Inspection**: Browser DevTools Network tab shows POST to `/api/session/{sessionId}/prompt` with streaming response. React DevTools shows `messages`, `promptCount`, `isStreaming` state on ChatPanel.
- **Failure visibility**: Fetch errors display inline in the chat area with the error message. Non-200 API responses parsed and shown to user. AbortError silently ignored (expected on unmount).

## Expected Output

- `src/components/ChatPanel.tsx` — complete streaming chat component with mode enforcement
- `src/components/ScaffoldPanel.tsx` — static prompt engineering tips component with collapsible UI
