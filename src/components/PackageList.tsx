import { useAppStore } from '../store/appStore'
import { PackageCard } from './PackageCard'
import { EmptyState } from './EmptyState'
import { CurrencySelector } from './CurrencySelector'
import { Plus, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'

export function PackageList() {
  const { packages, openForm, refreshRates, isLoading } = useAppStore()
  const [refreshing, setRefreshing] = useState(false)

  const active = packages.filter(p => !p.archivedAt)
  const archived = packages.filter(p => !!p.archivedAt)

  async function handleRefresh() {
    setRefreshing(true)
    await refreshRates()
    setRefreshing(false)
    toast.success('Rates refreshed!')
  }

  if (isLoading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 32 }}>💃</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '20px 20px 12px',
        paddingTop: 'max(20px, var(--safe-top))',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 22 }}>💃</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>Passinho</span>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
            Dance class tracker
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={handleRefresh}
            style={{
              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              borderRadius: 10, padding: 8, cursor: 'pointer', color: 'var(--text-secondary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'transform 600ms ease',
              transform: refreshing ? 'rotate(360deg)' : 'rotate(0deg)',
            }}
            title="Refresh exchange rates"
          >
            <RefreshCw size={16} />
          </button>
          <CurrencySelector />
        </div>
      </div>

      {/* Content */}
      {packages.length === 0 ? (
        <EmptyState onAdd={() => openForm()} />
      ) : (
        <div className="scroll-area" style={{ flex: 1, padding: '16px 16px 100px' }}>
          {active.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {active.map((pkg, i) => (
                <PackageCard key={pkg.id} pkg={pkg} index={i} />
              ))}
            </div>
          )}

          {archived.length > 0 && (
            <details style={{ marginTop: 24 }}>
              <summary style={{
                cursor: 'pointer', fontSize: 13, fontWeight: 600,
                color: 'var(--text-muted)', textTransform: 'uppercase',
                letterSpacing: '0.06em', padding: '8px 4px', listStyle: 'none',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span>Archived packages ({archived.length})</span>
              </summary>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12, opacity: 0.6 }}>
                {archived.map((pkg, i) => (
                  <PackageCard key={pkg.id} pkg={pkg} index={i} />
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => openForm()}
        style={{
          position: 'fixed',
          bottom: 'calc(64px + env(safe-area-inset-bottom) + 16px)',
          right: 'max(16px, calc(50vw - 215px + 16px))',
          width: 58, height: 58,
          borderRadius: '50%', border: 'none',
          background: 'linear-gradient(135deg, var(--accent), #6d28d9)',
          color: '#fff', cursor: 'pointer',
          boxShadow: '0 4px 24px rgba(124,58,237,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 30,
          transition: 'transform 150ms ease, box-shadow 150ms ease',
        }}
        onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.92)' }}
        onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
        onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.92)' }}
        onTouchEnd={e => { e.currentTarget.style.transform = 'scale(1)' }}
        aria-label="Add package"
      >
        <Plus size={28} strokeWidth={2.5} />
      </button>
    </div>
  )
}
