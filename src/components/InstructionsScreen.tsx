'use client';

interface InstructionsScreenProps {
  group: string;
  onBegin: () => void;
}

const GROUP_LABEL: Record<string, string> = {
  'single-shot': 'Single-Shot',
  iterative: 'Iterative',
  scaffold: 'Scaffold',
};

const GROUP_NOTE: Record<string, string> = {
  'single-shot': 'You will have one opportunity to ask the AI for assistance per sample.',
  iterative: 'You can ask the AI for assistance as many times as you like per sample.',
  scaffold: 'You can ask the AI for assistance as many times as you like. A prompt engineering guide will be shown alongside the chat.',
};

export default function InstructionsScreen({ group, onBegin }: InstructionsScreenProps) {
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
          <span style={{ fontFamily: 'var(--font-ibm-plex-mono), monospace', fontSize: '14px', color: '#F4F2ED', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Research Study
          </span>
          <h1 style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '52px', fontWeight: 900, color: '#F4F2ED', letterSpacing: '-0.03em', lineHeight: 1, margin: 0 }}>
            Prompt<br />Engineering<br />Study
          </h1>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Step 1 — done */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid #4A4844', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontFamily: 'var(--font-ibm-plex-mono), monospace', fontSize: '14px', color: '#F4F2ED' }}>1</span>
            </div>
            <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '22px', fontWeight: 600, color: '#7A7770', textDecoration: 'line-through', textDecorationThickness: '1px' }}>Register</span>
          </div>
          {/* Step 2 — active */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#D4C17A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
              <span style={{ fontFamily: 'var(--font-ibm-plex-mono), monospace', fontSize: '14px', fontWeight: 700, color: '#111010' }}>2</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '22px', fontWeight: 700, color: '#F4F2ED', lineHeight: '28px' }}>Writing Tasks</span>
              <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '17px', color: '#F4F2ED', lineHeight: 1.4 }}>3 samples — read, prompt AI, revise.</span>
            </div>
          </div>
          {/* Step 3 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid #4A4844', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontFamily: 'var(--font-ibm-plex-mono), monospace', fontSize: '14px', color: '#F4F2ED' }}>3</span>
            </div>
            <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '22px', fontWeight: 600, color: '#F4F2ED' }}>Complete</span>
          </div>
        </div>
      </div>

      {/* ── Right content panel ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '72px 80px' }}>
        <div style={{ maxWidth: '580px', display: 'flex', flexDirection: 'column', gap: '44px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h2 style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '40px', fontWeight: 800, color: '#1A1816', letterSpacing: '-0.02em', lineHeight: 1.1, margin: 0 }}>
              Study Instructions
            </h2>
            <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '19px', fontWeight: 300, color: '#6B6760', lineHeight: 1.5, margin: 0 }}>
              Please read the following before you begin.
            </p>
          </div>

          {/* Steps list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {[
              'You will revise 3 writing samples with the help of an AI assistant.',
              'Edit the text directly in the editor.',
              'Use the chat panel to ask the AI for suggestions.',
              'There is no time limit — take as long as you need.',
            ].map((text, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#D4C17A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                  <span style={{ fontFamily: 'var(--font-ibm-plex-mono), monospace', fontSize: '13px', fontWeight: 700, color: '#111010' }}>{i + 1}</span>
                </div>
                <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '18px', color: '#1A1816', lineHeight: 1.55, margin: 0 }}>{text}</p>
              </div>
            ))}
          </div>

          {/* Group note */}
          <div style={{
            backgroundColor: '#111010',
            borderRadius: '10px',
            padding: '22px 28px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontFamily: 'var(--font-ibm-plex-mono), monospace', fontSize: '12px', color: '#D4C17A', letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>
                Your group
              </span>
              <span style={{ fontFamily: 'var(--font-ibm-plex-mono), monospace', fontSize: '12px', color: '#F4F2ED', backgroundColor: '#2A2824', borderRadius: '4px', padding: '3px 10px' }}>
                {GROUP_LABEL[group] ?? group}
              </span>
            </div>
            <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '17px', color: '#F4F2ED', lineHeight: 1.5, margin: 0 }}>
              {GROUP_NOTE[group]}
            </p>
          </div>

          {/* CTA */}
          <button
            onClick={onBegin}
            style={{
              backgroundColor: '#D4C17A',
              color: '#111010',
              border: 'none',
              borderRadius: '8px',
              padding: '20px',
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: '20px',
              fontWeight: 700,
              letterSpacing: '-0.01em',
              cursor: 'pointer',
              transition: 'background-color 0.15s',
              width: '100%',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#C4B060')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#D4C17A')}
          >
            Begin
          </button>
        </div>
      </div>
    </div>
  );
}
