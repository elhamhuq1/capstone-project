import Link from 'next/link';

export const metadata = {
  title: 'Researcher Dashboard',
  description: 'Study session browser and data export',
};

export default function ResearcherLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F4F2ED', display: 'flex', flexDirection: 'column' }}>
      {/* ── Top bar ── */}
      <header style={{
        backgroundColor: '#111010',
        height: '72px',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 60px',
        position: 'sticky',
        top: 0,
        zIndex: 30,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <h1 style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '24px', fontWeight: 800, color: '#F4F2ED', letterSpacing: '-0.02em', margin: 0 }}>
            Researcher Dashboard
          </h1>
          <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '13px', color: '#F4F2ED', backgroundColor: '#2A2824', borderRadius: '6px', padding: '6px 14px', letterSpacing: '0.02em' }}>
            ADMIN
          </span>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <Link
            href="/register"
            style={{
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: '15px',
              color: '#F4F2ED',
              border: '2px solid #3A3836',
              borderRadius: '8px',
              padding: '10px 22px',
              textDecoration: 'none',
              transition: 'border-color 0.15s',
            }}
          >
            ← Study
          </Link>
          <a
            href="/api/researcher/export"
            download
            style={{
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: '15px',
              fontWeight: 600,
              color: '#111010',
              backgroundColor: '#D4C17A',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 24px',
              textDecoration: 'none',
              transition: 'background-color 0.15s',
            }}
          >
            Export CSV
          </a>
        </div>
      </header>

      {/* ── Content ── */}
      <main style={{ flex: 1, padding: '0 60px 48px' }}>
        {children}
      </main>
    </div>
  );
}
