import Link from 'next/link';

interface CompletionScreenProps {
  sessionId: string;
}

export default function CompletionScreen({ sessionId }: CompletionScreenProps) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F4F2ED' }}>
      {/* ── Left dark panel ── */}
      <div style={{
        width: '440px',
        flexShrink: 0,
        backgroundColor: '#111010',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '56px 52px',
        minHeight: '100vh',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontFamily: 'var(--font-ibm-plex-mono), monospace', fontSize: '16px', color: '#F4F2ED', letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>
            Research Study
          </span>
          <h1 style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '52px', fontWeight: 900, color: '#F4F2ED', letterSpacing: '-0.03em', lineHeight: 1, margin: 0 }}>
            Prompt<br />Engineering<br />Study
          </h1>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {/* All steps done */}
          {[{ num: '1', label: 'Register' }, { num: '2', label: 'Writing Tasks' }].map((s) => (
            <div key={s.num} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid #4A4844', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontFamily: 'var(--font-ibm-plex-mono), monospace', fontSize: '14px', color: '#F4F2ED' }}>{s.num}</span>
              </div>
              <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '22px', fontWeight: 600, color: '#7A7770', textDecoration: 'line-through', textDecorationThickness: '1px' }}>{s.label}</span>
            </div>
          ))}
          {/* Step 3 — active/done */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#D4C17A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontFamily: 'var(--font-ibm-plex-mono), monospace', fontSize: '14px', fontWeight: 700, color: '#111010' }}>3</span>
            </div>
            <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '24px', fontWeight: 700, color: '#F4F2ED' }}>Complete</span>
          </div>
        </div>
      </div>

      {/* ── Right content panel ── */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', padding: '80px 96px' }}>
        <div style={{ maxWidth: '620px', display: 'flex', flexDirection: 'column', gap: '40px' }}>
          {/* Hero */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{
              width: '72px', height: '72px', borderRadius: '50%',
              backgroundColor: '#D4C17A',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                <path d="M8 18L15 25L28 11" stroke="#111010" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '56px', fontWeight: 900, color: '#1A1816', letterSpacing: '-0.03em', lineHeight: 1, margin: 0 }}>
              You&apos;re all<br />done.
            </h2>
          </div>

          <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '22px', color: '#4A4844', lineHeight: 1.6, margin: 0 }}>
            Thank you for participating. Your responses have been recorded and will contribute to research on how prompt engineering skill affects AI-assisted writing.
          </p>

          {/* Session card */}
          <div style={{
            backgroundColor: '#FFFFFF',
            border: '2px solid #E4E2DC',
            borderRadius: '12px',
            padding: '28px 32px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}>
            <span style={{ fontFamily: 'var(--font-ibm-plex-mono), monospace', fontSize: '13px', color: '#9A9790', letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>
              Your session
            </span>
            <div style={{ display: 'flex', gap: '40px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '32px', fontWeight: 800, color: '#1A1816', lineHeight: '40px' }}>3</span>
                <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '16px', color: '#6B6760' }}>Samples revised</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontFamily: 'var(--font-ibm-plex-mono), monospace', fontSize: '28px', fontWeight: 700, color: '#1A1816', lineHeight: '40px', wordBreak: 'break-all' as const }}>{sessionId.slice(0, 8)}</span>
                <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '16px', color: '#6B6760' }}>Session ID</span>
              </div>
            </div>
          </div>

          <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '18px', color: '#9A9790', lineHeight: 1.5, margin: 0 }}>
            You may close this window. If you have questions about this study, contact the research team.
          </p>

          <Link
            href="/register"
            style={{
              display: 'inline-block',
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: '16px',
              color: '#6B6760',
              textDecoration: 'underline',
              textUnderlineOffset: '3px',
            }}
          >
            Return to registration
          </Link>
        </div>
      </div>
    </div>
  );
}
