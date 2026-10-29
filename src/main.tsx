import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/enhanced-design.css'
import App from './App.tsx'
import './styles/portal-design.css'
import './styles/creative-screens.css'
import './styles/mobile-responsiveness.css'
import { startAutomaticUpdates } from './lib/automaticUpdates'

startAutomaticUpdates()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
