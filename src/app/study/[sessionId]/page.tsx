'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import InstructionsScreen from '@/components/InstructionsScreen';
import WritingEditor from '@/components/WritingEditor';
import ChatPanel from '@/components/ChatPanel';
import ScaffoldPanel from '@/components/ScaffoldPanel';
import SurveyForm from '@/components/SurveyForm';
import PrePostSurveyForm from '@/components/PrePostSurveyForm';
import CompletionScreen from '@/components/CompletionScreen';

// ── Submit button lives in the top bar but needs editor state via callback ──
function SubmitRevisionButton({ sessionId, sample, sampleIndex, totalSamples, onSubmitForSurvey, getCurrentText }: {
  sessionId: string;
  sample: { id: number; content: string; grammarlyScore: number | null };
  sampleIndex: number;
  totalSamples: number;
  onSubmitForSurvey: (data: { sampleId: number; sampleIndex: number; grammarlyScore: number | null }) => void;
  getCurrentText: () => string;
}) {
  const [advancing, setAdvancing] = useState(false);

  async function handleSubmit() {
    const confirmed = window.confirm(
      'Submit this sample? You cannot return to edit it.'
    );
    if (!confirmed) return;
    setAdvancing(true);
    try {
      const finalContent = getCurrentText();
      const submitRes = await fetch(`/api/session/${sessionId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ finalContent }),
      });
      if (!submitRes.ok) { setAdvancing(false); return; }

      fetch(`/api/session/${sessionId}/timing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sampleId: sample.id, sampleIndex: sampleIndex - 1, event: 'complete' }),
      }).catch(() => {});

      onSubmitForSurvey({ sampleId: sample.id, sampleIndex, grammarlyScore: sample.grammarlyScore });
    } catch { setAdvancing(false); }
  }

  return (
    <button
      onClick={handleSubmit}
      disabled={advancing}
      style={{
        backgroundColor: advancing ? '#C4B060' : '#D4C17A',
        color: '#111010',
        border: 'none',
        borderRadius: '8px',
        padding: '10px 20px',
        fontFamily: 'var(--font-inter), sans-serif',
        fontSize: '15px',
        fontWeight: 600,
        cursor: advancing ? 'not-allowed' : 'pointer',
        transition: 'background-color 0.15s',
        whiteSpace: 'nowrap' as const,
      }}
    >
      {advancing ? 'Submitting…' : sampleIndex === totalSamples ? 'Submit Final' : 'Submit'}
    </button>
  );
}

type Phase = 'loading' | 'instructions' | 'pre-survey' | 'editing' | 'survey' | 'post-survey' | 'completed' | 'error';

interface CurrentSample {
  id: number;
  title: string;
  content: string;
  grammarlyScore: number | null;
}

interface Revision {
  id: number;
  revisionNumber: number;
  content: string;
  createdAt: string;
}

interface SessionData {
  id: string;
  participantId: number;
  group: string;
  status: string;
  currentSampleIndex: number;
  totalSamples: number;
  sampleOrder: number[];
  currentSample: CurrentSample | null;
  revisions: Revision[];
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  sampleSubmitted: boolean;
  surveyCompleted: boolean;
  preSurveyCompleted: boolean;
  postSurveyCompleted: boolean;
}

