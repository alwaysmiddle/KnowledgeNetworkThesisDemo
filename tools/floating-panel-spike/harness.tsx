// #76 verification mount — a standalone page that exists ONLY so drive.mjs can
// exercise the real FloatingPanel with real pointer input. It is not part of the
// app (nothing imports it from src/); the app gets a FloatingPanel when #54
// mounts one. Two hosts, each a bare `position: relative` box — the exact host
// contract FloatingPanel documents — so the driver tests the primitive alone:
//   host-move : drag / resize / clamp / persist
//   host-hide : auto-hide fade + wake
//
// No StrictMode here (unlike src/main.tsx): its double-invoked effects would make
// the auto-hide idle timer fire twice on mount and turn the fade timing flaky.
// This is a test rig, so determinism beats matching the app's mount exactly.
import { createRoot } from 'react-dom/client'
import type { CSSProperties } from 'react'
import { FloatingPanel } from '@/ui/FloatingPanel'
import '../../src/index.css'

const host: CSSProperties = {
  position: 'relative',
  border: '1px solid var(--border-rule)',
  background: 'var(--surface-canopy)',
}

// Rendered directly, defining no free-standing component — same shape as
// src/main.tsx — so the Fast-Refresh lint rule (meaningless for a driven test
// rig) has no local component to complain about.
createRoot(document.getElementById('root')!).render(
  <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
    <div aria-label="host-move" style={{ ...host, width: 700, height: 450 }}>
      <FloatingPanel id="harness" defaultRect={{ x: 60, y: 50, w: 220, h: 160 }} title="Toolbox">
        <div style={{ padding: 8, fontSize: 12 }}>drag my handle · resize my edges</div>
      </FloatingPanel>
    </div>
    <div aria-label="host-hide" style={{ ...host, width: 700, height: 260 }}>
      <FloatingPanel
        id="harness-hide"
        defaultRect={{ x: 60, y: 40, w: 200, h: 120 }}
        title="Auto-hide"
        autoHide
        idleMs={400}
      >
        <div style={{ padding: 8, fontSize: 12 }}>I fade when idle, wake on activity</div>
      </FloatingPanel>
    </div>
  </div>,
)
