'use client';

import { useState, FormEvent } from 'react';

export default function RegistrationForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed. Please try again.');
        return;
      }

      window.location.href = `/study/${data.sessionId}`;
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    width: '100%',
    backgroundColor: '#FFFFFF',
    border: '2px solid #D8D5CF',
    borderRadius: '8px',
    padding: '18px 22px',
    fontFamily: 'var(--font-inter), sans-serif',
    fontSize: '16px',
    color: '#1A1816',
    outline: 'none',
    transition: 'border-color 0.15s',
  } as React.CSSProperties;

  const labelStyle = {
    fontFamily: 'var(--font-ibm-plex-mono), monospace',
    fontSize: '12px',
    color: '#9A9790',
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    display: 'block',
    marginBottom: '10px',
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Full Name */}
      <div>
        <label htmlFor="reg-name" style={labelStyle}>Full Name</label>
        <input
          id="reg-name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Jordan Smith"
          style={inputStyle}
          onFocus={(e) => (e.currentTarget.style.borderColor = '#1A1816')}
          onBlur={(e) => (e.currentTarget.style.borderColor = '#D8D5CF')}
        />
      </div>

      {/* Email */}
      <div>
        <label htmlFor="reg-email" style={labelStyle}>Email Address</label>
        <input
          id="reg-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="jordan@university.edu"
          style={inputStyle}
          onFocus={(e) => (e.currentTarget.style.borderColor = '#1A1816')}
          onBlur={(e) => (e.currentTarget.style.borderColor = '#D8D5CF')}
        />
      </div>

      {/* Study Group — read-only */}
      <div>
        <label style={labelStyle}>Study Group</label>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#EEECE7',
          border: '2px solid #D8D5CF',
          borderRadius: '8px',
          padding: '18px 22px',
        }}>
          <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '18px', fontStyle: 'italic', color: '#6B6760' }}>
            Randomly assigned at start
          </span>
          <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '14px', color: '#9A9790' }}>
            No selection needed
          </span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div role="alert" style={{
          padding: '14px 18px',
          backgroundColor: '#FEF2F2',
          border: '1px solid #FECACA',
          borderRadius: '8px',
          fontFamily: 'var(--font-inter), sans-serif',
          fontSize: '15px',
          color: '#B91C1C',
        }}>
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        style={{
          marginTop: '8px',
          width: '100%',
          backgroundColor: loading ? '#C4B060' : '#D4C17A',
          color: '#111010',
          border: 'none',
          borderRadius: '8px',
          padding: '20px',
          fontFamily: 'var(--font-inter), sans-serif',
          fontSize: '20px',
          fontWeight: 700,
          letterSpacing: '-0.01em',
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'background-color 0.15s',
        }}
        onMouseEnter={(e) => { if (!loading) e.currentTarget.style.backgroundColor = '#C4B060'; }}
        onMouseLeave={(e) => { if (!loading) e.currentTarget.style.backgroundColor = '#D4C17A'; }}
      >
        {loading ? 'Registering…' : 'Begin Study'}
      </button>
    </form>
  );
}
