import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './shared/components/ui/ErrorBoundary.tsx'

function getRootElement(): HTMLElement {
  let root = document.getElementById('root')
  if (!root) {
    root = document.createElement('div')
    root.id = 'root'
    document.body.appendChild(root)
  }
  return root
}

// Auto-recover if Vite encounters a dynamic import preload error due to a new deployment
if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', () => {
    const lastRetry = window.sessionStorage.getItem('vite_preload_retry');
    const now = Date.now();
    if (!lastRetry || now - parseInt(lastRetry, 10) > 15000) {
      window.sessionStorage.setItem('vite_preload_retry', now.toString());
      window.location.reload();
    }
  });
}

function mount() {
  const container = getRootElement()
  const root = createRoot(container)
  root.render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  )
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount, { once: true })
} else {
  mount()
}

