'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

/* ---------- types ---------- */
interface PromptEntry {
  id: number;
  content: string;
  promptNumber: number;
  createdAt: string;
  aiResponse: string | null;
}

interface Revision {
  id: number;
  revisionNumber: number;
  content: string;
  createdAt: string;
}

interface DiffChange {
  type: 'added' | 'removed' | 'unchanged';
  text: string;
}

interface SampleDetail {
  sampleId: number;
  sampleIndex: number;
  title: string | null;
  content: string | null;
  prompts: PromptEntry[];
  revisions: Revision[];
  survey: Record<string, number>;
  timing: {
    startedAt: string | null;
    completedAt: string | null;
    timeSeconds: number | null;
  };
  finalSubmission: {
    finalContent: string;
    changes: DiffChange[];
    submittedAt: string;
  } | null;
}

interface SessionDetail {
  sessionId: string;
  participant: { name: string | null; email: string | null };
  group: string;
  status: string;
  sampleOrder: number[];
  startedAt: string;
  completedAt: string | null;
  samples: SampleDetail[];
}

/* ---------- palette ---------- */
const GROUP_BADGE_STYLE: Record<string, { bg: string; color: string }> = {
  scaffold:      { bg: '#D4C17A', color: '#111010' },
  iterative:     { bg: '#1A1816', color: '#F4F2ED' },
  'single-shot': { bg: '#4A4844', color: '#F4F2ED' },
};

const STATUS_BADGE_STYLE: Record<string, { bg: string; color: string }> = {
  'in-progress': { bg: '#EEECE7', color: '#6B6760' },
  completed:     { bg: '#D4C17A', color: '#111010' },
  abandoned:     { bg: '#FEE2E2', color: '#B91C1C' },
};

const SURVEY_LABELS: Record<string, string> = {
  authorship: 'Ownership',
  satisfaction: 'Satisfaction',
  cognitive_load: 'Cognitive Load',
  helpfulness: 'Helpfulness',
  future_intent: 'Future Intent',
};

/* ---------- helpers ---------- */
function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function fmtDuration(sec: number | null) {
  if (sec === null) return '—';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

/* ---------- collapsible ---------- */
function Collapsible({ title, count, children, defaultOpen = false }: {
  title: string; count?: number; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ border: '1.5px solid #E4E2DC', borderRadius: '8px', overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px', background: open ? '#FAFAF8' : '#FFFFFF', border: 'none', cursor: 'pointer',
          fontFamily: 'var(--font-inter), sans-serif', fontSize: '15px', fontWeight: 500, color: '#1A1816',
          textAlign: 'left',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {title}
          {count !== undefined && (
            <span style={{ fontFamily: 'var(--font-ibm-plex-mono), monospace', fontSize: '12px', color: '#9A9790' }}>({count})</span>
          )}
        </span>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}>
          <path d="M4 6L8 10L12 6" stroke="#9A9790" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div style={{ borderTop: '1px solid #E4E2DC', padding: '16px 18px', backgroundColor: '#FFFFFF' }}>
          {children}
        </div>
      )}
    </div>
  );
}

/* ---------- truncated text ---------- */
function TruncatedText({ text, maxLen = 300 }: { text: string; maxLen?: number }) {
  const [expanded, setExpanded] = useState(false);
  if (text.length <= maxLen) return <span style={{ whiteSpace: 'pre-wrap' }}>{text}</span>;
  return (
    <span style={{ whiteSpace: 'pre-wrap' }}>
      {expanded ? text : text.slice(0, maxLen) + '…'}
      <button onClick={() => setExpanded(e => !e)} style={{
        marginLeft: '6px', fontFamily: 'var(--font-inter), sans-serif', fontSize: '13px',
        fontWeight: 600, color: '#2558E8', background: 'none', border: 'none', cursor: 'pointer', padding: 0,
      }}>
        {expanded ? 'Show less' : 'Show more'}
      </button>
    </span>
  );
}

