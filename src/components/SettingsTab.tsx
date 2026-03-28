import { useState } from 'react'
import { useAppStore } from '../store/appStore'
import { CheckCircle, ExternalLink } from 'lucide-react'

export function SettingsTab() {
  const autoCompleteClasses = useAppStore(s => s.autoCompleteClasses)
  const setAutoCompleteClasses = useAppStore(s => s.setAutoCompleteClasses)
  const notionToken = useAppStore(s => s.notionToken)
  const notionRootPageId = useAppStore(s => s.notionRootPageId)
  const setNotionConfig = useAppStore(s => s.setNotionConfig)
  const disconnectNotion = useAppStore(s => s.disconnectNotion)

  const [tokenInput, setTokenInput] = useState('')
  const [pageIdInput, setPageIdInput] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const isConnected = !!(notionToken && notionRootPageId)

  async function handleConnect() {
    const t = tokenInput.trim()
    const p = pageIdInput.trim()
    if (!t || !p) return
    setIsSaving(true)
    try {
      await setNotionConfig(t, p)
      setTokenInput('')
      setPageIdInput('')
    } finally {
      setIsSaving(false)
    }
  }

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

      {/* Notion Video Integration */}
      <div style={{
        padding: '16px',
        background: 'var(--bg-elevated)',
        borderRadius: 14,
        border: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 18 }}>📝</span>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
            Notion Video Storage
          </div>
          {isConnected && (
            <CheckCircle size={16} style={{ color: '#10b981', marginLeft: 'auto' }} />
          )}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 16 }}>
          Store compressed class videos in Notion, organized by dance style.
          Videos are compressed to ≤10 MB automatically.
        </div>

        {isConnected ? (
          <>
            <div style={{
              padding: '10px 12px', borderRadius: 10,
              background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)',
              marginBottom: 12,
            }}>
              <div style={{ fontSize: 12, color: '#10b981', fontWeight: 600, marginBottom: 2 }}>
                Connected
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', wordBreak: 'break-all' }}>
                Page: {notionRootPageId}
              </div>
            </div>
            <button
              onClick={disconnectNotion}
              style={{
                width: '100%', padding: '10px', borderRadius: 10,
                border: '1px solid var(--border)', background: 'transparent',
                color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Disconnect Notion
            </button>
          </>
        ) : (
          <>
            {/* Setup instructions */}
            <details style={{ marginBottom: 14 }}>
              <summary style={{ fontSize: 12, color: '#7c3aed', fontWeight: 600, cursor: 'pointer', marginBottom: 8 }}>
                How to set up Notion
              </summary>
              <ol style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.8, paddingLeft: 18, margin: '8px 0 0' }}>
                <li>
                  Go to{' '}
                  <a href="https://www.notion.so/my-integrations" target="_blank" rel="noopener noreferrer"
                    style={{ color: '#7c3aed', display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                    notion.so/my-integrations <ExternalLink size={10} />
                  </a>
                </li>
                <li>Create a new integration (e.g. "Dance Planner")</li>
                <li>Copy the Internal Integration Token</li>
                <li>In Notion, create a page called "Dance Planner Videos"</li>
                <li>Open page menu → Connections → add your integration</li>
                <li>Copy the page ID from the URL (the part after the last <code>-</code>)</li>
              </ol>
            </details>

            <label style={{ display: 'block', marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 5, fontWeight: 600 }}>
                Integration Token
              </div>
              <input
                type="password"
                placeholder="secret_..."
                value={tokenInput}
                onChange={e => setTokenInput(e.target.value)}
                autoComplete="off"
                style={inputStyle}
              />
            </label>

            <label style={{ display: 'block', marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 5, fontWeight: 600 }}>
                Root Page ID
              </div>
              <input
                type="text"
                placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                value={pageIdInput}
                onChange={e => setPageIdInput(e.target.value)}
                autoComplete="off"
                style={inputStyle}
              />
            </label>

            <button
              onClick={handleConnect}
              disabled={!tokenInput.trim() || !pageIdInput.trim() || isSaving}
              style={{
                width: '100%', padding: '12px', borderRadius: 12, border: 'none',
                background: tokenInput && pageIdInput
                  ? 'linear-gradient(135deg, #7c3aed, #7c3aedcc)'
                  : 'rgba(255,255,255,0.06)',
                color: tokenInput && pageIdInput ? '#fff' : 'var(--text-muted)',
                fontSize: 14, fontWeight: 700,
                cursor: tokenInput && pageIdInput ? 'pointer' : 'default',
              }}
            >
              {isSaving ? 'Connecting…' : 'Connect Notion'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid var(--border)',
  background: 'var(--bg-card)',
  color: 'var(--text-primary)',
  fontSize: 14,
  boxSizing: 'border-box',
  outline: 'none',
}
