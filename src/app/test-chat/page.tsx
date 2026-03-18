'use client';

import { useState, useRef, useCallback } from 'react';

export default function TestChatPage() {
  const [userMessage, setUserMessage] = useState('');
  const [writingSample, setWritingSample] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  const handleSend = useCallback(async () => {
    if (!userMessage.trim()) return;

    // Reset state
    setResponse('');
    setError('');
    setIsLoading(true);

    // Abort any previous request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: userMessage }],
          ...(writingSample.trim() ? { writingSample: writingSample.trim() } : {}),
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        // API returned an error (400, 503, 500)
        const data = await res.json();
        setError(data.error || `Request failed with status ${res.status}`);
        setIsLoading(false);
        return;
      }

      if (!res.body) {
        setError('No response body received');
        setIsLoading(false);
        return;
      }

      // Stream the response
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;
        setResponse(accumulated);
        setIsLoading(false); // First chunk arrived — no longer "loading"
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [userMessage, writingSample]);

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Test Chat — Advisory Proof
        </h1>
        <p className="text-sm text-gray-500">
          Proof page for the Ollama streaming advisory pipeline. Enter a prompt
          to test advisory behavior.
        </p>

        {/* User Message */}
        <div>
          <label
            htmlFor="user-message"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Your message
          </label>
          <textarea
            id="user-message"
            rows={4}
            className="w-full rounded-md border border-gray-300 p-3 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="e.g. Help me improve this sentence: The dog was very big and it was running fast."
            value={userMessage}
            onChange={(e) => setUserMessage(e.target.value)}
          />
        </div>

        {/* Optional Writing Sample */}
        <div>
          <label
            htmlFor="writing-sample"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Writing sample{' '}
            <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <textarea
            id="writing-sample"
            rows={3}
            className="w-full rounded-md border border-gray-300 p-3 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="Paste a writing sample for context-specific feedback..."
            value={writingSample}
            onChange={(e) => setWritingSample(e.target.value)}
          />
        </div>

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={isLoading || !userMessage.trim()}
          className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? 'Waiting for response…' : 'Send'}
        </button>

        {/* Error Display */}
        {error && (
          <div
            role="alert"
            className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-700"
          >
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Streaming Response Display */}
        {(response || isLoading) && (
          <div className="rounded-md border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="mb-2 text-sm font-semibold text-gray-600">
              Response
            </h2>
            {isLoading && !response && (
              <p className="animate-pulse text-sm text-gray-400">
                Waiting for first chunk…
              </p>
            )}
            <pre className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
              {response}
            </pre>
          </div>
        )}
      </div>
    </main>
  );
}
