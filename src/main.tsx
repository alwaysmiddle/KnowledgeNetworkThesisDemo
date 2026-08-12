import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// The DS scrollbar driver, vendored verbatim (#94). base.css draws all three
// states; this only sets the data-sb attribute that selects between them, so the
// pair is useless split up. Imported AFTER index.css to match the DS's own
// delivery note ("drop one <script> after the stylesheet"), and for its side
// effect only — it is a self-installing IIFE with no exports.
import './ds/assets/scrollbars.js'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
