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
  group: string;
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
        { id: Date.now(), content: text, revisionNumber: data.revisionNumber, createdAt: data.createdAt },
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

      fetch(`/api/session/${sessionId}/timing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sampleId: sample.id, sampleIndex: sampleIndex - 1, event: 'complete' }),
      }).catch(() => {});

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
    } catch { return ts; }
  };

  const revisionTabs = [
    { label: 'Original', content: sample.content, key: 'original' },
    ...revisions.map((r) => ({ label: `Rev. ${r.revisionNumber} — ${formatTimestamp(r.createdAt)}`, content: r.content, key: `rev-${r.revisionNumber}` })),
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#FFFFFF' }}>
      {/* ── Editor header ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #EEECE7',
        padding: '20px 48px 20px 48px',
      }}>
        <span style={{ fontFamily: 'var(--font-ibm-plex-mono), monospace', fontSize: '14px', color: '#6B6760', letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>
          Writing Sample
        </span>
        <span style={{ fontFamily: 'var(--font-ibm-plex-mono), monospace', fontSize: '14px', color: '#6B6760' }}>
          {revisions.length} revision{revisions.length !== 1 ? 's' : ''} saved
        </span>
      </div>

      {/* ── Editor body ── */}
      <div style={{ flex: 1, overflow: 'hidden', padding: '40px 48px' }}>
        {viewingRevision ? (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontFamily: 'var(--font-ibm-plex-mono), monospace', fontSize: '13px', color: '#9A9790', letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>
                Viewing Revision {viewingRevision.revisionNumber}
              </span>
              <button
                onClick={() => setViewingRevision(null)}
                style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '14px', color: '#1A1816', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
              >
                Back to editing
              </button>
            </div>
            <div style={{
              flex: 1,
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: '20px',
              lineHeight: 1.75,
              color: '#1A1816',
              whiteSpace: 'pre-wrap',
              overflowY: 'auto',
              opacity: 0.7,
            }}>
              {viewingRevision.content}
            </div>
          </div>
        ) : (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={{
              width: '100%',
              height: '100%',
              resize: 'none',
              border: 'none',
              outline: 'none',
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: '20px',
              lineHeight: 1.75,
              color: '#1A1816',
              backgroundColor: 'transparent',
              padding: 0,
            }}
            placeholder="Edit the writing sample..."
            aria-label="Writing sample editor"
          />
        )}
      </div>

      {/* ── Revision history bar ── */}
      <div style={{
        borderTop: '2px solid #E4E2DC',
        padding: '16px 48px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
      }}>
        <span style={{ fontFamily: 'var(--font-ibm-plex-mono), monospace', fontSize: '12px', color: '#9A9790', letterSpacing: '0.08em', textTransform: 'uppercase' as const, flexShrink: 0 }}>
          Revision History
        </span>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' as const }}>
          {revisionTabs.map((tab) => {
            const isActive = tab.key === 'original'
              ? viewingRevision === null && revisions.length === 0
              : viewingRevision?.revisionNumber === parseInt(tab.key.replace('rev-', ''));
            const isCurrentEdit = tab.key === `rev-${revisions.length}` || (revisions.length === 0 && tab.key === 'original');
            const isLast = tab.key === (revisions.length > 0 ? `rev-${revisions.length}` : 'original') && viewingRevision === null;

            return (
              <button
                key={tab.key}
                onClick={() => {
                  if (tab.key === 'original') {
                    setViewingRevision({ id: 0, content: sample.content, revisionNumber: 0, createdAt: '' });
                  } else {
                    const rev = revisions.find(r => r.revisionNumber === parseInt(tab.key.replace('rev-', '')));
                    setViewingRevision(rev || null);
                  }
                }}
                style={{
                  fontFamily: 'var(--font-inter), sans-serif',
                  fontSize: '16px',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: `1.5px solid ${isLast || isActive ? '#111010' : '#D8D5CF'}`,
                  backgroundColor: isLast || isActive ? '#111010' : '#F4F2ED',
                  color: isLast || isActive ? '#F4F2ED' : '#1A1816',
                  cursor: 'pointer',
                }}
              >
                {tab.label}
              </button>
            );
            void isCurrentEdit;
          })}
        </div>

        {/* Save / submit actions */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
          {saveMessage && (
            <span style={{ fontFamily: 'var(--font-ibm-plex-mono), monospace', fontSize: '13px', color: saveMessage === 'Saved!' ? '#16A34A' : '#DC2626' }}>
              {saveMessage}
            </span>
          )}
          <button
            onClick={handleSaveRevision}
            disabled={saving || text.trim().length === 0}
            style={{
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: '15px',
              padding: '10px 20px',
              borderRadius: '6px',
              border: '1.5px solid #D8D5CF',
              backgroundColor: '#F4F2ED',
              color: '#1A1816',
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.5 : 1,
            }}
          >
            {saving ? 'Saving…' : 'Save Revision'}
          </button>
        </div>
      </div>
    </div>
  );
}