// ── Mobile tab switcher component ──
function MobileTabBar({ activeTab, onTabChange, group }: {
  activeTab: 'editor' | 'chat';
  onTabChange: (tab: 'editor' | 'chat') => void;
  group: string;
}) {
  return (
    <div className="mobile-tab-bar" style={{
      display: 'none', /* shown via CSS on mobile */
      borderBottom: '2px solid #E4E2DC',
      backgroundColor: '#FFFFFF',
    }}>
      <button
        onClick={() => onTabChange('editor')}
        style={{
          flex: 1,
          padding: '12px',
          border: 'none',
          backgroundColor: activeTab === 'editor' ? '#FFFFFF' : '#F4F2ED',
          borderBottom: activeTab === 'editor' ? '2px solid #1A1816' : '2px solid transparent',
          fontFamily: 'var(--font-inter), sans-serif',
          fontSize: '14px',
          fontWeight: activeTab === 'editor' ? 600 : 400,
          color: activeTab === 'editor' ? '#1A1816' : '#6B6760',
          cursor: 'pointer',
        }}
      >
        ✏️ Editor
      </button>
      <button
        onClick={() => onTabChange('chat')}
        style={{
          flex: 1,
          padding: '12px',
          border: 'none',
          backgroundColor: activeTab === 'chat' ? '#FFFFFF' : '#F4F2ED',
          borderBottom: activeTab === 'chat' ? '2px solid #1A1816' : '2px solid transparent',
          fontFamily: 'var(--font-inter), sans-serif',
          fontSize: '14px',
          fontWeight: activeTab === 'chat' ? 600 : 400,
          color: activeTab === 'chat' ? '#1A1816' : '#6B6760',
          cursor: 'pointer',
        }}
      >
        💬 AI Chat{group === 'scaffold' ? ' + Tips' : ''}
      </button>
    </div>
  );
}

