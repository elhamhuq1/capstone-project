'use client';

import { useState, useRef, useEffect, useCallback, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';

const markdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="mb-2 mt-4 text-base font-bold first:mt-0">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-2 mt-3 text-sm font-bold first:mt-0">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-1.5 mt-3 text-sm font-semibold first:mt-0">{children}</h3>
  ),
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  ul: ({ children }) => (
    <ul className="mb-2 ml-4 list-disc space-y-1 last:mb-0">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-2 ml-4 list-decimal space-y-1 last:mb-0">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => (
    <strong className="font-semibold">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  code: ({ children, className }) => {
    const isBlock = className?.includes('language-');
    if (isBlock) {
      return (
        <code className="block overflow-x-auto rounded-md bg-stone-100 p-3 text-xs dark:bg-zinc-900">
          {children}
        </code>
      );
    }
    return (
      <code className="rounded bg-stone-100 px-1 py-0.5 text-xs dark:bg-zinc-900">
        {children}
      </code>
    );
  },
  pre: ({ children }) => <pre className="mb-2 last:mb-0">{children}</pre>,
  blockquote: ({ children }) => (
    <blockquote className="mb-2 border-l-2 border-stone-300 pl-3 italic text-stone-600 last:mb-0 dark:border-zinc-600 dark:text-zinc-400">
      {children}
    </blockquote>
  ),
  hr: () => (
    <hr className="my-3 border-stone-200 dark:border-zinc-700" />
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 underline hover:text-blue-700 dark:text-blue-400"
    >
      {children}
    </a>
  ),
  table: ({ children }) => (
    <div className="mb-2 overflow-x-auto last:mb-0">
      <table className="min-w-full text-xs">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border-b border-stone-300 px-2 py-1 text-left font-semibold dark:border-zinc-600">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-b border-stone-200 px-2 py-1 dark:border-zinc-700">
      {children}
    </td>
  ),
};

// Strip LaTeX math delimiters and convert common LaTeX symbols to Unicode
function sanitizeLatex(text: string): string {
  // Remove $...$ wrappers
  let result = text.replace(/\$([^$]+)\$/g, (_, inner: string) => inner);
  // Common LaTeX symbols → Unicode
  result = result.replace(/\\rightarrow/g, '→');
  result = result.replace(/\\leftarrow/g, '←');
  result = result.replace(/\\leftrightarrow/g, '↔');
  result = result.replace(/\\Rightarrow/g, '⇒');
  result = result.replace(/\\Leftarrow/g, '⇐');
  result = result.replace(/\\times/g, '×');
  result = result.replace(/\\div/g, '÷');
  result = result.replace(/\\neq/g, '≠');
  result = result.replace(/\\leq/g, '≤');
  result = result.replace(/\\geq/g, '≥');
  result = result.replace(/\\approx/g, '≈');
  result = result.replace(/\\infty/g, '∞');
  result = result.replace(/\\pm/g, '±');
  result = result.replace(/\\cdot/g, '·');
  result = result.replace(/\\ldots/g, '…');
  result = result.replace(/\\mdash/g, '—');
  result = result.replace(/\\ndash/g, '–');
  return result;
}

const MarkdownMessage = memo(function MarkdownMessage({ content }: { content: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
      {sanitizeLatex(content)}
    </ReactMarkdown>
  );
});

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatPanelProps {
  sessionId: string;
  sampleId: number;
  sampleContent: string;
  group: string; // 'single-shot' | 'iterative' | 'scaffold'
  initialMessages: Message[];
}

