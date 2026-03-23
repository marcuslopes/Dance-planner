import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// When a new service worker takes over (skipWaiting + clientsClaim), the page's
// already-loaded script tags reference old hashed filenames the new SW doesn't
// have → blank screen. Reload so the new HTML + new assets load together.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload()
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