export default function StudyPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId;
  const editorTextRef = useRef<string>('');

  const [phase, setPhase] = useState<Phase>('loading');
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [pendingSurvey, setPendingSurvey] = useState<{ sampleId: number; sampleIndex: number; grammarlyScore: number | null } | null>(null);
  const [mobileTab, setMobileTab] = useState<'editor' | 'chat'>('editor');

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch(`/api/session/${sessionId}`);
      if (res.status === 404) {
        setPhase('error');
        setErrorMessage('Session not found');
        return;
      }
      if (!res.ok) {
        setPhase('error');
        setErrorMessage('Failed to load session');
        return;
      }

      const data: SessionData = await res.json();
      setSessionData(data);

      switch (data.status) {
        case 'instructions':
          // After instructions, check if pre-survey is done
          if (!data.preSurveyCompleted) {
            setPhase('instructions');
          } else {
            setPhase('instructions');
          }
          break;
        case 'pre-survey':
          setPhase('pre-survey');
          break;
        case 'in-progress':
          if (data.sampleSubmitted && !data.surveyCompleted && data.currentSample) {
            setPendingSurvey({
              sampleId: data.currentSample.id,
              sampleIndex: data.currentSampleIndex + 1,
              grammarlyScore: data.currentSample.grammarlyScore ?? null,
            });
            setPhase('survey');
          } else {
            setPhase('editing');
          }
          break;
        case 'post-survey':
          setPhase('post-survey');
          break;
        case 'completed':
          setPhase('completed');
          break;
        default:
          setPhase('instructions');
      }
    } catch {
      setPhase('error');
      setErrorMessage('Network error — please check your connection');
    }
  }, [sessionId]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  async function handleBegin() {
    try {
      // Transition to pre-survey phase
      const res = await fetch(`/api/session/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'begin' }),
      });

      if (!res.ok) {
        const data = await res.json();
        setErrorMessage(data.error || 'Failed to begin session');
        return;
      }

      // Show pre-survey instead of going to editing
      setPhase('pre-survey');
    } catch {
      setErrorMessage('Network error — please try again');
    }
  }

  useEffect(() => {
    if (phase === 'editing' && sessionData?.currentSample) {
      fetch(`/api/session/${sessionId}/timing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sampleId: sessionData.currentSample.id,
          sampleIndex: sessionData.currentSampleIndex,
          event: 'start',
        }),
      }).catch(() => {});
    }
  }, [phase, sessionData?.currentSample?.id, sessionData?.currentSampleIndex, sessionId]);

  function handleSubmitForSurvey(data: { sampleId: number; sampleIndex: number; grammarlyScore: number | null }) {
    setPendingSurvey(data);
    setPhase('survey');
  }

  async function handleSurveyComplete() {
    try {
      const res = await fetch(`/api/session/${sessionId}/advance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        setPhase('error');
        setErrorMessage('Failed to advance to next sample');
        return;
      }
    } catch {
      setPhase('error');
      setErrorMessage('Network error — please try again');
      return;
    }
    setPendingSurvey(null);
    editorTextRef.current = '';
    setMobileTab('editor');
    await fetchSession();
  }

  const GROUP_LABEL: Record<string, string> = {
    'zero-shot': 'Zero-Shot',
    iterative: 'Iterative',
    scaffold: 'Scaffold',
  };

  // ─── Loading ────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F2ED' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '3px solid #D8D5CF', borderTopColor: '#1A1816', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
          <p style={{ marginTop: '16px', fontFamily: 'var(--font-ibm-plex-mono), monospace', fontSize: '13px', color: '#9A9790', letterSpacing: '0.06em' }}>
            Loading session…
          </p>
        </div>
      </div>
    );
  }

  // ─── Error ──────────────────────────────────────────────────
  if (phase === 'error') {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F2ED', padding: '20px' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '28px', fontWeight: 700, color: '#1A1816' }}>{errorMessage}</h1>
          <Link href="/register" style={{ marginTop: '16px', display: 'inline-block', fontFamily: 'var(--font-inter), sans-serif', fontSize: '16px', color: '#2558E8' }}>
            Back to Registration
          </Link>
        </div>
      </div>
    );
  }

  // ─── Instructions ───────────────────────────────────────────
  if (phase === 'instructions' && sessionData) {
    return <InstructionsScreen group={sessionData.group} onBegin={handleBegin} />;
  }

  // ─── Pre-Survey (Writing Self-Efficacy) ─────────────────────
  if (phase === 'pre-survey' && sessionData) {
    return (
      <PrePostSurveyForm
        sessionId={sessionId}
        phase="pre"
        onComplete={async () => {
          await fetchSession();
        }}
      />
    );
  }

  // ─── Editing ──────────────────────────────────────────────
  if (phase === 'editing' && sessionData && sessionData.currentSample) {
    const sampleIndex = sessionData.currentSampleIndex + 1;
    const totalSamples = sessionData.totalSamples;
    const group = sessionData.group;

    if (!editorTextRef.current) {
      editorTextRef.current = sessionData.currentSample.content;
    }

    return (
      <div className="study-editing-root" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', backgroundColor: '#F4F2ED' }}>
        {/* ── Top bar ── */}
        <div className="study-top-bar" style={{
          backgroundColor: '#111010',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          minHeight: '56px',
          gap: '12px',
          flexWrap: 'wrap',
        }}>
          {/* Left: sample counter + group badge + grammarly score */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span className="sample-counter" style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '18px', fontWeight: 800, color: '#F4F2ED', letterSpacing: '-0.02em', whiteSpace: 'nowrap' as const }}>
              Sample {sampleIndex}/{totalSamples}
            </span>
            <span className="group-badge" style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '13px', color: '#F4F2ED', backgroundColor: '#2A2824', borderRadius: '6px', padding: '5px 12px', whiteSpace: 'nowrap' as const }}>
              {GROUP_LABEL[group] ?? group}
            </span>
            {sessionData.currentSample.grammarlyScore != null && (
              <span className="grammarly-badge" style={{
                fontFamily: 'var(--font-ibm-plex-mono), monospace',
                fontSize: '13px',
                color: '#D4C17A',
                backgroundColor: '#2A2824',
                borderRadius: '6px',
                padding: '5px 12px',
                whiteSpace: 'nowrap' as const,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}>
                <span style={{ fontSize: '11px', opacity: 0.7, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Grammarly</span>
                <span style={{ fontWeight: 700, fontSize: '15px' }}>{sessionData.currentSample.grammarlyScore}</span>
              </span>
            )}
          </div>

          {/* Center: progress dots */}
          <div className="progress-dots" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {Array.from({ length: totalSamples }, (_, i) => (
              <div key={i} style={{
                width: '24px', height: '5px', borderRadius: '3px',
                backgroundColor: i < sampleIndex ? '#D4C17A' : '#3A3836',
                opacity: i < sampleIndex ? 1 : 0.4,
              }} />
            ))}
          </div>

          {/* Right: submit button */}
          <SubmitRevisionButton
            sessionId={sessionId}
            sample={sessionData.currentSample}
            sampleIndex={sampleIndex}
            totalSamples={totalSamples}
            onSubmitForSurvey={handleSubmitForSurvey}
            getCurrentText={() => editorTextRef.current}
          />
        </div>

        {/* ── Mobile tab bar ── */}
        <MobileTabBar activeTab={mobileTab} onTabChange={setMobileTab} group={group} />

        {/* ── Split view ── */}
        <div className="study-split-view" style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          {/* Left: Editor */}
          <div className="study-editor-pane" style={{ flex: 1, minWidth: 0, overflow: 'hidden', borderRight: '2px solid #E4E2DC' }}>
            <WritingEditor
              sessionId={sessionId}
              sample={sessionData.currentSample}
              revisions={sessionData.revisions}
              sampleIndex={sampleIndex}
              totalSamples={totalSamples}
              group={group}
              onSubmitForSurvey={handleSubmitForSurvey}
              onTextChange={(t) => { editorTextRef.current = t; }}
            />
          </div>
          {/* Right: Chat panel */}
          <div className="study-chat-pane" style={{ width: '480px', flexShrink: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {group === 'scaffold' && <ScaffoldPanel />}
            <div style={{ flex: 1, minHeight: 0 }}>
              <ChatPanel
                key={sessionData.currentSample.id}
                sessionId={sessionId}
                sampleId={sessionData.currentSample.id}
                sampleContent={sessionData.currentSample.content}
                group={group}
                initialMessages={sessionData.messages || []}
              />
            </div>
          </div>
        </div>

        {/* Responsive styles for editing view */}
        <style>{`
          @media (max-width: 768px) {
            .mobile-tab-bar {
              display: flex !important;
            }
            .study-split-view {
              flex-direction: column !important;
            }
            .study-editor-pane {
              border-right: none !important;
              display: ${mobileTab === 'editor' ? 'block' : 'none'} !important;
              flex: 1 !important;
            }
            .study-chat-pane {
              width: 100% !important;
              display: ${mobileTab === 'chat' ? 'flex' : 'none'} !important;
              flex: 1 !important;
            }
            .study-top-bar {
              padding: 8px 12px !important;
              min-height: 48px !important;
            }
            .sample-counter {
              font-size: 15px !important;
            }
            .group-badge {
              font-size: 11px !important;
              padding: 3px 8px !important;
            }
            .progress-dots {
              display: none !important;
            }
          }
          @media (min-width: 769px) and (max-width: 1024px) {
            .study-chat-pane {
              width: 360px !important;
            }
          }
        `}</style>
      </div>
    );
  }

  // ─── Survey ──────────────────────────────────────────────────
  if (phase === 'survey' && pendingSurvey && sessionData) {
    return (
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', backgroundColor: '#F4F2ED' }}>
        <SurveyForm
          sessionId={sessionId}
          sampleId={pendingSurvey.sampleId}
          sampleIndex={pendingSurvey.sampleIndex}
          totalSamples={sessionData.totalSamples}
          grammarlyScore={pendingSurvey.grammarlyScore}
          onSurveyComplete={handleSurveyComplete}
        />
      </div>
    );
  }

  // ─── Post-Survey (Writing Self-Efficacy) ─────────────────────
  if (phase === 'post-survey' && sessionData) {
    return (
      <PrePostSurveyForm
        sessionId={sessionId}
        phase="post"
        onComplete={async () => {
          await fetchSession();
        }}
      />
    );
  }

  // ─── Completed ──────────────────────────────────────────────
  if (phase === 'completed') {
    return <CompletionScreen sessionId={sessionId} />;
  }

  return null;
}
