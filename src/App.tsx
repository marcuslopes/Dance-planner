import { useEffect, Component, type ReactNode, type ErrorInfo } from 'react'
import { Toaster } from 'react-hot-toast'
import { useAppStore } from './store/appStore'
import { PackageList } from './components/PackageList'
import { PackageDetail } from './components/PackageDetail'
import { PackageForm } from './components/PackageForm'
import { AuthGate } from './components/AuthGate'

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null }
  static getDerivedStateFromError(error: Error) { return { error } }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error(error, info) }
  render() {
    const { error } = this.state
    if (error) return (
      <div style={{ padding: 24, color: '#f87171', fontFamily: 'monospace', fontSize: 13, wordBreak: 'break-word' }}>
        <div style={{ fontSize: 28, marginBottom: 12 }}>💥 App crashed</div>
        <div style={{ marginBottom: 8, fontWeight: 700 }}>{(error as Error).message}</div>
        <pre style={{ whiteSpace: 'pre-wrap', opacity: 0.7 }}>{(error as Error).stack}</pre>
        <button onClick={() => this.setState({ error: null })} style={{ marginTop: 16, padding: '8px 16px', borderRadius: 8, border: 'none', background: '#7c3aed', color: '#fff', cursor: 'pointer' }}>
          Retry
        </button>
      </div>
    )
    return this.props.children
  }
}

function AppInner() {
  const init = useAppStore(s => s.init)

  useEffect(() => {
    init().catch(err => {
      console.error('init failed:', err)
    })
  }, [init])

  return (
    <>
      <PackageList />
      <PackageDetail />
      <PackageForm />
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: 'var(--bg-elevated)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 500,
          },
          success: {
            iconTheme: { primary: 'var(--success)', secondary: 'var(--bg-elevated)' },
          },
        }}
      />
    </>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthGate>
        <AppInner />
      </AuthGate>
    </ErrorBoundary>
  )
}
