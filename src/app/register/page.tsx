import RegistrationForm from '@/components/RegistrationForm';

export default function RegisterPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#F4F2ED' }}>
      {/* ── Left dark panel — hidden on mobile, shown on desktop ── */}
      <div className="sidebar-panel" style={{
        backgroundColor: '#111010',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '56px 52px',
      }}>
        {/* Title */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{
            fontFamily: 'var(--font-ibm-plex-mono), monospace',
            fontSize: '14px',
            color: '#F4F2ED',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}>
            Research Study
          </span>
          <h1 style={{
            fontFamily: 'var(--font-inter), sans-serif',
            fontSize: '52px',
            fontWeight: 900,
            color: '#F4F2ED',
            letterSpacing: '-0.03em',
            lineHeight: 1,
            margin: 0,
          }}>
            Prompt<br />Engineering<br />Study
          </h1>
        </div>

        {/* Steps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '40px' }}>
          {/* Step 1 — active */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%',
              backgroundColor: '#D4C17A',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, marginTop: '2px',
            }}>
              <span style={{ fontFamily: 'var(--font-ibm-plex-mono), monospace', fontSize: '13px', fontWeight: 700, color: '#111010' }}>1</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '26px', fontWeight: 600, color: '#F4F2ED', lineHeight: '32px' }}>Register</span>
              <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '18px', color: '#F4F2ED', lineHeight: 1.4 }}>Enter your name and email to get started.</span>
            </div>
          </div>
          {/* Step 2 */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%',
              border: '2px solid #6A6660',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, marginTop: '2px',
            }}>
              <span style={{ fontFamily: 'var(--font-ibm-plex-mono), monospace', fontSize: '13px', color: '#F4F2ED' }}>2</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '26px', fontWeight: 600, color: '#F4F2ED', lineHeight: '32px' }}>Writing Tasks</span>
              <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '18px', color: '#F4F2ED', lineHeight: 1.4 }}>3 samples — read, prompt AI, revise.</span>
            </div>
          </div>
          {/* Step 3 */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%',
              border: '2px solid #6A6660',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, marginTop: '2px',
            }}>
              <span style={{ fontFamily: 'var(--font-ibm-plex-mono), monospace', fontSize: '13px', color: '#F4F2ED' }}>3</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '26px', fontWeight: 600, color: '#F4F2ED', lineHeight: '32px' }}>Complete</span>
              <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '18px', color: '#F4F2ED', lineHeight: 1.4 }}>Survey after each sample, then you&apos;re done.</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="main-panel" style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}>
        <div style={{ maxWidth: '560px', width: '100%', display: 'flex', flexDirection: 'column', gap: '44px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h2 style={{
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: 'clamp(28px, 5vw, 40px)',
              fontWeight: 800,
              color: '#1A1816',
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
              margin: 0,
            }}>
              Create your profile
            </h2>
            <p style={{
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: '19px',
              fontWeight: 300,
              color: '#6B6760',
              lineHeight: 1.5,
              margin: 0,
            }}>
              All data is collected anonymously and used only for this study.
            </p>
          </div>
          <RegistrationForm />
        </div>
      </div>

      {/* Responsive styles */}
      <style>{`
        .sidebar-panel {
          width: 440px;
          flex-shrink: 0;
          min-height: 100vh;
        }
        .main-panel {
          padding: 72px 80px;
        }
        /* Two-column layout on desktop */
        @media (min-width: 769px) {
          div:has(> .sidebar-panel) {
            flex-direction: row !important;
          }
          .sidebar-panel {
            min-height: 100vh;
          }
        }
        @media (max-width: 768px) {
          .sidebar-panel {
            width: 100% !important;
            min-height: auto !important;
            padding: 32px 24px !important;
          }
          .sidebar-panel h1 {
            font-size: 36px !important;
          }
          .main-panel {
            padding: 32px 20px !important;
          }
        }
      `}</style>
    </div>
  );
}
