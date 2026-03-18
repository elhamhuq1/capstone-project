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
    const isConnectionError =
      message.includes('ECONNREFUSED') || message.includes('fetch failed');
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
