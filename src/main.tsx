import { StrictMode } from 'react'
// Capture ?code= BEFORE App → supabase detectSessionInUrl strips it.
import './lib/oauthBootstrap'
// Capture the Revenue Monster ?rm_return=1 redirect before the router mounts.
import './lib/paymentReturnBootstrap'
import './i18n'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