export default function ChatPanel({
  sessionId,
  sampleId,
  sampleContent: _sampleContent,
  group,
  initialMessages,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState('');

  // promptCount = number of user messages (from initial + newly sent)
  const [promptCount, setPromptCount] = useState(
    () => initialMessages.filter((m) => m.role === 'user').length
  );

  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Track mounted state for safe state updates after async
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const isSingleShotExhausted = group === 'single-shot' && promptCount >= 1;
  const isInputDisabled = isStreaming || isSingleShotExhausted;

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isInputDisabled) return;

    // Abort any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    // Optimistically add user message
    const userMessage: Message = { role: 'user', content: trimmed };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setError('');
    setIsStreaming(true);

    try {
      const res = await fetch(`/api/session/${sessionId}/prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: trimmed, sampleId }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: `Request failed (${res.status})` }));
        if (mountedRef.current) {
          setError(data.error || `Request failed with status ${res.status}`);
          setIsStreaming(false);
        }
        return;
      }

      if (!res.body) {
        if (mountedRef.current) {
          setError('No response body received');
          setIsStreaming(false);
        }
        return;
      }

      // Stream the response
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      // Add placeholder assistant message
      if (mountedRef.current) {
        setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);
      }

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          accumulated += chunk;

          if (mountedRef.current) {
            const text = accumulated;
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = { role: 'assistant', content: text };
              return updated;
            });
          }
        }
      } finally {
        if (mountedRef.current) {
          // Finalize: ensure the last message has the full text
          if (accumulated) {
            const finalText = accumulated;
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = { role: 'assistant', content: finalText };
              return updated;
            });
          }
          setPromptCount((c) => c + 1);
          setIsStreaming(false);
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        if (mountedRef.current) setIsStreaming(false);
        return;
      }
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
        setIsStreaming(false);
      }
    }
  }, [input, isInputDisabled, sessionId, sampleId]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-full flex-col rounded-xl border border-stone-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      {/* ─── Header ─── */}
      <div className="flex items-center gap-2 border-b border-stone-200 px-4 py-3 dark:border-zinc-800">
        <svg
          className="h-4 w-4 text-stone-500 dark:text-zinc-400"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 0 1 1.037-.443 48.2 48.2 0 0 0 5.024-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"
          />
        </svg>
        <h2 className="text-sm font-semibold text-stone-800 dark:text-zinc-200">
          AI Assistant
        </h2>
        {isStreaming && (
          <span className="ml-auto text-xs text-blue-600 dark:text-blue-400">
            <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
            Responding…
          </span>
        )}
      </div>

      {/* ─── Messages area ─── */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-4 py-4"
        style={{ minHeight: '200px' }}
      >
        {messages.length === 0 && !error ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-center text-sm text-stone-400 dark:text-zinc-500">
              Ask the AI for suggestions on improving this writing sample.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white dark:bg-blue-700'
                      : 'border border-stone-200 bg-stone-50 text-stone-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <>
                      {msg.content ? (
                        <div className="prose-chat">
                          <MarkdownMessage content={msg.content} />
                        </div>
                      ) : isStreaming ? (
                        <span className="inline-block animate-pulse text-stone-400 dark:text-zinc-500">
                          Thinking…
                        </span>
                      ) : null}
                    </>
                  )}
                </div>
              </div>
            ))}

            {/* Error display inline */}
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
                <strong>Error:</strong> {error}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* ─── Single-shot exhausted notice ─── */}
      {isSingleShotExhausted && (
        <div className="border-t border-stone-200 px-4 py-2.5 dark:border-zinc-800">
          <p className="text-center text-xs text-amber-700 dark:text-amber-400">
            You&apos;ve used your one prompt for this sample.
          </p>
        </div>
      )}

      {/* ─── Input area ─── */}
      <div className="border-t border-stone-200 px-4 py-3 dark:border-zinc-800">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isInputDisabled}
            rows={1}
            placeholder={
              isSingleShotExhausted
                ? 'No more prompts available'
                : 'Ask the AI for help…'
            }
            className="flex-1 resize-none rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 placeholder-stone-400 shadow-sm transition-colors focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:placeholder-zinc-500 dark:focus:border-blue-500 dark:focus:ring-blue-900/40 dark:disabled:bg-zinc-800"
            aria-label="Chat message input"
          />
          <button
            onClick={handleSend}
            disabled={isInputDisabled || !input.trim()}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-700 dark:hover:bg-blue-600"
            aria-label="Send message"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
