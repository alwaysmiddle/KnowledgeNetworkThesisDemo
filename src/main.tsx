import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import WalkTiersGallery from './experiments/walk-tiers/WalkTiersGallery.tsx'

// Spike gate — experiments render INSTEAD of the app, never inside it, so a
// mock can't touch the Studio. Plain load path is byte-for-byte the old one.
const spike = new URLSearchParams(window.location.search).get('spike')

createRoot(document.getElementById('root')!).render(
  <StrictMode>{spike === 'walk-tiers' ? <WalkTiersGallery /> : <App />}</StrictMode>,
)
