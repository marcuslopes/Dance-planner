import type { Package } from '../types'

interface TeacherCardProps {
  name: string
  packages: Package[]
  onClick: () => void
  index?: number
}

export function TeacherCard({ name, packages, onClick, index = 0 }: TeacherCardProps) {
  const active = packages.filter(p => !p.archivedAt)
  const archived = packages.filter(p => !!p.archivedAt)

  const uniqueStyles = [...new Set(
    packages.map(p => p.label.trim()).filter(Boolean)
  )].slice(0, 4)

  // Collect colors for style pills using the package colors
  const styleColorMap: Record<string, string> = {}
  for (const pkg of packages) {
    if (pkg.label.trim() && !styleColorMap[pkg.label.trim()]) {
      styleColorMap[pkg.label.trim()] = pkg.color
    }
  }

  return (
    <button
      onClick={onClick}
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: '16px',
        cursor: 'pointer',
        transition: 'transform 150ms ease, box-shadow 150ms ease',
        animation: `fadeSlideUp 300ms ease both`,
        animationDelay: `${index * 60}ms`,
      }}
      onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.98)' }}
      onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
      onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.98)' }}
      onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
            {name}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: uniqueStyles.length > 0 ? 10 : 0 }}>
            {active.length > 0 && `${active.length} active`}
            {active.length > 0 && archived.length > 0 && ' · '}
            {archived.length > 0 && `${archived.length} completed`}
            {packages.length === 0 && 'No packages yet'}
          </div>

          {uniqueStyles.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {uniqueStyles.map(style => (
                <span
                  key={style}
                  style={{
                    display: 'inline-block',
                    padding: '3px 10px',
                    borderRadius: 10,
                    fontSize: 12,
                    fontWeight: 600,
                    background: (styleColorMap[style] ?? '#7c3aed') + '22',
                    color: styleColorMap[style] ?? '#7c3aed',
                    border: `1px solid ${(styleColorMap[style] ?? '#7c3aed')}44`,
                  }}
                >
                  {style}
                </span>
              ))}
            </div>
          )}
        </div>

        <div style={{
          flexShrink: 0,
          width: 40, height: 40,
          borderRadius: 12,
          background: 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em',
        }}>
          {name.slice(0, 2).toUpperCase()}
        </div>
      </div>
    </button>
  )
}
