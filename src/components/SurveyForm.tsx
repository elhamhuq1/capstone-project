'use client';

import { useState } from 'react';
import { TASK_SURVEY_QUESTIONS, type SurveyQuestion } from '@/lib/survey';

interface SurveyFormProps {
  sessionId: string;
  sampleId: number;
  sampleIndex: number;
  totalSamples: number;
  grammarlyScore: number | null;
  onSurveyComplete: () => void;
}

function LikertQuestion({ question, value, onChange, scale }: {
  question: SurveyQuestion;
  value: number | undefined;
  onChange: (v: number) => void;
  scale: number;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 'clamp(16px, 3vw, 20px)', fontWeight: 600, color: '#1A1816', lineHeight: 1.4, margin: 0 }}>
        {question.text}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div className="rating-buttons" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {Array.from({ length: scale }, (_, i) => i + 1).map((v) => {
            const selected = value === v;
            return (
              <button
                key={v}
                type="button"
                onClick={() => onChange(v)}
                aria-label={`Rate ${v} for "${question.text}"`}
                style={{
                  width: '44px', height: '44px', borderRadius: '50%',
                  border: `2px solid ${selected ? '#111010' : '#D8D5CF'}`,
                  backgroundColor: selected ? '#111010' : '#FFFFFF',
                  color: selected ? '#F4F2ED' : '#6B6760',
                  fontFamily: 'var(--font-inter), sans-serif',
                  fontSize: '17px',
                  fontWeight: selected ? 700 : 600,
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.1s',
                  flexShrink: 0,
                }}
              >
                {v}
              </button>
            );
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', maxWidth: `${scale * 52}px` }}>
          <span style={{ fontFamily: 'var(--font-ibm-plex-mono), monospace', fontSize: '12px', color: '#9A9790' }}>{question.lowLabel}</span>
          <span style={{ fontFamily: 'var(--font-ibm-plex-mono), monospace', fontSize: '12px', color: '#9A9790' }}>{question.highLabel}</span>
        </div>
      </div>
    </div>
  );
}

function NumberInputQuestion({ question, value, onChange }: {
  question: SurveyQuestion;
  value: number | undefined;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 'clamp(16px, 3vw, 20px)', fontWeight: 600, color: '#1A1816', lineHeight: 1.4, margin: 0 }}>
        {question.text}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <input
          type="number"
          value={value !== undefined ? value : ''}
          onChange={(e) => {
            const num = parseInt(e.target.value, 10);
            if (!isNaN(num)) onChange(num);
          }}
          placeholder={question.placeholder}
          style={{
            width: '120px',
            padding: '14px 16px',
            border: '2px solid #D8D5CF',
            borderRadius: '8px',
            fontFamily: 'var(--font-inter), sans-serif',
            fontSize: '18px',
            fontWeight: 600,
            color: '#1A1816',
            backgroundColor: '#FFFFFF',
            outline: 'none',
          }}
        />
        <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '15px', color: '#6B6760' }}>
          points
        </span>
      </div>
    </div>
  );
}

