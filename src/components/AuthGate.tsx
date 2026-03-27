import { type ReactNode } from 'react'
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google'
import { useAppStore } from '../store/appStore'

const CLIENT_ID = '954270548746-t9ifhvm3dvsrpq7p17een7u8bk62jusv.apps.googleusercontent.com'

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
].join(' ')

function LoginScreen() {
  const signIn = useAppStore(s => s.signIn)
  const isLoading = useAppStore(s => s.isLoading)
  const signInError = useAppStore(s => s.signInError)

  const login = useGoogleLogin({
    scope: SCOPES,
    onSuccess: response => signIn(response.access_token),
    onError: () => console.error('Google sign-in failed'),
  })

  if (isLoading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 36 }}>💃</span>
      </div>
    )
  }

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '32px 28px',
    }}>
      <span style={{ fontSize: 52, marginBottom: 12 }}>💃</span>
      <h1 style={{ margin: '0 0 6px', fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', textAlign: 'center' }}>
        Passinho
      </h1>
      <p style={{ margin: '0 0 40px', fontSize: 14, color: 'var(--text-muted)', textAlign: 'center' }}>
        Dance class tracker
      </p>

      <button
        onClick={() => login()}
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 24px', borderRadius: 24, border: 'none',
          background: '#fff', color: '#3c4043',
          fontSize: 15, fontWeight: 600, cursor: 'pointer',
          boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 48 48">
          <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"/>
          <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"/>
          <path fill="#FBBC05" d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z"/>
          <path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"/>
        </svg>
        Sign in with Google
      </button>

      {signInError && (
        <p style={{ textAlign: 'center', fontSize: 12, color: '#f87171', marginTop: 16, maxWidth: 300, wordBreak: 'break-word' }}>
          {signInError}
        </p>
      )}

      <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 16, maxWidth: 280 }}>
        Your data is saved to a Google Sheet in your own Drive. No account needed beyond Google.
      </p>
    </div>
  )
}

export function AuthGate({ children }: { children: ReactNode }) {
  const googleToken = useAppStore(s => s.googleToken)

  return (
    <GoogleOAuthProvider clientId={CLIENT_ID}>
      {googleToken ? <>{children}</> : <LoginScreen />}
    </GoogleOAuthProvider>
  )
}
