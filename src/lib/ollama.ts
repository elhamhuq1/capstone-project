// AI provider abstraction — currently using Gemini, previously Ollama
// All existing imports of chatWithOllama and ChatMessage continue to work

export { type ChatMessage, chatWithGemini as chatWithOllama } from './gemini';
