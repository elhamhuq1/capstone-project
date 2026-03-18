---
estimated_steps: 7
estimated_files: 3
---

# T02: Install Ollama, build chat helper with advisory system prompt, and create streaming API route

**Slice:** S01 — Project Foundation + Ollama AI Proof
**Milestone:** M001

## Description

Install Ollama on the host machine, pull the Llama 3 8B model, then build the three core integration files: the Ollama chat helper (`src/lib/ollama.ts`), the advisory system prompt (`src/lib/prompts.ts`), and the streaming API route (`src/app/api/chat/route.ts`). The API route is the primary artifact consumed by S02–S05 — it's the boundary contract between the frontend and the AI backend. The advisory system prompt is the highest-risk artifact — it must enforce R005 (guidance by default, corrections only when explicitly asked).

**Critical constraint:** Ollama is NOT currently installed on this machine. It must be installed via `curl -fsSL https://ollama.com/install.sh | sh` and the `llama3` model must be pulled (~4.7GB download) before integration testing can proceed.

## Steps

1. **Install Ollama.** Run:
   ```bash
   curl -fsSL https://ollama.com/install.sh | sh
   ```
   This may require sudo. After installation, verify Ollama is running:
   ```bash
   ollama --version
   curl -s http://localhost:11434/api/tags
   ```
   If Ollama isn't serving (systemd didn't auto-start), run `ollama serve &` in the background.

2. **Pull Llama 3 8B model.** Run:
   ```bash
   ollama pull llama3
   ```
   This downloads ~4.7GB. Verify with `curl -s http://localhost:11434/api/tags | grep llama3`.

3. **Create `src/lib/ollama.ts`** — the Ollama chat helper:
   ```typescript
   import { Ollama } from 'ollama';
   
   const ollama = new Ollama({ host: 'http://localhost:11434' });
   
   export interface ChatMessage {
     role: 'system' | 'user' | 'assistant';
     content: string;
   }
   
   export async function chatWithOllama(
     messages: ChatMessage[],
     systemPrompt: string,
     model: string = 'llama3'
   ) {
     const fullMessages: ChatMessage[] = [
       { role: 'system', content: systemPrompt },
       ...messages,
     ];
     
     const response = await ollama.chat({
       model,
       messages: fullMessages,
       stream: true,
     });
     
     return response; // AsyncGenerator
   }
   ```
   The function prepends the system prompt and returns the streaming AsyncGenerator from the `ollama` npm package. Callers iterate with `for await (const chunk of response)`.

4. **Create `src/lib/prompts.ts`** — the advisory system prompt (R005):
   ```typescript
   export const ADVISORY_SYSTEM_PROMPT = `You are a writing advisor helping a student improve their essay. Your role is to guide, not to do the work for them.

   When the student asks for help with their writing:
   - Identify specific issues (grammar, clarity, structure, word choice, flow)
   - Explain WHY each issue is problematic
   - Suggest strategies or approaches for improvement
   - Use examples from their text to illustrate points, but do not rewrite their sentences

   IMPORTANT: Do NOT provide corrected sentences, rewritten paragraphs, or ready-to-paste text unless the student explicitly asks you to "rewrite," "correct," "fix," or "give me the exact wording." Your default is to teach and guide, not to edit.

   If a writing sample is provided below, reference it specifically in your feedback.
   `;
   ```
   This prompt may need iteration in T03 after testing with real model responses. The key constraint: advisory by default, corrections only on explicit request.

