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
