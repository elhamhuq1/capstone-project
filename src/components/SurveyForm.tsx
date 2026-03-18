'use client';

import { useState } from 'react';
import { SURVEY_QUESTIONS } from '@/lib/survey';

interface SurveyFormProps {
  sessionId: string;
  sampleId: number;
  sampleIndex: number;
  totalSamples: number;
  onSurveyComplete: () => void;
}

export default function SurveyForm({
  sessionId,
  sampleId,
  sampleIndex,
  totalSamples,
  onSurveyComplete,
}: SurveyFormProps) {
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const allAnswered = SURVEY_QUESTIONS.every((q) => ratings[q.id] !== undefined);

  function handleRating(questionId: string, value: number) {
    setRatings((prev) => ({ ...prev, [questionId]: value }));
  }

  async function handleSubmit() {
    if (!allAnswered || submitting) return;
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/session/${sessionId}/survey`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sampleId,
          responses: Object.entries(ratings).map(([questionId, rating]) => ({
            questionId,
            rating,
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to submit survey');
        return;
      }

      onSurveyComplete();
    } catch {
      setError('Network error — please try again');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-2xl rounded-xl border bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      {/* Header */}
      <div className="mb-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400">
          Sample {sampleIndex} of {totalSamples}
        </p>
        <h2 className="mt-2 text-xl font-bold text-stone-900 dark:text-zinc-100">
          Quick Survey
        </h2>
        <p className="mt-1 text-sm text-stone-500 dark:text-zinc-400">
          Please rate each statement based on your experience editing this sample.
        </p>
      </div>

      {/* Questions */}
      <div className="space-y-6">
        {SURVEY_QUESTIONS.map((q, idx) => (
          <div
            key={q.id}
            className="rounded-lg border border-stone-100 bg-stone-50/50 p-5 dark:border-zinc-800 dark:bg-zinc-800/40"
          >
            <p className="mb-3 text-sm font-medium leading-snug text-stone-800 dark:text-zinc-200">
              <span className="mr-1.5 text-stone-400 dark:text-zinc-500">
                {idx + 1}.
              </span>
              {q.text}
            </p>
            <div className="flex items-center gap-2">
              <span className="mr-1 w-[5.5rem] text-right text-[11px] text-stone-400 dark:text-zinc-500">
                Strongly Disagree
              </span>
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleRating(q.id, value)}
                  aria-label={`Rate ${value} for "${q.text}"`}
                  className={`h-10 w-10 rounded-lg text-sm font-semibold transition-all ${
                    ratings[q.id] === value
                      ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-300 dark:ring-blue-800'
                      : 'bg-white text-stone-600 border border-stone-200 hover:border-blue-300 hover:bg-blue-50 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700 dark:hover:border-blue-600 dark:hover:bg-zinc-700'
                  }`}
                >
                  {value}
                </button>
              ))}
              <span className="ml-1 w-[5.5rem] text-[11px] text-stone-400 dark:text-zinc-500">
                Strongly Agree
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="mt-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Submit */}
      <div className="mt-8 text-center">
        <button
          onClick={handleSubmit}
          disabled={!allAnswered || submitting}
          className="rounded-lg bg-blue-600 px-8 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 hover:shadow disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-700 dark:hover:bg-blue-600"
        >
          {submitting ? 'Submitting…' : 'Submit Survey'}
        </button>
        {!allAnswered && (
          <p className="mt-2 text-xs text-stone-400 dark:text-zinc-500">
            Please answer all {SURVEY_QUESTIONS.length} questions to continue.
          </p>
        )}
      </div>
    </div>
  );
}
