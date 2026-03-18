'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import InstructionsScreen from '@/components/InstructionsScreen';
import WritingEditor from '@/components/WritingEditor';
import ChatPanel from '@/components/ChatPanel';
import ScaffoldPanel from '@/components/ScaffoldPanel';
import SurveyForm from '@/components/SurveyForm';
import CompletionScreen from '@/components/CompletionScreen';

// ── Submit button lives in the top bar but needs editor state via callback ──
function SubmitRevisionButton({ sessionId, sample, sampleIndex, totalSamples, onSubmitForSurvey, getCurrentText }: {
  sessionId: string;
  sample: { id: number; content: string };
  sampleIndex: number;
  totalSamples: number;
  onSubmitForSurvey: (data: { sampleId: number; sampleIndex: number }) => void;
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

      onSubmitForSurvey({ sampleId: sample.id, sampleIndex });
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
        padding: '12px 28px',
        fontFamily: 'var(--font-inter), sans-serif',
        fontSize: '16px',
        fontWeight: 600,
        cursor: advancing ? 'not-allowed' : 'pointer',
        transition: 'background-color 0.15s',
      }}
    >
      {advancing ? 'Submitting…' : sampleIndex === totalSamples ? 'Submit Final Sample' : 'Submit Revision'}
    </button>
  );
}

type Phase = 'loading' | 'instructions' | 'editing' | 'survey' | 'completed' | 'error';

interface CurrentSample {
  id: number;
  title: string;
  content: string;
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
}

export default function StudyPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId;
  const editorTextRef = useRef<string>('');

  const [phase, setPhase] = useState<Phase>('loading');
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [pendingSurvey, setPendingSurvey] = useState<{ sampleId: number; sampleIndex: number } | null>(null);

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

      // Map session status to UI phase
      switch (data.status) {
        case 'instructions':
          setPhase('instructions');
          break;
        case 'in-progress':
          // Resume logic: check if sample was submitted but survey not yet done
          if (data.sampleSubmitted && !data.surveyCompleted && data.currentSample) {
            setPendingSurvey({
              sampleId: data.currentSample.id,
              sampleIndex: data.currentSampleIndex + 1,
            });
            setPhase('survey');
          } else {
            setPhase('editing');
          }
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

      // Re-fetch session to sync state
      await fetchSession();
    } catch {
      setErrorMessage('Network error — please try again');
    }
  }

  // ─── Timing start: fire when editing phase loads for a sample ─────
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

  function handleSubmitForSurvey(data: { sampleId: number; sampleIndex: number }) {
    setPendingSurvey(data);
    setPhase('survey');
  }

  async function handleSurveyComplete() {
    // Advance to next sample (or complete)
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
    await fetchSession();
  }

  const GROUP_LABEL: Record<string, string> = {
    'single-shot': 'Single-Shot Mode',
    iterative: 'Iterative Mode',
    scaffold: 'Scaffold Mode',
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
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F2ED' }}>
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

  // ─── Editing ──────────────────────────────────────────────
  if (phase === 'editing' && sessionData && sessionData.currentSample) {
    const sampleIndex = sessionData.currentSampleIndex + 1;
    const totalSamples = sessionData.totalSamples;
    const group = sessionData.group;

    // Initialize ref so submit has access even if user doesn't type
    if (!editorTextRef.current) {
      editorTextRef.current = sessionData.currentSample.content;
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', backgroundColor: '#F4F2ED' }}>
        {/* ── Top bar ── */}
        <div style={{
          backgroundColor: '#111010',
          height: '72px',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 52px',
        }}>
          {/* Left: sample counter + group badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
            <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '26px', fontWeight: 800, color: '#F4F2ED', letterSpacing: '-0.02em' }}>
              Sample {sampleIndex} of {totalSamples}
            </span>
            <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '15px', color: '#F4F2ED', backgroundColor: '#2A2824', borderRadius: '6px', padding: '8px 16px' }}>
              {GROUP_LABEL[group] ?? group}
            </span>
          </div>

          {/* Center: progress dots */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {Array.from({ length: totalSamples }, (_, i) => (
              <div key={i} style={{
                width: '32px', height: '6px', borderRadius: '3px',
                backgroundColor: i < sampleIndex - 1 ? '#D4C17A' : i === sampleIndex - 1 ? '#D4C17A' : '#3A3836',
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

        {/* ── Split view ── */}
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          {/* Left: Editor */}
          <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', borderRight: '2px solid #E4E2DC' }}>
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
          <div style={{ width: '480px', flexShrink: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
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
          onSurveyComplete={handleSurveyComplete}
        />
      </div>
    );
  }

  // ─── Completed ──────────────────────────────────────────────
  if (phase === 'completed') {
    return <CompletionScreen sessionId={sessionId} />;
  }

  return null;
}
