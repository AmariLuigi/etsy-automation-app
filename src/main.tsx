import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Mock Electron API for browser development
if (typeof window.electronAPI === 'undefined') {
  console.warn('Electron API not available - using browser mock')
    ; (window as any).electronAPI = {
      openFolderDialog: async () => {
        alert('This feature requires Electron. Please run with: npm run electron:dev')
        return null
      },
      analyzeFolder: async () => null,
      readFileAsBase64: async () => null,
      platform: 'browser',
    }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
