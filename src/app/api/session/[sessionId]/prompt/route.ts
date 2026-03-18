import { NextRequest, NextResponse } from 'next/server';
import { getSession, getWritingSample, savePrompt, saveAiResponse, getPromptsForSample } from '@/lib/db/queries';
import { chatWithOllama, ChatMessage } from '@/lib/ollama';
import { ADVISORY_SYSTEM_PROMPT } from '@/lib/prompts';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    // Parse and validate body
    const body = await request.json();
    const { content, sampleId } = body as { content: string; sampleId: number };

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'content must be a non-empty string' },
        { status: 400 }
      );
    }

    if (sampleId === undefined || typeof sampleId !== 'number') {
      return NextResponse.json(
        { error: 'sampleId must be a number' },
        { status: 400 }
      );
    }

    // Verify session exists
    const session = await getSession(sessionId);
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Get writing sample content for AI context
    const sample = await getWritingSample(sampleId);
    const sampleContent = sample?.content ?? '';

    // Save prompt to DB
    const promptRow = await savePrompt(sessionId, sampleId, content.trim());

    // Build conversation history from prior prompts+responses
    const priorPrompts = await getPromptsForSample(sessionId, sampleId);
    const messages: ChatMessage[] = [];

    for (const p of priorPrompts) {
      // Skip the current prompt — we'll add it as the final user message
      if (p.id === promptRow.id) continue;

      messages.push({ role: 'user', content: p.content });
      if (p.aiResponse) {
        messages.push({ role: 'assistant', content: p.aiResponse });
      }
    }

    // Add the current user message
    messages.push({ role: 'user', content: content.trim() });

    // Build system prompt with writing sample context
    let systemPrompt = ADVISORY_SYSTEM_PROMPT;
    if (sampleContent) {
      systemPrompt += `\n\nThe student is working on the following writing sample:\n---\n${sampleContent}\n---`;
    }

    // Call Ollama and stream response
    const stream = await chatWithOllama(messages, systemPrompt);

    let accumulatedText = '';

    const readableStream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of stream) {
            const text = chunk.message.content;
            accumulatedText += text;
            controller.enqueue(encoder.encode(text));
          }
        } catch (err) {
          // Accumulate whatever we got before the error
          controller.error(err);
        } finally {
          // Save the accumulated response BEFORE closing the stream
          // (closing the stream can trigger connection teardown which may abort pending awaits)
          if (accumulatedText.length > 0) {
            try {
              await saveAiResponse(promptRow.id, accumulatedText);
            } catch {
              // DB save failure after stream — log but don't crash
              console.error('Failed to save AI response to DB for prompt', promptRow.id);
            }
          }
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const isConnectionError =
      message.includes('ECONNREFUSED') || message.includes('fetch failed');
    return NextResponse.json(
      {
        error: isConnectionError
          ? 'Ollama is not running. Start it with: ollama serve'
          : `Prompt error: ${message}`,
      },
      { status: isConnectionError ? 503 : 500 }
    );
  }
}
