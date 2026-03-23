import { useAppStore } from '../store/appStore'
import type { Currency } from '../types'

const OPTIONS: Currency[] = ['CAD', 'USD', 'BRL']

export function CurrencySelector() {
  const { displayCurrency, setDisplayCurrency } = useAppStore()

  return (
    <div style={{
      display: 'flex',
      background: 'var(--bg-elevated)',
      borderRadius: 999,
      padding: 3,
      gap: 2,
    }}>
      {OPTIONS.map(c => (
        <button
          key={c}
          onClick={() => setDisplayCurrency(c)}
          style={{
            padding: '4px 12px',
            borderRadius: 999,
            border: 'none',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: '0.04em',
            transition: 'all 200ms ease',
            background: displayCurrency === c ? 'var(--accent)' : 'transparent',
            color: displayCurrency === c ? '#fff' : 'var(--text-secondary)',
          }}
        >
          {c}
        </button>
      ))}
    </div>
  )
}