/* ========== page ========== */
export default function SessionDetailPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId;

  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      setNotFound(false);
      try {
        const res = await fetch(`/api/researcher/sessions/${sessionId}`);
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || `HTTP ${res.status}`);
        }
        const data: SessionDetail = await res.json();
        setDetail(data);
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : 'Failed to load session',
        );
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [sessionId]);

  /* -- loading -- */
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
        <div style={{ width: '22px', height: '22px', borderRadius: '50%', border: '2px solid #D8D5CF', borderTopColor: '#1A1816', animation: 'spin 0.8s linear infinite' }} />
        <span style={{ marginLeft: '12px', fontFamily: 'var(--font-ibm-plex-mono), monospace', fontSize: '13px', color: '#9A9790' }}>Loading session…</span>
      </div>
    );
  }

  /* -- 404 -- */
  if (notFound) {
    return (
      <div style={{ padding: '64px', textAlign: 'center', border: '2px dashed #D8D5CF', borderRadius: '12px' }}>
        <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '18px', fontWeight: 600, color: '#1A1816', margin: '0 0 8px' }}>Session not found</p>
        <p style={{ fontFamily: 'var(--font-ibm-plex-mono), monospace', fontSize: '13px', color: '#9A9790', margin: '0 0 20px' }}>{sessionId}</p>
        <Link href="/researcher" style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '15px', color: '#2558E8', textDecoration: 'none' }}>← Back to sessions</Link>
      </div>
    );
  }

  /* -- error -- */
  if (error) {
    return (
      <div style={{ padding: '18px 22px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', fontFamily: 'var(--font-inter), sans-serif', fontSize: '15px', color: '#B91C1C' }}>
        {error}
      </div>
    );
  }

  if (!detail) return null;

  const { participant, group, status, startedAt, completedAt, samples } = detail;
  const groupBadge = GROUP_BADGE_STYLE[group] ?? { bg: '#4A4844', color: '#F4F2ED' };
  const statusBadge = STATUS_BADGE_STYLE[status] ?? { bg: '#EEECE7', color: '#6B6760' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Back link */}
      <Link href="/researcher" style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '14px', color: '#6B6760', textDecoration: 'none' }}>
        ← All sessions
      </Link>

      {/* ── Participant header card ── */}
      <div style={{ backgroundColor: '#FFFFFF', border: '2px solid #E4E2DC', borderRadius: '12px', padding: '28px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '24px', fontWeight: 700, color: '#1A1816', margin: '0 0 4px' }}>
              {participant.name ?? 'Unknown'}
            </h2>
            <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '16px', color: '#6B6760', margin: 0 }}>
              {participant.email ?? '—'}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontFamily: 'var(--font-ibm-plex-mono), monospace', fontSize: '12px', backgroundColor: groupBadge.bg, color: groupBadge.color, borderRadius: '4px', padding: '5px 12px' }}>
              {group}
            </span>
            <span style={{ fontFamily: 'var(--font-ibm-plex-mono), monospace', fontSize: '12px', backgroundColor: statusBadge.bg, color: statusBadge.color, borderRadius: '4px', padding: '5px 12px' }}>
              {status}
            </span>
          </div>
        </div>
        <div style={{ marginTop: '20px', display: 'flex', gap: '40px' }}>
          <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '14px', color: '#6B6760' }}>
            <strong style={{ color: '#1A1816', fontWeight: 600 }}>Started:</strong> {fmtDate(startedAt)}
          </span>
          <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '14px', color: '#6B6760' }}>
            <strong style={{ color: '#1A1816', fontWeight: 600 }}>Completed:</strong> {fmtDate(completedAt)}
          </span>
        </div>
      </div>

      {/* ── Per-sample cards ── */}
      {samples.map((sample, idx) => (
        <div key={sample.sampleId} style={{ backgroundColor: '#FFFFFF', border: '2px solid #E4E2DC', borderRadius: '12px', overflow: 'hidden' }}>
          {/* Sample header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #EEECE7', padding: '20px 24px' }}>
            <div>
              <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '18px', fontWeight: 700, color: '#1A1816' }}>
                Sample {idx + 1}
              </span>
              {sample.title && (
                <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '16px', color: '#6B6760', marginLeft: '10px' }}>
                  — {sample.title}
                </span>
              )}
            </div>
            <span style={{ fontFamily: 'var(--font-ibm-plex-mono), monospace', fontSize: '13px', backgroundColor: '#F4F2ED', border: '1px solid #D8D5CF', borderRadius: '6px', padding: '5px 12px', color: '#6B6760' }}>
              {fmtDuration(sample.timing.timeSeconds)}
            </span>
          </div>

          {/* Collapsible sections */}
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Prompts & AI Responses */}
            <Collapsible title="Prompts & AI Responses" count={sample.prompts.length} defaultOpen={idx === 0}>
              {sample.prompts.length === 0 ? (
                <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '14px', color: '#9A9790', fontStyle: 'italic', margin: 0 }}>No prompts recorded.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {sample.prompts.map((p) => (
                    <div key={p.id}>
                      <div style={{ fontFamily: 'var(--font-ibm-plex-mono), monospace', fontSize: '12px', color: '#9A9790', marginBottom: '8px', letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>
                        Prompt #{p.promptNumber}
                      </div>
                      <div style={{ backgroundColor: '#2E2B28', borderRadius: '8px', padding: '14px 16px', fontFamily: 'var(--font-inter), sans-serif', fontSize: '15px', color: '#F4F2ED', lineHeight: 1.6 }}>
                        <TruncatedText text={p.content} />
                      </div>
                      {p.aiResponse && (
                        <div style={{ marginTop: '8px', marginLeft: '16px', backgroundColor: '#F4F2ED', borderLeft: '3px solid #D4C17A', borderRadius: '0 8px 8px 0', padding: '14px 16px' }}>
                          <div style={{ fontFamily: 'var(--font-ibm-plex-mono), monospace', fontSize: '11px', color: '#D4C17A', letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: '8px' }}>
                            AI Response
                          </div>
                          <div style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '15px', color: '#1A1816', lineHeight: 1.6 }}>
                            <TruncatedText text={p.aiResponse} maxLen={500} />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Collapsible>

            {/* Revisions */}
            <Collapsible title="Revisions" count={sample.revisions.length}>
              {sample.revisions.length === 0 ? (
                <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '14px', color: '#9A9790', fontStyle: 'italic', margin: 0 }}>No revisions recorded.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {sample.revisions.map((r) => (
                    <div key={r.id} style={{ border: '1px solid #EEECE7', borderRadius: '6px', padding: '14px 16px', backgroundColor: '#FAFAF8' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontFamily: 'var(--font-ibm-plex-mono), monospace', fontSize: '12px', fontWeight: 700, color: '#6B6760', letterSpacing: '0.06em' }}>Rev #{r.revisionNumber}</span>
                        <span style={{ fontFamily: 'var(--font-ibm-plex-mono), monospace', fontSize: '12px', color: '#9A9790' }}>{fmtDate(r.createdAt)}</span>
                      </div>
                      <div style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '15px', color: '#1A1816', lineHeight: 1.6 }}>
                        <TruncatedText text={r.content} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Collapsible>

            {/* Final Submission */}
            <Collapsible title="Final Submission">
              {!sample.finalSubmission ? (
                <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '14px', color: '#9A9790', fontStyle: 'italic', margin: 0 }}>No final submission recorded.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ fontFamily: 'var(--font-ibm-plex-mono), monospace', fontSize: '12px', color: '#9A9790' }}>
                    Submitted {fmtDate(sample.finalSubmission.submittedAt)}
                  </div>

                  {/* Changes summary */}
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {(() => {
                      const countWords = (chunks: DiffChange[], type: string) =>
                        chunks.filter(c => c.type === type).reduce((n, c) => n + c.text.trim().split(/\s+/).filter(Boolean).length, 0);
                      const added = countWords(sample.finalSubmission!.changes, 'added');
                      const removed = countWords(sample.finalSubmission!.changes, 'removed');
                      return (
                        <>
                          {added > 0 && <span style={{ fontFamily: 'var(--font-ibm-plex-mono), monospace', fontSize: '13px', color: '#16A34A', backgroundColor: '#F0FDF4', padding: '4px 10px', borderRadius: '4px' }}>+{added} word{added !== 1 ? 's' : ''} added</span>}
                          {removed > 0 && <span style={{ fontFamily: 'var(--font-ibm-plex-mono), monospace', fontSize: '13px', color: '#DC2626', backgroundColor: '#FEF2F2', padding: '4px 10px', borderRadius: '4px' }}>−{removed} word{removed !== 1 ? 's' : ''} removed</span>}
                          {added === 0 && removed === 0 && <span style={{ fontFamily: 'var(--font-ibm-plex-mono), monospace', fontSize: '13px', color: '#6B6760', backgroundColor: '#F4F2ED', padding: '4px 10px', borderRadius: '4px' }}>No changes</span>}
                        </>
                      );
                    })()}
                  </div>

                  {/* Inline word-level diff */}
                  <div style={{ border: '1px solid #EEECE7', borderRadius: '6px', padding: '16px', backgroundColor: '#FAFAF8', fontFamily: 'var(--font-inter), sans-serif', fontSize: '15px', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                    {sample.finalSubmission.changes.map((change, i) => {
                      if (change.type === 'unchanged') {
                        return <span key={i}>{change.text}</span>;
                      }
                      return (
                        <span
                          key={i}
                          style={{
                            backgroundColor: change.type === 'added' ? '#DCFCE7' : '#FEE2E2',
                            color: change.type === 'added' ? '#15803D' : '#B91C1C',
                            textDecoration: change.type === 'removed' ? 'line-through' : 'none',
                            borderRadius: '3px',
                            padding: '1px 3px',
                          }}
                        >
                          {change.text}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </Collapsible>

            {/* Survey Ratings */}
            <Collapsible title="Survey Ratings">
              {Object.keys(sample.survey).length === 0 ? (
                <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '14px', color: '#9A9790', fontStyle: 'italic', margin: 0 }}>No survey responses.</p>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {Object.entries(SURVEY_LABELS).map(([key, label]) => {
                    const val = sample.survey[key];
                    return (
                      <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#F4F2ED', border: '1.5px solid #D8D5CF', borderRadius: '8px', padding: '10px 16px' }}>
                        <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '14px', color: '#6B6760' }}>{label}</span>
                        <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '20px', fontWeight: 800, color: '#1A1816' }}>{val !== undefined ? val : '—'}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Collapsible>
          </div>
        </div>
      ))}
    </div>
  );
}
