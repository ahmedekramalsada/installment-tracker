import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ToastProvider, useToast } from './components/Toast.tsx'
import { setGlobalErrorHandler } from './lib/api.ts'

function ErrorHandlerConnector() {
  const { addToast } = useToast()

  useEffect(() => {
    setGlobalErrorHandler((message: string) => {
      addToast('error', message)
    })
  }, [addToast])

  return null
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <ErrorHandlerConnector />
      <App />
    </ToastProvider>
  </StrictMode>,
)