5. **Create `src/app/api/chat/route.ts`** — the streaming POST handler:
   ```typescript
   import { NextRequest, NextResponse } from 'next/server';
   import { chatWithOllama, ChatMessage } from '@/lib/ollama';
   import { ADVISORY_SYSTEM_PROMPT } from '@/lib/prompts';

   export async function POST(request: NextRequest) {
     try {
       const body = await request.json();
       const { messages, writingSample } = body as {
         messages: ChatMessage[];
         writingSample?: string;
       };

       if (!messages || !Array.isArray(messages) || messages.length === 0) {
         return NextResponse.json(
           { error: 'messages array is required and must not be empty' },
           { status: 400 }
         );
       }

       let systemPrompt = ADVISORY_SYSTEM_PROMPT;
       if (writingSample) {
         systemPrompt += `\n\nThe student is working on the following writing sample:\n---\n${writingSample}\n---`;
       }

       const stream = await chatWithOllama(messages, systemPrompt);

       const readableStream = new ReadableStream({
         async start(controller) {
           const encoder = new TextEncoder();
           try {
             for await (const chunk of stream) {
               controller.enqueue(encoder.encode(chunk.message.content));
             }
           } catch (err) {
             controller.error(err);
           } finally {
             controller.close();
           }
         },
       });

       return new Response(readableStream, {
         headers: { 'Content-Type': 'text/plain; charset=utf-8' },
       });
     } catch (error: unknown) {
       const message = error instanceof Error ? error.message : 'Unknown error';
       const isConnectionError = message.includes('ECONNREFUSED') || message.includes('fetch failed');
       return NextResponse.json(
         {
           error: isConnectionError
             ? 'Ollama is not running. Start it with: ollama serve'
             : `Chat error: ${message}`,
         },
         { status: isConnectionError ? 503 : 500 }
       );
     }
   }
   ```
   Key design: connection errors return 503 with helpful message, not a crash. The `writingSample` parameter is optional — when provided, it's appended to the system prompt so the AI has context.

6. **Verify with curl.** With `npm run dev` running and Ollama serving:
   ```bash
   curl -X POST http://localhost:3000/api/chat \
     -H 'Content-Type: application/json' \
     -d '{"messages":[{"role":"user","content":"Help me improve this sentence: The dog was very big and it was running fast."}]}'
   ```
   Expected: streaming text response with advisory guidance (identifies vague adjectives, suggests more specific word choices, does NOT rewrite the sentence).

7. **Test error handling.** Stop Ollama temporarily and verify the API returns a clear JSON error:
   ```bash
   # Stop ollama, then:
   curl -X POST http://localhost:3000/api/chat \
     -H 'Content-Type: application/json' \
     -d '{"messages":[{"role":"user","content":"test"}]}'
   # Should return: {"error":"Ollama is not running. Start it with: ollama serve"}
   # Restart ollama after test
   ```

## Must-Haves

- [ ] Ollama installed and running on localhost:11434
- [ ] Llama 3 8B model pulled and available
- [ ] `src/lib/ollama.ts` exports `chatWithOllama()` with streaming AsyncGenerator return
- [ ] `src/lib/prompts.ts` exports `ADVISORY_SYSTEM_PROMPT` enforcing advisory-by-default behavior
- [ ] `src/app/api/chat/route.ts` POST handler streams Ollama responses and handles errors gracefully
- [ ] API route accepts optional `writingSample` and appends it to system prompt context
- [ ] Connection errors return 503 JSON, not a server crash

## Verification

- `curl http://localhost:11434/api/tags` shows `llama3` in the response
- `curl -X POST http://localhost:3000/api/chat -H 'Content-Type: application/json' -d '{"messages":[{"role":"user","content":"Help me improve this sentence: The dog was very big and it was running fast."}]}'` returns streaming advisory text
- With Ollama stopped: same curl returns `{"error":"Ollama is not running..."}` with status 503

## Observability Impact

- Signals added: console error logs when Ollama connection fails; JSON error response with descriptive message
- How a future agent inspects this: `curl http://localhost:11434/api/tags` for Ollama health; `curl` to `/api/chat` for endpoint health
- Failure state exposed: 503 status + JSON error body when Ollama is unreachable; 400 for invalid request body

## Inputs

- Working Next.js project from T01 (scaffold, dependencies installed, `package.json` has `ollama` package)
- `src/lib/db/` exists (from T01) — not directly used here but confirms project structure
- Internet access for Ollama installation and model download

## Expected Output

- Ollama installed and serving on localhost:11434 with `llama3` model
- `src/lib/ollama.ts` — chat helper wrapping the `ollama` npm package
- `src/lib/prompts.ts` — advisory system prompt constant
- `src/app/api/chat/route.ts` — streaming POST handler with error handling
