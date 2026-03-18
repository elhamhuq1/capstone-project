'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import InstructionsScreen from '@/components/InstructionsScreen';
import WritingEditor from '@/components/WritingEditor';
import ChatPanel from '@/components/ChatPanel';
import ScaffoldPanel from '@/components/ScaffoldPanel';
import SurveyForm from '@/components/SurveyForm';
import CompletionScreen from '@/components/CompletionScreen';

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
    await fetchSession();
  }

  // ─── Loading ────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
            Loading session…
          </p>
        </div>
      </div>
    );
  }

  // ─── Error ──────────────────────────────────────────────────
  if (phase === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {errorMessage}
          </h1>
          <Link
            href="/register"
            className="mt-4 inline-block text-blue-600 underline hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
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
    return (
      <div className="flex min-h-screen flex-col">
        <div className="flex flex-1">
          {/* Left: Editor (takes ~60% width) */}
          <div className="flex-1 min-w-0">
            <WritingEditor
              sessionId={sessionId}
              sample={sessionData.currentSample}
              revisions={sessionData.revisions}
              sampleIndex={sessionData.currentSampleIndex + 1}
              totalSamples={sessionData.totalSamples}
              onSubmitForSurvey={handleSubmitForSurvey}
            />
          </div>
          {/* Right: Chat panel + optional scaffold (~40% width) */}
          <div className="w-[440px] flex-shrink-0 border-l border-stone-200 dark:border-zinc-800 flex flex-col">
            {sessionData.group === 'scaffold' && <ScaffoldPanel />}
            <div className="flex-1 min-h-0">
              <ChatPanel
                key={sessionData.currentSample.id}
                sessionId={sessionId}
                sampleId={sessionData.currentSample.id}
                sampleContent={sessionData.currentSample.content}
                group={sessionData.group}
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
      <div className="flex min-h-screen items-center justify-center bg-stone-50 p-6 dark:bg-zinc-950">
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
