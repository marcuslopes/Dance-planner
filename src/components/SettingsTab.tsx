import { useAppStore } from '../store/appStore'

export function SettingsTab() {
  const autoCompleteClasses = useAppStore(s => s.autoCompleteClasses)
  const setAutoCompleteClasses = useAppStore(s => s.setAutoCompleteClasses)
  const monthlyBudget = useAppStore(s => s.monthlyBudget)
  const setMonthlyBudget = useAppStore(s => s.setMonthlyBudget)
  const displayCurrency = useAppStore(s => s.displayCurrency)
  const teacherModeEnabled = useAppStore(s => s.teacherModeEnabled)
  const setTeacherModeEnabled = useAppStore(s => s.setTeacherModeEnabled)

  const currencySymbols: Record<string, string> = { CAD: 'CA$', USD: 'US$', BRL: 'R$' }
  const currencySymbol = currencySymbols[displayCurrency] ?? displayCurrency

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

      {/* Teacher Mode */}
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
            Teacher Mode
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Manage the classes and workshops you teach, and track student inscriptions.
          </div>
        </div>
        <button
          type="button"
          onClick={() => setTeacherModeEnabled(!teacherModeEnabled)}
          style={{
            width: 44,
            height: 24,
            borderRadius: 12,
            flexShrink: 0,
            background: teacherModeEnabled ? '#7c3aed' : 'var(--border)',
            border: 'none',
            cursor: 'pointer',
            position: 'relative',
            transition: 'background 0.2s',
            marginTop: 2,
          }}
          aria-label={teacherModeEnabled ? 'Disable teacher mode' : 'Enable teacher mode'}
        >
          <span style={{
            position: 'absolute',
            top: 4,
            left: teacherModeEnabled ? 23 : 4,
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: '#fff',
            transition: 'left 0.2s',
          }} />
        </button>
      </div>

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

      {/* Monthly budget */}
      <div style={{
        padding: '16px',
        background: 'var(--bg-elevated)',
        borderRadius: 14,
        border: '1px solid var(--border)',
        marginBottom: 16,
      }}>
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
            Monthly dance budget
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Track spending against a monthly limit.
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 600 }}>
            {currencySymbol}
          </span>
          <input
            type="number"
            min={0}
            value={monthlyBudget ?? ''}
            onChange={e => {
              const v = e.target.value
              setMonthlyBudget(v === '' ? null : Number(v))
            }}
            placeholder="No budget set"
            style={{
              flex: 1, padding: '8px 12px',
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 10, color: 'var(--text-primary)', fontSize: 14,
              fontFamily: 'inherit', outline: 'none',
            }}
          />
        </div>
      </div>
    </div>
  )
}
