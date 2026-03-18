'use client';

import { useState, useRef, useEffect, useCallback, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';

const markdownComponents: Components = {
  h1: ({ children }) => <h1 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '8px', marginTop: '16px' }}>{children}</h1>,
  h2: ({ children }) => <h2 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '8px', marginTop: '12px' }}>{children}</h2>,
  h3: ({ children }) => <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '6px', marginTop: '12px' }}>{children}</h3>,
  p: ({ children }) => <p style={{ marginBottom: '8px', marginTop: 0 }}>{children}</p>,
  ul: ({ children }) => <ul style={{ marginBottom: '8px', marginLeft: '16px', listStyle: 'disc', marginTop: 0 }}>{children}</ul>,
  ol: ({ children }) => <ol style={{ marginBottom: '8px', marginLeft: '16px', listStyle: 'decimal', marginTop: 0 }}>{children}</ol>,
  li: ({ children }) => <li style={{ lineHeight: 1.6 }}>{children}</li>,
  strong: ({ children }) => <strong style={{ fontWeight: 600 }}>{children}</strong>,
  em: ({ children }) => <em style={{ fontStyle: 'italic' }}>{children}</em>,
  code: ({ children }) => <code style={{ backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '3px', padding: '1px 5px', fontSize: '13px' }}>{children}</code>,
  blockquote: ({ children }) => <blockquote style={{ borderLeft: '2px solid rgba(244,242,237,0.3)', paddingLeft: '12px', fontStyle: 'italic', opacity: 0.8 }}>{children}</blockquote>,
  a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: '#D4C17A', textDecoration: 'underline' }}>{children}</a>,
};

function sanitizeLatex(text: string): string {
  let result = text.replace(/\$([^$]+)\$/g, (_, inner: string) => inner);
  result = result.replace(/\\rightarrow/g, '→').replace(/\\leftarrow/g, '←')
    .replace(/\\times/g, '×').replace(/\\div/g, '÷').replace(/\\neq/g, '≠')
    .replace(/\\leq/g, '≤').replace(/\\geq/g, '≥').replace(/\\approx/g, '≈')
    .replace(/\\infty/g, '∞').replace(/\\pm/g, '±').replace(/\\ldots/g, '…');
  return result;
}

const MarkdownMessage = memo(function MarkdownMessage({ content }: { content: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
      {sanitizeLatex(content)}
    </ReactMarkdown>
  );
});

interface Message { role: 'user' | 'assistant'; content: string; }

interface ChatPanelProps {
  sessionId: string;
  sampleId: number;
  sampleContent: string;
  group: string;
  initialMessages: Message[];
}

