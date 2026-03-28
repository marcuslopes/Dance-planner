import { useAppStore } from '../store/appStore'

export function SettingsTab() {
  const autoCompleteClasses = useAppStore(s => s.autoCompleteClasses)
  const setAutoCompleteClasses = useAppStore(s => s.setAutoCompleteClasses)

  return (
    <div style={{
      flex: 1,
      overflowY: 'auto',
      padding: '20px 20px 100px',
      maxWidth: 430,
      margin: '0 auto',
      width: '100%',
    }}>
      <h2 style={{ margin: '0 0 24px', fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>
        Settings
      </h2>

      {/* Auto-complete past classes */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 16,
        padding: '16px',
        background: 'var(--bg-elevated)',
        borderRadius: 14,
        border: '1px solid var(--border)',
        marginBottom: 16,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
            Auto-complete past classes
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Automatically marks scheduled classes as attended after their date passes.
            Only applies to classes linked to a package.
          </div>
        </div>
        <button
          type="button"
          onClick={() => setAutoCompleteClasses(!autoCompleteClasses)}
          style={{
            width: 44,
            height: 24,
            borderRadius: 12,
            flexShrink: 0,
            background: autoCompleteClasses ? '#7c3aed' : 'var(--border)',
            border: 'none',
            cursor: 'pointer',
            position: 'relative',
            transition: 'background 0.2s',
            marginTop: 2,
          }}
          aria-label={autoCompleteClasses ? 'Disable auto-complete' : 'Enable auto-complete'}
        >
          <span style={{
            position: 'absolute',
            top: 4,
            left: autoCompleteClasses ? 23 : 4,
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: '#fff',
            transition: 'left 0.2s',
          }} />
        </button>
      </div>
    </div>
  )
}
