interface EmptyStateProps {
  onAdd: () => void
}

export function EmptyState({ onAdd }: EmptyStateProps) {
  return (
    <div className="animate-fade-in" style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      flex: 1, padding: '32px 24px', gap: 24, textAlign: 'center',
    }}>
      {/* Dancer SVG illustration */}
      <svg width="140" height="140" viewBox="0 0 140 140" fill="none">
        {/* Glow */}
        <circle cx="70" cy="70" r="60" fill="rgba(124,58,237,0.08)" />
        {/* Body */}
        <ellipse cx="70" cy="95" rx="16" ry="22" fill="rgba(124,58,237,0.2)" />
        {/* Head */}
        <circle cx="70" cy="42" r="14" fill="rgba(124,58,237,0.3)" stroke="var(--accent)" strokeWidth="2" />
        {/* Left arm raised */}
        <path d="M 58 65 Q 38 50 30 36" stroke="var(--accent-light)" strokeWidth="3" strokeLinecap="round" fill="none" />
        {/* Right arm out */}
        <path d="M 82 65 Q 100 58 110 48" stroke="var(--accent-light)" strokeWidth="3" strokeLinecap="round" fill="none" />
        {/* Left leg */}
        <path d="M 62 117 Q 52 125 46 130" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" fill="none" />
        {/* Right leg kicked */}
        <path d="M 78 117 Q 96 115 108 106" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" fill="none" />
        {/* Stars / sparkles */}
        <circle cx="28" cy="32" r="3" fill="var(--accent-pink)" />
        <circle cx="112" cy="44" r="2" fill="var(--accent-light)" />
        <circle cx="108" cy="102" r="3" fill="var(--accent-pink)" />
        <circle cx="34" cy="128" r="2" fill="var(--accent)" />
      </svg>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>
          Your dance journey starts here
        </h2>
        <p style={{ margin: 0, fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          Add a class package from your instructor and track every class you take.
        </p>
      </div>

      <button
        onClick={onAdd}
        style={{
          background: 'var(--accent)',
          color: '#fff',
          border: 'none',
          borderRadius: 16,
          padding: '14px 32px',
          fontSize: 16,
          fontWeight: 700,
          cursor: 'pointer',
          boxShadow: '0 4px 24px rgba(124,58,237,0.4)',
          letterSpacing: '0.02em',
        }}
      >
        Add first package
      </button>
    </div>
  )
}
