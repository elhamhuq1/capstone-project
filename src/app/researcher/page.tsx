'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface Session {
  sessionId: string;
  participantName: string;
  participantEmail: string;
  group: string;
  status: string;
  samplesCompleted: number;
  totalPrompts: number;
  totalTimeSeconds: number;
  startedAt: string;
  completedAt: string | null;
}

const GROUP_FILTERS = [
  { label: 'All Groups', value: '' },
  { label: 'Single-Shot', value: 'single-shot' },
  { label: 'Iterative', value: 'iterative' },
  { label: 'Scaffold', value: 'scaffold' },
] as const;

const GROUP_BADGE: Record<string, { bg: string; color: string }> = {
  scaffold:     { bg: '#D4C17A', color: '#111010' },
  iterative:    { bg: '#1A1816', color: '#F4F2ED' },
  'single-shot':{ bg: '#4A4844', color: '#F4F2ED' },
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function avgSurvey(sessions: Session[]) {
  const completed = sessions.filter(s => s.samplesCompleted === 3);
  if (completed.length === 0) return '—';
  // totalTimeSeconds is available; avg survey score isn't exposed in this endpoint
  // show session completion rate instead
  return `${Math.round((completed.length / sessions.length) * 100)}%`;
}

export default function ResearcherPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [search, setSearch] = useState('');

  const fetchSessions = useCallback(async (group: string) => {
    setLoading(true);
    setError('');
    try {
      const url = group ? `/api/researcher/sessions?group=${group}` : '/api/researcher/sessions';
      const res = await fetch(url);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setSessions(await res.json());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSessions(activeFilter); }, [activeFilter, fetchSessions]);

  const filtered = search.trim()
    ? sessions.filter(s =>
        s.participantName.toLowerCase().includes(search.toLowerCase()) ||
        s.participantEmail.toLowerCase().includes(search.toLowerCase())
      )
    : sessions;

  const counts = {
    total: sessions.length,
    'single-shot': sessions.filter(s => s.group === 'single-shot').length,
    iterative:     sessions.filter(s => s.group === 'iterative').length,
    scaffold:      sessions.filter(s => s.group === 'scaffold').length,
    samplesTotal:  sessions.reduce((acc, s) => acc + s.samplesCompleted, 0),
  };

  const mono = (extra?: React.CSSProperties): React.CSSProperties => ({
    fontFamily: 'var(--font-ibm-plex-mono), monospace',
    ...extra,
  });
  const sans = (extra?: React.CSSProperties): React.CSSProperties => ({
    fontFamily: 'var(--font-inter), sans-serif',
    ...extra,
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>

      {/* ━━ Stats bar — full bleed white strip ━━ */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderBottom: '2px solid #E4E2DC',
        display: 'flex',
        alignItems: 'stretch',
        gap: '0',
        padding: '24px 60px',
        margin: '0 -60px',   /* bleed past main padding */
      }}>
        {([
          { value: counts.total,            label: 'Participants' },
          'divider',
          { value: counts['single-shot'],   label: 'Single-Shot' },
          { value: counts.iterative,        label: 'Iterative' },
          { value: counts.scaffold,         label: 'Scaffold' },
          'divider',
          { value: counts.samplesTotal,     label: 'Samples Collected' },
          { value: avgSurvey(sessions),     label: 'Completion Rate' },
        ] as Array<{ value: string | number; label: string } | 'divider'>).map((item, i) => {
          if (item === 'divider') {
            return <div key={i} style={{ width: '2px', backgroundColor: '#E4E2DC', margin: '0 40px', alignSelf: 'stretch', flexShrink: 0 }} />;
          }
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginRight: '48px' }}>
              <span style={sans({ fontSize: '36px', fontWeight: 800, color: '#1A1816', lineHeight: '1', letterSpacing: '-0.02em' })}>
                {item.value}
              </span>
              <span style={mono({ fontSize: '11px', color: '#9A9790', letterSpacing: '0.08em', textTransform: 'uppercase' })}>
                {item.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* ━━ Toolbar: search + filter chips ━━ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '24px 0 20px' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, maxWidth: '360px' }}>
          <svg style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
            width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="5" stroke="#9A9790" strokeWidth="1.5" />
            <path d="M11 11L14 14" stroke="#9A9790" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            style={sans({
              width: '100%',
              padding: '11px 16px 11px 38px',
              backgroundColor: '#FFFFFF',
              border: '2px solid #D8D5CF',
              borderRadius: '8px',
              fontSize: '15px',
              color: '#1A1816',
              outline: 'none',
            })}
            onFocus={e => e.currentTarget.style.borderColor = '#1A1816'}
            onBlur={e => e.currentTarget.style.borderColor = '#D8D5CF'}
          />
        </div>

        {/* Group filter chips */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {GROUP_FILTERS.map(f => {
            const active = activeFilter === f.value;
            return (
              <button key={f.value} onClick={() => setActiveFilter(f.value)} style={sans({
                padding: '10px 18px',
                borderRadius: '8px',
                border: `2px solid ${active ? '#111010' : '#D8D5CF'}`,
                backgroundColor: active ? '#111010' : '#FFFFFF',
                color: active ? '#F4F2ED' : '#1A1816',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.1s',
                whiteSpace: 'nowrap',
              })}>
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ━━ Loading ━━ */}
      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
          <div style={{ width: '22px', height: '22px', borderRadius: '50%', border: '2px solid #D8D5CF', borderTopColor: '#1A1816', animation: 'spin 0.8s linear infinite' }} />
          <span style={mono({ marginLeft: '12px', fontSize: '13px', color: '#9A9790' })}>Loading sessions…</span>
        </div>
      )}

      {/* ━━ Error ━━ */}
      {error && !loading && (
        <div style={{ padding: '18px 22px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', ...sans({ fontSize: '15px', color: '#B91C1C' }) }}>
          {error}
        </div>
      )}

      {/* ━━ Empty ━━ */}
      {!loading && !error && filtered.length === 0 && (
        <div style={{ padding: '64px 0', textAlign: 'center', border: '2px dashed #D8D5CF', borderRadius: '12px' }}>
          <p style={sans({ fontSize: '17px', color: '#9A9790', margin: 0 })}>
            {search ? `No results for "${search}"` : activeFilter ? `No ${activeFilter} sessions yet.` : 'No sessions yet.'}
          </p>
        </div>
      )}

      {/* ━━ Table ━━ */}
      {!loading && !error && filtered.length > 0 && (
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '2px solid #E4E2DC', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '200px 1fr 160px 100px 100px 1fr 100px',
            borderBottom: '2px solid #1A1816',
            padding: '14px 24px',
          }}>
            {['Name', 'Email', 'Group', 'Samples', 'Prompts', 'Started', 'Actions'].map((h, i) => (
              <span key={h} style={mono({
                fontSize: '12px', fontWeight: 700, color: '#1A1816',
                letterSpacing: '0.07em', textTransform: 'uppercase',
                textAlign: i === 6 ? 'right' : 'left',
              })}>
                {h}
              </span>
            ))}
          </div>

          {/* Rows */}
          {filtered.map((s, idx) => {
            const badge = GROUP_BADGE[s.group] ?? { bg: '#4A4844', color: '#F4F2ED' };
            const isComplete = s.samplesCompleted === 3;
            return (
              <div
                key={s.sessionId}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '200px 1fr 160px 100px 100px 1fr 100px',
                  alignItems: 'center',
                  padding: '18px 24px',
                  borderBottom: idx < filtered.length - 1 ? '1px solid #EEECE7' : 'none',
                  backgroundColor: idx % 2 === 1 ? '#FAFAF8' : '#FFFFFF',
                  transition: 'background-color 0.1s',
                }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F4F2ED')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = idx % 2 === 1 ? '#FAFAF8' : '#FFFFFF')}
              >
                <span style={sans({ fontSize: '16px', fontWeight: 600, color: '#1A1816' })}>
                  {s.participantName}
                </span>
                <span style={sans({ fontSize: '15px', color: '#6B6760' })}>
                  {s.participantEmail}
                </span>
                <div>
                  <span style={mono({
                    fontSize: '12px',
                    backgroundColor: badge.bg, color: badge.color,
                    borderRadius: '4px', padding: '4px 10px',
                    display: 'inline-block',
                  })}>
                    {s.group}
                  </span>
                </div>
                <span style={sans({ fontSize: '16px', color: isComplete ? '#1A1816' : '#9A9790', fontWeight: isComplete ? 600 : 400 })}>
                  {s.samplesCompleted} / 3
                </span>
                <span style={sans({ fontSize: '16px', color: '#1A1816' })}>
                  {s.totalPrompts}
                </span>
                <span style={sans({ fontSize: '14px', color: '#6B6760' })}>
                  {formatDate(s.startedAt)}
                </span>
                <div style={{ textAlign: 'right' }}>
                  <Link href={`/researcher/${s.sessionId}`} style={sans({
                    fontSize: '14px', fontWeight: 600, color: '#2558E8', textDecoration: 'none',
                  })}>
                    View →
                  </Link>
                </div>
              </div>
            );
          })}

          {/* Footer */}
          <div style={{
            borderTop: '1px solid #E4E2DC',
            padding: '12px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span style={mono({ fontSize: '12px', color: '#9A9790', letterSpacing: '0.04em' })}>
              {filtered.length} session{filtered.length !== 1 && 's'}
              {search && ` matching "${search}"`}
            </span>
            <a href="/api/researcher/export" download style={mono({
              fontSize: '12px', color: '#6B6760', textDecoration: 'none', letterSpacing: '0.04em',
            })}>
              Download CSV ↓
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
