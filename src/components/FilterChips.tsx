interface FilterChipsProps {
  items: string[]
  active: string | null
  onSelect: (v: string | null) => void
  label?: string
}

export function FilterChips({ items, active, onSelect, label }: FilterChipsProps) {
  if (items.length < 2) return null

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflowX: 'auto', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', padding: '0 20px' }}>
      {label && (
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>
          {label}
        </span>
      )}
      {items.map(item => {
        const isActive = active === item
        return (
          <button
            key={item}
            onClick={() => onSelect(isActive ? null : item)}
            style={{
              flexShrink: 0,
              padding: '6px 14px',
              borderRadius: 20,
              border: isActive ? 'none' : '1px solid var(--border)',
              background: isActive ? 'var(--accent)' : 'var(--bg-card)',
              color: isActive ? '#fff' : 'var(--text-secondary)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 150ms ease',
              fontFamily: 'inherit',
            }}
          >
            {item}
          </button>
        )
      })}
    </div>
  )
}
