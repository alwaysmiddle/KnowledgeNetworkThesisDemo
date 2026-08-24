// THE SEAM, and the whole of it.
//
// NOTHING UNDER src/ MAY EVER IMPORT 'electron'. That is enforced here by
// CONSTRUCTION rather than by discipline: a desktop shell's preload script — the
// one file where importing `electron` is legal, and it lives outside src/ —
// publishes `window.knPlatform`, and this picks it up. Adding a desktop wrapper
// later therefore costs zero changes to any caller and zero changes to src/.
//
// DETECTION, NOT A BUILD FLAG. One bundle runs in both hosts, which keeps
// `import.meta.env` out of this repo (it is absent today) and keeps the spike
// drivers exercising the real web path in a real browser rather than a stub.
//
// Read once at module load, which is safe in both hosts: a preload script runs
// before the page's own bundle, so the property is already there if it is coming
// at all. `globalThis.window?.` rather than `window.` because vitest runs
// `environment: 'node'`, where there is no window — importing this module from a
// test must not throw.

import { webPlatform } from './web'
import type { Platform } from './types'

export type { Platform }

declare global {
  interface Window {
    knPlatform?: Platform
  }
}

export const platform: Platform = globalThis.window?.knPlatform ?? webPlatform
