'use client';

import { useState } from 'react';

const tips = [
  {
    title: 'Be Specific',
    description:
      'Instead of "help me improve this," say "identify grammar errors in the second paragraph."',
  },
  {
    title: 'Ask for Explanations',
    description:
      'Say "explain why this sentence is awkward" to understand the issue, not just fix it.',
  },
  {
    title: 'Focus on One Thing',
    description:
      'Address one type of issue at a time — grammar first, then clarity, then structure.',
  },
  {
    title: 'Provide Context',
    description:
      'Tell the AI what kind of writing this is (essay, email, report) and who the audience is.',
  },
  {
    title: 'Iterate and Refine',
    description:
      'Use follow-up prompts to dig deeper: "Can you give me more detail on point #2?"',
  },
  {
    title: 'Ask for Strategies, Not Answers',
    description:
      'Say "how can I make this paragraph more concise?" instead of "rewrite this paragraph."',
  },
];

export default function ScaffoldPanel() {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="rounded-xl border border-stone-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      {/* ─── Header (always visible, clickable to toggle) ─── */}
      <button
        onClick={() => setIsExpanded((prev) => !prev)}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-stone-50 dark:hover:bg-zinc-800/50"
        aria-expanded={isExpanded}
        aria-controls="scaffold-tips-content"
      >
        <div className="flex items-center gap-2">
          <svg
            className="h-4 w-4 text-emerald-600 dark:text-emerald-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"
            />
          </svg>
          <h2 className="text-sm font-semibold text-stone-800 dark:text-zinc-200">
            Prompt Engineering Tips
          </h2>
        </div>
        <svg
          className={`h-4 w-4 text-stone-400 transition-transform duration-200 dark:text-zinc-500 ${
            isExpanded ? 'rotate-180' : ''
          }`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {/* ─── Collapsible content ─── */}
      {isExpanded && (
        <div
          id="scaffold-tips-content"
          className="border-t border-stone-200 px-4 py-3 dark:border-zinc-800"
        >
          <ol className="space-y-3">
            {tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                  {i + 1}
                </span>
                <div className="text-sm leading-snug">
                  <span className="font-medium text-stone-800 dark:text-zinc-200">
                    {tip.title}
                  </span>
                  <span className="text-stone-500 dark:text-zinc-400">
                    {' — '}
                    {tip.description}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
