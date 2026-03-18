'use client';

import { useState } from 'react';

const tips = [
  'Be specific — name the issue, not just "make it better."',
  'Ask for a target audience or tone, not just a fix.',
  'Follow up: "Can you explain why?" builds understanding.',
  'Address one type of issue at a time — grammar, then clarity, then structure.',
  'Tell the AI what kind of writing this is and who the audience is.',
  'Ask "how can I make this more concise?" instead of "rewrite this."',
];

export default function ScaffoldPanel() {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div style={{ backgroundColor: '#2A2420', borderBottom: '1px solid #3A3632', flexShrink: 0 }}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded((prev) => !prev)}
        aria-expanded={isExpanded}
        aria-controls="scaffold-tips-content"
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '18px 28px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{
          fontFamily: 'var(--font-ibm-plex-mono), monospace',
          fontSize: '14px',
          color: '#D4C17A',
          letterSpacing: '0.1em',
          textTransform: 'uppercase' as const,
        }}>
          Prompt Engineering Tips
        </span>
        <svg
          width="16" height="16" viewBox="0 0 16 16" fill="none"
          style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}
        >
          <path d="M4 6L8 10L12 6" stroke="#9A9790" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {isExpanded && (
        <div id="scaffold-tips-content" style={{ padding: '0 28px 18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {tips.map((tip, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <span style={{
                fontFamily: 'var(--font-ibm-plex-mono), monospace',
                fontSize: '12px',
                color: '#D4C17A',
                lineHeight: '1.75',
                flexShrink: 0,
              }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <span style={{
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize: '16px',
                color: '#F4F2ED',
                lineHeight: 1.6,
              }}>
                {tip}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
