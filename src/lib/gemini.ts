import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function* chatWithGemini(
  messages: ChatMessage[],
  systemPrompt: string,
  model: string = 'gemini-2.5-flash'
): AsyncGenerator<{ message: { content: string } }> {
  const geminiModel = genAI.getGenerativeModel({
    model,
    systemInstruction: systemPrompt,
  });

  // Convert messages to Gemini format (no system role — that's systemInstruction)
  const history = messages.slice(0, -1).map((msg) => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }));

  const lastMessage = messages[messages.length - 1];

  const chat = geminiModel.startChat({ history });

  const result = await chat.sendMessageStream(lastMessage.content);

  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) {
      yield { message: { content: text } };
    }
  }
}
