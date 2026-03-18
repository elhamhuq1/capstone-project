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

export default function SurveyForm({ sessionId, sampleId, sampleIndex, totalSamples, onSurveyComplete }: SurveyFormProps) {
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
          responses: Object.entries(ratings).map(([questionId, rating]) => ({ questionId, rating })),
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
    <div style={{ display: 'flex', width: '100%', maxWidth: '900px', backgroundColor: '#F4F2ED' }}>
      {/* ── Left dark sidebar ── */}
      <div style={{
        width: '320px',
        flexShrink: 0,
        backgroundColor: '#111010',
        borderRadius: '12px 0 0 12px',
        padding: '48px 40px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontFamily: 'var(--font-ibm-plex-mono), monospace', fontSize: '14px', color: '#F4F2ED', letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>
            Research Study
          </span>
          <h1 style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '42px', fontWeight: 900, color: '#F4F2ED', letterSpacing: '-0.03em', lineHeight: 1, margin: 0 }}>
            Prompt<br />Engineering<br />Study
          </h1>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Step 1 — done */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid #4A4844', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontFamily: 'var(--font-ibm-plex-mono), monospace', fontSize: '14px', color: '#F4F2ED' }}>1</span>
            </div>
            <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '20px', fontWeight: 600, color: '#7A7770', textDecoration: 'line-through', textDecorationThickness: '1px' }}>Register</span>
          </div>
          {/* Step 2 — active */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#D4C17A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
              <span style={{ fontFamily: 'var(--font-ibm-plex-mono), monospace', fontSize: '14px', fontWeight: 700, color: '#111010' }}>2</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '20px', fontWeight: 700, color: '#F4F2ED', lineHeight: '26px' }}>Writing Tasks</span>
              <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '15px', color: '#F4F2ED', lineHeight: 1.4 }}>
                Sample {sampleIndex} of {totalSamples} complete. Quick survey before continuing.
              </span>
            </div>
          </div>
          {/* Step 3 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid #4A4844', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontFamily: 'var(--font-ibm-plex-mono), monospace', fontSize: '14px', color: '#F4F2ED' }}>3</span>
            </div>
            <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '20px', fontWeight: 600, color: '#F4F2ED' }}>Complete</span>
          </div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div style={{
        flex: 1,
        backgroundColor: '#F4F2ED',
        borderRadius: '0 12px 12px 0',
        padding: '48px 56px',
        display: 'flex',
        flexDirection: 'column',
        gap: '40px',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <span style={{ fontFamily: 'var(--font-ibm-plex-mono), monospace', fontSize: '16px', color: '#6B6760', letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>
            After Sample {sampleIndex}
          </span>
          <h2 style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '36px', fontWeight: 800, color: '#1A1816', letterSpacing: '-0.02em', lineHeight: 1.1, margin: 0 }}>
            Quick check-in
          </h2>
          <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '19px', fontWeight: 300, color: '#4A4844', lineHeight: 1.5, margin: 0 }}>
            Rate each statement from 1 (strongly disagree) to 5 (strongly agree).
          </p>
        </div>

        {/* Questions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '36px' }}>
          {SURVEY_QUESTIONS.map((q) => (
            <div key={q.id} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '22px', fontWeight: 600, color: '#1A1816', lineHeight: 1.4, margin: 0 }}>
                {q.text}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  {[1, 2, 3, 4, 5].map((value) => {
                    const selected = ratings[q.id] === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => handleRating(q.id, value)}
                        aria-label={`Rate ${value} for "${q.text}"`}
                        style={{
                          width: '60px', height: '60px', borderRadius: '50%',
                          border: `2px solid ${selected ? '#111010' : '#D8D5CF'}`,
                          backgroundColor: selected ? '#111010' : '#FFFFFF',
                          color: selected ? '#F4F2ED' : '#6B6760',
                          fontFamily: 'var(--font-inter), sans-serif',
                          fontSize: '22px',
                          fontWeight: selected ? 700 : 600,
                          cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 0.1s',
                          flexShrink: 0,
                        }}
                      >
                        {value}
                      </button>
                    );
                  })}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '358px' }}>
                  <span style={{ fontFamily: 'var(--font-ibm-plex-mono), monospace', fontSize: '13px', color: '#9A9790' }}>Strongly disagree</span>
                  <span style={{ fontFamily: 'var(--font-ibm-plex-mono), monospace', fontSize: '13px', color: '#9A9790' }}>Strongly agree</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div style={{ padding: '14px 18px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', fontFamily: 'var(--font-inter), sans-serif', fontSize: '15px', color: '#B91C1C' }}>
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!allAnswered || submitting}
          style={{
            backgroundColor: !allAnswered || submitting ? '#D8D5CF' : '#D4C17A',
            color: !allAnswered || submitting ? '#9A9790' : '#111010',
            border: 'none',
            borderRadius: '8px',
            padding: '22px',
            fontFamily: 'var(--font-inter), sans-serif',
            fontSize: '22px',
            fontWeight: 700,
            cursor: !allAnswered || submitting ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.15s',
          }}
        >
          {submitting ? 'Submitting…' : sampleIndex < totalSamples ? `Continue to Sample ${sampleIndex + 1}` : 'Complete Study'}
        </button>

        {!allAnswered && (
          <p style={{ fontFamily: 'var(--font-ibm-plex-mono), monospace', fontSize: '13px', color: '#9A9790', margin: '-28px 0 0', textAlign: 'center' as const }}>
            Answer all {SURVEY_QUESTIONS.length} questions to continue.
          </p>
        )}
      </div>
    </div>
  );
}