export default function ChatPanel({ sessionId, sampleId, sampleContent: _sampleContent, group, initialMessages }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState('');
  const [promptCount, setPromptCount] = useState(() => initialMessages.filter((m) => m.role === 'user').length);

  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; abortRef.current?.abort(); };
  }, []);

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

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setMessages((prev) => [...prev, { role: 'user', content: trimmed }]);
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
        if (mountedRef.current) { setError(data.error || `Request failed with status ${res.status}`); setIsStreaming(false); }
        return;
      }

      if (!res.body) {
        if (mountedRef.current) { setError('No response body received'); setIsStreaming(false); }
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      if (mountedRef.current) setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulated += decoder.decode(value, { stream: true });
          if (mountedRef.current) {
            const text = accumulated;
            setMessages((prev) => { const updated = [...prev]; updated[updated.length - 1] = { role: 'assistant', content: text }; return updated; });
          }
        }
      } finally {
        if (mountedRef.current) {
          if (accumulated) {
            const finalText = accumulated;
            setMessages((prev) => { const updated = [...prev]; updated[updated.length - 1] = { role: 'assistant', content: finalText }; return updated; });
          }
          setPromptCount((c) => c + 1);
          setIsStreaming(false);
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') { if (mountedRef.current) setIsStreaming(false); return; }
      if (mountedRef.current) { setError(err instanceof Error ? err.message : 'An unexpected error occurred'); setIsStreaming(false); }
    }
  }, [input, isInputDisabled, sessionId, sampleId]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#1A1816' }}>
      {/* ── Messages ── */}
      <div
        ref={scrollContainerRef}
        style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '20px' }}
      >
        {messages.length === 0 && !error ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '17px', color: '#706C68', textAlign: 'center', lineHeight: 1.5 }}>
              Ask the AI for suggestions on improving this writing sample.
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: '6px' }}>
                <span style={{ fontFamily: 'var(--font-ibm-plex-mono), monospace', fontSize: '14px', color: '#A09C96', letterSpacing: '0.05em' }}>
                  {msg.role === 'user' ? 'You' : 'AI'}
                </span>
                <div style={{
                  maxWidth: '380px',
                  padding: '16px 18px',
                  borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                  backgroundColor: msg.role === 'user' ? '#2E2B28' : '#242220',
                  border: msg.role === 'assistant' ? '1px solid #3A3632' : 'none',
                  fontFamily: 'var(--font-inter), sans-serif',
                  fontSize: '19px',
                  lineHeight: 1.6,
                  color: '#F4F2ED',
                }}>
                  {msg.role === 'user' ? (
                    <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                  ) : (
                    <>
                      {msg.content ? (
                        <div className="prose-chat"><MarkdownMessage content={msg.content} /></div>
                      ) : isStreaming ? (
                        <span style={{ opacity: 0.5, animation: 'pulse 1.5s infinite' }}>Thinking…</span>
                      ) : null}
                    </>
                  )}
                </div>
              </div>
            ))}
            {/* Loading indicator — visible between Send and first streamed chunk */}
            {isStreaming && (messages.length === 0 || messages[messages.length - 1].role === 'user') && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '6px' }}>
                <span style={{ fontFamily: 'var(--font-ibm-plex-mono), monospace', fontSize: '14px', color: '#A09C96', letterSpacing: '0.05em' }}>
                  AI
                </span>
                <div style={{
                  padding: '16px 18px',
                  borderRadius: '12px 12px 12px 2px',
                  backgroundColor: '#242220',
                  border: '1px solid #3A3632',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}>
                  <span className="typing-dot" style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#706C68', animation: 'typingDot 1.2s infinite ease-in-out', animationDelay: '0s' }} />
                  <span className="typing-dot" style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#706C68', animation: 'typingDot 1.2s infinite ease-in-out', animationDelay: '0.2s' }} />
                  <span className="typing-dot" style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#706C68', animation: 'typingDot 1.2s infinite ease-in-out', animationDelay: '0.4s' }} />
                </div>
              </div>
            )}
            {error && (
              <div style={{ padding: '14px 18px', backgroundColor: '#3B1515', border: '1px solid #7F1D1D', borderRadius: '8px', fontFamily: 'var(--font-inter), sans-serif', fontSize: '15px', color: '#FCA5A5' }}>
                {error}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Single-shot notice ── */}
      {isSingleShotExhausted && (
        <div style={{ borderTop: '1px solid #2E2B28', padding: '12px 28px', textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '14px', color: '#9A9790', margin: 0 }}>
            You&apos;ve used your one prompt for this sample.
          </p>
        </div>
      )}

      {/* ── Input area ── */}
      <div style={{ borderTop: '1px solid #2E2B28', padding: '20px 28px', display: 'flex', alignItems: 'flex-end', gap: '12px' }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isInputDisabled}
          rows={1}
          placeholder={isSingleShotExhausted ? 'No more prompts available' : 'Ask the AI for suggestions…'}
          aria-label="Chat message input"
          style={{
            flex: 1,
            resize: 'none',
            backgroundColor: '#242220',
            border: '1.5px solid #3A3632',
            borderRadius: '10px',
            padding: '16px 18px',
            fontFamily: 'var(--font-inter), sans-serif',
            fontSize: '18px',
            color: isInputDisabled ? '#706C68' : '#F4F2ED',
            outline: 'none',
            lineHeight: 1.4,
            cursor: isInputDisabled ? 'not-allowed' : 'text',
          }}
        />
        <button
          onClick={handleSend}
          disabled={isInputDisabled || !input.trim()}
          aria-label="Send message"
          style={{
            flexShrink: 0,
            backgroundColor: isInputDisabled || !input.trim() ? '#2A2824' : '#D4C17A',
            color: isInputDisabled || !input.trim() ? '#706C68' : '#111010',
            border: 'none',
            borderRadius: '8px',
            padding: '16px 18px',
            fontFamily: 'var(--font-inter), sans-serif',
            fontSize: '18px',
            fontWeight: 600,
            cursor: isInputDisabled || !input.trim() ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.15s',
          }}
        >
          {isStreaming ? '…' : 'Send'}
        </button>
      </div>
    </div>
  );
}