export default function SurveyForm({ sessionId, sampleId, sampleIndex, totalSamples, grammarlyScore, onSurveyComplete }: SurveyFormProps) {
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [numericValues, setNumericValues] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const allAnswered = TASK_SURVEY_QUESTIONS.every((q) => {
    if (q.type === 'number_input') return numericValues[q.id] !== undefined;
    return ratings[q.id] !== undefined;
  });

  function handleRating(questionId: string, value: number) {
    setRatings((prev) => ({ ...prev, [questionId]: value }));
  }

  function handleNumericValue(questionId: string, value: number) {
    setNumericValues((prev) => ({ ...prev, [questionId]: value }));
  }

  async function handleSubmit() {
    if (!allAnswered || submitting) return;
    setSubmitting(true);
    setError('');

    try {
      const responses = TASK_SURVEY_QUESTIONS.map((q) => {
        if (q.type === 'number_input') {
          return { questionId: q.id, rating: 0, numericValue: numericValues[q.id] };
        }
        return { questionId: q.id, rating: ratings[q.id], numericValue: null };
      });

      const res = await fetch(`/api/session/${sessionId}/survey`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sampleId, responses }),
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

  // Group questions for visual sections
  const calibrationQ = TASK_SURVEY_QUESTIONS.filter(q => q.id.startsWith('calibration'));
  const ownershipQ = TASK_SURVEY_QUESTIONS.filter(q => q.id.startsWith('ownership'));
  const tlxQ = TASK_SURVEY_QUESTIONS.filter(q => q.id.startsWith('tlx'));

  return (
    <div className="survey-layout" style={{ display: 'flex', width: '100%', height: '100%', backgroundColor: '#F4F2ED' }}>
      {/* ── Left dark sidebar ── */}
      <div className="survey-sidebar" style={{
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
      <div className="survey-main" style={{
        flex: 1,
        backgroundColor: '#F4F2ED',
        display: 'flex',
        flexDirection: 'column',
        gap: '32px',
        overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <span style={{ fontFamily: 'var(--font-ibm-plex-mono), monospace', fontSize: '14px', color: '#6B6760', letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>
            After Sample {sampleIndex}
          </span>
          <h2 style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 'clamp(28px, 5vw, 36px)', fontWeight: 800, color: '#1A1816', letterSpacing: '-0.02em', lineHeight: 1.1, margin: 0 }}>
            Reflection check-in
          </h2>
          <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '17px', fontWeight: 300, color: '#4A4844', lineHeight: 1.5, margin: 0 }}>
            These questions help us understand your experience. There are no right or wrong answers.
          </p>
        </div>

        {/* ── Section: Calibration ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '6px', height: '24px', borderRadius: '3px', backgroundColor: '#D4C17A' }} />
            <span style={{ fontFamily: 'var(--font-ibm-plex-mono), monospace', fontSize: '13px', color: '#6B6760', letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>
              Self-Assessment
            </span>
          </div>
          {grammarlyScore != null && (
            <div style={{
              backgroundColor: '#111010',
              borderRadius: '10px',
              padding: '18px 24px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
            }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '50%',
                backgroundColor: '#2A2824',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <span style={{ fontFamily: 'var(--font-ibm-plex-mono), monospace', fontSize: '20px', fontWeight: 700, color: '#D4C17A' }}>
                  {grammarlyScore}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '15px', fontWeight: 600, color: '#F4F2ED' }}>
                  Original Grammarly Score
                </span>
                <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '14px', color: '#9A9790', lineHeight: 1.4 }}>
                  This was the score before you made any edits. How much do you think it improved?
                </span>
              </div>
            </div>
          )}
          {calibrationQ.map((q) => (
            <NumberInputQuestion
              key={q.id}
              question={q}
              value={numericValues[q.id]}
              onChange={(v) => handleNumericValue(q.id, v)}
            />
          ))}
        </div>

        {/* ── Section: Ownership ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '6px', height: '24px', borderRadius: '3px', backgroundColor: '#D4C17A' }} />
            <span style={{ fontFamily: 'var(--font-ibm-plex-mono), monospace', fontSize: '13px', color: '#6B6760', letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>
              Ownership &amp; Attribution
            </span>
          </div>
          {ownershipQ.map((q) => (
            <LikertQuestion
              key={q.id}
              question={q}
              value={ratings[q.id]}
              onChange={(v) => handleRating(q.id, v)}
              scale={7}
            />
          ))}
        </div>

        {/* ── Section: Cognitive Load ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '6px', height: '24px', borderRadius: '3px', backgroundColor: '#D4C17A' }} />
            <span style={{ fontFamily: 'var(--font-ibm-plex-mono), monospace', fontSize: '13px', color: '#6B6760', letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>
              Task Workload
            </span>
          </div>
          {tlxQ.map((q) => (
            <LikertQuestion
              key={q.id}
              question={q}
              value={ratings[q.id]}
              onChange={(v) => handleRating(q.id, v)}
              scale={7}
            />
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
          {submitting ? 'Submitting…' : sampleIndex < totalSamples ? `Continue to Sample ${sampleIndex + 1}` : 'Continue to Final Survey'}
        </button>

        {!allAnswered && (
          <p style={{ fontFamily: 'var(--font-ibm-plex-mono), monospace', fontSize: '13px', color: '#9A9790', margin: '-28px 0 0', textAlign: 'center' as const }}>
            Answer all {TASK_SURVEY_QUESTIONS.length} questions to continue.
          </p>
        )}
      </div>

      <style>{`
        .survey-layout {
          flex-direction: row;
        }
        .survey-sidebar {
          width: 320px;
          flex-shrink: 0;
        }
        .survey-main {
          padding: 48px 56px;
        }
        @media (max-width: 768px) {
          .survey-layout {
            flex-direction: column !important;
            height: auto !important;
            min-height: 100vh;
          }
          .survey-sidebar {
            width: 100% !important;
            padding: 28px 20px !important;
          }
          .survey-sidebar h1 {
            font-size: 32px !important;
          }
          .survey-main {
            padding: 24px 20px !important;
          }
          .rating-buttons button {
            width: 38px !important;
            height: 38px !important;
            font-size: 15px !important;
          }
        }
      `}</style>
    </div>
  );
}
