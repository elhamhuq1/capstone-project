'use client';

import { useState } from 'react';
import { SELF_EFFICACY_QUESTIONS } from '@/lib/survey';

interface PrePostSurveyFormProps {
  sessionId: string;
  phase: 'pre' | 'post';
  onComplete: () => void;
}

export default function PrePostSurveyForm({ sessionId, phase, onComplete }: PrePostSurveyFormProps) {
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const allAnswered = SELF_EFFICACY_QUESTIONS.every((q) => ratings[q.id] !== undefined);

  function handleRating(questionId: string, value: number) {
    setRatings((prev) => ({ ...prev, [questionId]: value }));
  }

  async function handleSubmit() {
    if (!allAnswered || submitting) return;
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/session/${sessionId}/pre-post-survey`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phase,
          responses: Object.entries(ratings).map(([questionId, rating]) => ({ questionId, rating })),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to submit survey');
        return;
      }

      onComplete();
    } catch {
      setError('Network error — please try again');
    } finally {
      setSubmitting(false);
    }
  }

  const isPre = phase === 'pre';

  return (
    <div className="prepost-layout" style={{ display: 'flex', width: '100%', minHeight: '100vh', backgroundColor: '#F4F2ED' }}>
      {/* ── Left dark sidebar ── */}
      <div className="prepost-sidebar" style={{
        backgroundColor: '#111010',
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '40px' }}>
          {/* Step 1 — done */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid #4A4844', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontFamily: 'var(--font-ibm-plex-mono), monospace', fontSize: '14px', color: '#F4F2ED' }}>1</span>
            </div>
            <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '20px', fontWeight: 600, color: '#7A7770', textDecoration: 'line-through', textDecorationThickness: '1px' }}>Register</span>
          </div>
          {/* Step 2 — active for pre, done for post */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%',
              backgroundColor: isPre ? '#D4C17A' : 'transparent',
              border: isPre ? 'none' : '2px solid #4A4844',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px',
            }}>
              <span style={{ fontFamily: 'var(--font-ibm-plex-mono), monospace', fontSize: '14px', fontWeight: isPre ? 700 : 400, color: isPre ? '#111010' : '#F4F2ED' }}>2</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <span style={{
                fontFamily: 'var(--font-inter), sans-serif', fontSize: '20px', fontWeight: 700,
                color: isPre ? '#F4F2ED' : '#7A7770',
                textDecoration: isPre ? 'none' : 'line-through',
                textDecorationThickness: '1px', lineHeight: '26px',
              }}>
                {isPre ? 'Pre-Survey' : 'Writing Tasks'}
              </span>
              <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '15px', color: '#F4F2ED', lineHeight: 1.4 }}>
                {isPre
                  ? 'Quick writing confidence questionnaire before you begin.'
                  : 'All 3 samples complete.'}
              </span>
            </div>
          </div>
          {/* Step 3 — post-survey or complete */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%',
              backgroundColor: !isPre ? '#D4C17A' : 'transparent',
              border: !isPre ? 'none' : '2px solid #4A4844',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px',
            }}>
              <span style={{ fontFamily: 'var(--font-ibm-plex-mono), monospace', fontSize: '14px', fontWeight: !isPre ? 700 : 400, color: !isPre ? '#111010' : '#F4F2ED' }}>3</span>
            </div>
            <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '20px', fontWeight: 600, color: '#F4F2ED' }}>
              {isPre ? 'Complete' : 'Post-Survey'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="prepost-main" style={{
        flex: 1,
        backgroundColor: '#F4F2ED',
        display: 'flex',
        flexDirection: 'column',
        gap: '40px',
        overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <span style={{ fontFamily: 'var(--font-ibm-plex-mono), monospace', fontSize: '14px', color: '#6B6760', letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>
            {isPre ? 'Before you begin' : 'Final questionnaire'}
          </span>
          <h2 style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 'clamp(28px, 5vw, 36px)', fontWeight: 800, color: '#1A1816', letterSpacing: '-0.02em', lineHeight: 1.1, margin: 0 }}>
            Writing Self-Efficacy
          </h2>
          <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '17px', fontWeight: 300, color: '#4A4844', lineHeight: 1.5, margin: 0 }}>
            {isPre
              ? 'Rate how confident you are in each of the following writing abilities. There are no right or wrong answers.'
              : 'Now that you\'ve completed the writing tasks, rate your confidence again. Answer based on how you feel right now.'}
          </p>
        </div>

        {/* Questions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '36px' }}>
          {SELF_EFFICACY_QUESTIONS.map((q) => (
            <div key={q.id} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 'clamp(17px, 3vw, 22px)', fontWeight: 600, color: '#1A1816', lineHeight: 1.4, margin: 0 }}>
                {q.text}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div className="rating-buttons" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {[1, 2, 3, 4, 5, 6, 7].map((value) => {
                    const selected = ratings[q.id] === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => handleRating(q.id, value)}
                        aria-label={`Rate ${value} for "${q.text}"`}
                        style={{
                          width: '48px', height: '48px', borderRadius: '50%',
                          border: `2px solid ${selected ? '#111010' : '#D8D5CF'}`,
                          backgroundColor: selected ? '#111010' : '#FFFFFF',
                          color: selected ? '#F4F2ED' : '#6B6760',
                          fontFamily: 'var(--font-inter), sans-serif',
                          fontSize: '18px',
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
                <div style={{ display: 'flex', justifyContent: 'space-between', maxWidth: '386px' }}>
                  <span style={{ fontFamily: 'var(--font-ibm-plex-mono), monospace', fontSize: '12px', color: '#9A9790' }}>{q.lowLabel}</span>
                  <span style={{ fontFamily: 'var(--font-ibm-plex-mono), monospace', fontSize: '12px', color: '#9A9790' }}>{q.highLabel}</span>
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
            padding: '20px',
            fontFamily: 'var(--font-inter), sans-serif',
            fontSize: '20px',
            fontWeight: 700,
            cursor: !allAnswered || submitting ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.15s',
          }}
        >
          {submitting ? 'Submitting…' : isPre ? 'Begin Writing Tasks' : 'Complete Study'}
        </button>

        {!allAnswered && (
          <p style={{ fontFamily: 'var(--font-ibm-plex-mono), monospace', fontSize: '13px', color: '#9A9790', margin: '-28px 0 0', textAlign: 'center' as const }}>
            Answer all {SELF_EFFICACY_QUESTIONS.length} questions to continue.
          </p>
        )}
      </div>

      <style>{`
        .prepost-layout {
          flex-direction: row;
        }
        .prepost-sidebar {
          width: 320px;
          flex-shrink: 0;
        }
        .prepost-main {
          padding: 48px 56px;
        }
        @media (max-width: 768px) {
          .prepost-layout {
            flex-direction: column !important;
            height: auto !important;
            min-height: 100vh;
          }
          .prepost-sidebar {
            width: 100% !important;
            padding: 28px 20px !important;
          }
          .prepost-sidebar h1 {
            font-size: 32px !important;
          }
          .prepost-main {
            padding: 24px 20px !important;
          }
          .rating-buttons button {
            width: 40px !important;
            height: 40px !important;
            font-size: 15px !important;
          }
        }
      `}</style>
    </div>
  );
}
