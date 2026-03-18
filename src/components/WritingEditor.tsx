'use client';

import { useState, useCallback } from 'react';

interface Sample {
  id: number;
  title: string;
  content: string;
}

interface RevisionItem {
  id: number;
  content: string;
  revisionNumber: number;
  createdAt: string;
}

interface WritingEditorProps {
  sessionId: string;
  sample: Sample;
  revisions: RevisionItem[];
  sampleIndex: number;
  totalSamples: number;
  onSubmitForSurvey: (data: { sampleId: number; sampleIndex: number }) => void;
}

export default function WritingEditor({
  sessionId,
  sample,
  revisions: initialRevisions,
  sampleIndex,
  totalSamples,
  onSubmitForSurvey,
}: WritingEditorProps) {
  const [text, setText] = useState(sample.content);
  const [revisions, setRevisions] = useState<RevisionItem[]>(initialRevisions);
  const [saving, setSaving] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [viewingRevision, setViewingRevision] = useState<RevisionItem | null>(null);

  const handleSaveRevision = useCallback(async () => {
    if (saving || text.trim().length === 0) return;
    setSaving(true);
    setSaveMessage('');

    try {
      const res = await fetch(`/api/session/${sessionId}/revision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      });

      if (!res.ok) {
        const data = await res.json();
        setSaveMessage(data.error || 'Save failed');
        return;
      }

      const data = await res.json();
      setRevisions((prev) => [
        ...prev,
        {
          id: Date.now(), // local fallback ID
          content: text,
          revisionNumber: data.revisionNumber,
          createdAt: data.createdAt,
        },
      ]);
      setSaveMessage('Saved!');
      setTimeout(() => setSaveMessage(''), 2000);
    } catch {
      setSaveMessage('Network error');
    } finally {
      setSaving(false);
    }
  }, [sessionId, text, saving]);

  const handleSubmitAndNext = useCallback(async () => {
    const confirmed = window.confirm(
      'Submit this sample and move to the next one? You cannot return to edit this sample.',
    );
    if (!confirmed) return;

    setAdvancing(true);
    try {
      // 1. Save final revision
      const revRes = await fetch(`/api/session/${sessionId}/revision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      });
      if (!revRes.ok) {
        const data = await revRes.json();
        setSaveMessage(data.error || 'Failed to save revision');
        return;
      }

      // 2. Record timing complete (fire-and-forget)
      fetch(`/api/session/${sessionId}/timing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sampleId: sample.id,
          sampleIndex: sampleIndex - 1,
          event: 'complete',
        }),
      }).catch(() => {});

      // 3. Hand off to survey — do NOT call /advance
      onSubmitForSurvey({ sampleId: sample.id, sampleIndex });
    } catch {
      setSaveMessage('Network error');
    } finally {
      setAdvancing(false);
    }
  }, [sessionId, text, sample.id, sampleIndex, onSubmitForSurvey]);

  const formatTimestamp = (ts: string) => {
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return ts;
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-stone-50 dark:bg-zinc-950">
      {/* ─── Header bar ─── */}
      <header className="border-b border-stone-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-stone-900 dark:text-zinc-100">
              {sample.title}
            </h1>
            <p className="mt-0.5 text-sm text-stone-500 dark:text-zinc-500">
              Sample {sampleIndex} of {totalSamples}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Progress dots */}
            <div className="flex gap-1.5" aria-label={`Sample ${sampleIndex} of ${totalSamples}`}>
              {Array.from({ length: totalSamples }, (_, i) => (
                <div
                  key={i}
                  className={`h-2.5 w-2.5 rounded-full transition-colors ${
                    i < sampleIndex - 1
                      ? 'bg-emerald-500'
                      : i === sampleIndex - 1
                        ? 'bg-blue-600'
                        : 'bg-stone-300 dark:bg-zinc-600'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* ─── Main content ─── */}
      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-5 p-6">
        {/* ─── Editor panel ─── */}
        <div className="flex flex-1 flex-col">
          {viewingRevision ? (
            /* Viewing a past revision */
            <div className="flex flex-1 flex-col">
              <div className="mb-3 flex items-center justify-between rounded-lg bg-amber-50 px-4 py-2 dark:bg-amber-900/20">
                <span className="text-sm font-medium text-amber-800 dark:text-amber-300">
                  Viewing Revision {viewingRevision.revisionNumber}
                </span>
                <button
                  onClick={() => setViewingRevision(null)}
                  className="rounded-md bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:hover:bg-amber-900/60"
                >
                  Back to editing
                </button>
              </div>
              <div className="flex-1 rounded-xl border border-stone-200 bg-stone-100 p-5 font-mono text-sm leading-relaxed text-stone-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300" style={{ minHeight: '400px' }}>
                {viewingRevision.content}
              </div>
            </div>
          ) : (
            /* Active editing */
            <div className="flex flex-1 flex-col">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="flex-1 resize-none rounded-xl border border-stone-300 bg-white p-5 font-mono text-sm leading-relaxed text-stone-800 shadow-sm transition-colors focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:focus:border-blue-500 dark:focus:ring-blue-900/40"
                style={{ minHeight: '400px' }}
                placeholder="Edit the writing sample..."
                aria-label="Writing sample editor"
              />

              {/* Action buttons */}
              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={handleSaveRevision}
                  disabled={saving || text.trim().length === 0}
                  className="rounded-lg border border-stone-300 bg-white px-5 py-2.5 text-sm font-medium text-stone-700 shadow-sm transition-all hover:bg-stone-50 hover:shadow disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                >
                  {saving ? 'Saving…' : 'Save Revision'}
                </button>
                <button
                  onClick={handleSubmitAndNext}
                  disabled={advancing}
                  className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-blue-700 hover:shadow disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-700 dark:hover:bg-blue-600"
                >
                  {advancing
                    ? 'Submitting…'
                    : sampleIndex === totalSamples
                      ? 'Submit Final Sample'
                      : 'Submit & Next Sample →'}
                </button>
                {saveMessage && (
                  <span
                    className={`text-sm font-medium ${
                      saveMessage === 'Saved!'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {saveMessage}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ─── Revision sidebar ─── */}
        <aside className="w-64 flex-shrink-0">
          <div className="rounded-xl border border-stone-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <div className="border-b border-stone-200 px-4 py-3 dark:border-zinc-800">
              <h2 className="text-sm font-semibold text-stone-800 dark:text-zinc-200">
                Revision History
              </h2>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {revisions.length === 0 ? (
                <p className="px-4 py-6 text-center text-xs text-stone-400 dark:text-zinc-500">
                  No revisions saved yet.
                  <br />
                  Click &ldquo;Save Revision&rdquo; to create a snapshot.
                </p>
              ) : (
                <ul className="divide-y divide-stone-100 dark:divide-zinc-800">
                  {revisions.map((rev) => (
                    <li key={`rev-${rev.revisionNumber}`}>
                      <button
                        onClick={() =>
                          setViewingRevision(
                            viewingRevision?.revisionNumber === rev.revisionNumber
                              ? null
                              : rev,
                          )
                        }
                        className={`w-full px-4 py-3 text-left transition-colors hover:bg-stone-50 dark:hover:bg-zinc-800 ${
                          viewingRevision?.revisionNumber === rev.revisionNumber
                            ? 'bg-blue-50 dark:bg-blue-900/20'
                            : ''
                        }`}
                      >
                        <div className="text-sm font-medium text-stone-700 dark:text-zinc-300">
                          Revision {rev.revisionNumber}
                        </div>
                        <div className="mt-0.5 text-xs text-stone-400 dark:text-zinc-500">
                          {formatTimestamp(rev.createdAt)}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
