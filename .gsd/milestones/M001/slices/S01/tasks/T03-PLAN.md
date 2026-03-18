---
estimated_steps: 5
estimated_files: 2
---

# T03: Build test-chat proof page and validate advisory behavior end-to-end

**Slice:** S01 — Project Foundation + Ollama AI Proof
**Milestone:** M001

## Description

Create the browser-facing proof that the entire integration chain works: user types a prompt into a page at `/test-chat`, the page calls `/api/chat` with streaming fetch, and advisory text from real Llama 3 8B appears word-by-word. This task also validates the advisory system prompt (R005) by testing with diverse inputs — confirming the model gives guidance for general requests but provides corrections when explicitly asked. If the system prompt is too weak, iterate on it until the behavior is correct.

This is the slice's definition of done. Without this task, we have untested code — with it, we have proven integration.

## Steps

1. **Create `src/app/test-chat/page.tsx`** as a client component (`'use client'`):
   - A `<textarea>` for the user's message (prompt input)
   - An optional `<textarea>` for pasting a writing sample (sent as `writingSample` in the API call)
   - A "Send" button that POSTs to `/api/chat` with `{ messages: [{ role: 'user', content: userMessage }], writingSample }`
   - A response display area (`<pre>` or `<div>`) that shows streaming text as it arrives
   - A loading indicator while waiting for the first chunk
   - Use `fetch` with `response.body.getReader()` and `TextDecoder` to read the streaming response chunk-by-chunk and append to the display
   - Basic Tailwind styling — clean, readable, functional (not polished UI — this is a proof page)
   - Display an error message if the API returns an error (e.g., Ollama not running)

2. **Test advisory behavior — general help request.** With the dev server and Ollama running, navigate to `http://localhost:3000/test-chat`. Enter a prompt like:
   > "Help me improve this sentence: The dog was very big and it was running fast."
   
   **Expected:** The model identifies vague/weak language ("very big", "running fast"), explains why these are weak, and suggests strategies (use specific adjectives, show-don't-tell, vary sentence structure). It should NOT provide a corrected version of the sentence.

3. **Test advisory behavior — structural/organization question.** Enter:
   > "I wrote a paragraph about climate change but it feels disorganized. The paragraph starts with effects, then jumps to causes, then back to effects. How can I improve the structure?"
   
   **Expected:** Guidance on paragraph organization strategies (topic sentence, logical flow, cause→effect ordering). NOT a rewritten paragraph.

4. **Test advisory behavior — explicit rewrite request.** Enter:
   > "Please rewrite this sentence to be more descriptive: The dog was very big and it was running fast."
   
   **Expected:** The model SHOULD provide a corrected/rewritten sentence because the user explicitly asked for a rewrite. This tests the escalation behavior.

5. **Iterate on system prompt if needed.** If the model violates advisory constraints in steps 2-3 (volunteers corrections without being asked), edit `src/lib/prompts.ts` to strengthen the prompt. Common fixes:
   - Add reinforcement phrases: "Remember: your role is to guide, not to write for the student"
   - Add explicit negative examples: "BAD: Here's a better version: [corrected text]. GOOD: Consider using more specific adjectives instead of 'very big'..."
   - Test again after each change until behavior is correct
   
   Document the final system prompt state. The prompt is correct when: general help → guidance only; explicit rewrite request → corrections provided.

## Must-Haves

- [ ] `/test-chat` page renders and accepts user input
- [ ] Streaming response displays word-by-word as chunks arrive from the API
- [ ] Error state displayed when Ollama is unavailable
- [ ] Advisory behavior validated: general help requests produce guidance, not corrections
- [ ] Escalation behavior validated: explicit rewrite requests produce corrected text
- [ ] System prompt in `src/lib/prompts.ts` is finalized and produces correct advisory behavior

## Verification

- Navigate to `http://localhost:3000/test-chat` — page renders with input area, optional writing sample area, and send button
- Submit "Help me improve this sentence: The dog was very big and it was running fast." — streaming response appears with advisory guidance (no corrected sentence volunteered)
- Submit "Please rewrite this sentence to be more descriptive: The dog was very big and it was running fast." — response includes a rewritten sentence (escalation works)
- Stop Ollama, submit any prompt — error message displayed (not a blank screen or crash)
- `npm run build` still succeeds with the new page added

## Observability Impact

- **New surface:** `/test-chat` page — interactive browser proof of the full streaming pipeline
- **Inspection:** Navigate to `http://localhost:3000/test-chat` to test advisory behavior interactively; browser DevTools Network tab shows streaming `text/plain` response from `/api/chat`
- **Failure visibility:** Error banner renders on-page when Ollama is unreachable (not a blank screen); browser console logs streaming errors
- **System prompt state:** `src/lib/prompts.ts` is the single source of truth for advisory behavior — changes here directly affect model output

## Inputs

- Working `/api/chat` endpoint from T02 (streaming, advisory system prompt, error handling)
- Ollama running with `llama3` model from T02
- Next.js project scaffold from T01

## Expected Output

- `src/app/test-chat/page.tsx` — functional proof page with streaming response display
- `src/lib/prompts.ts` — possibly updated with strengthened advisory prompt (if iteration was needed)
- Confirmed: the full chain (browser → API route → Ollama → streaming response) works end-to-end with correct advisory behavior
