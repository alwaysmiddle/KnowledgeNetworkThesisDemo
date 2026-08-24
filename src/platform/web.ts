// THE BROWSER'S ANSWER to `Platform` — the only implementation that ships today.
//
// Every method degrades rather than throws. A presentation that opens in a window
// because fullscreen was refused is a working presentation; one that dies on an
// unhandled rejection is not, and the difference is a try/catch.

import type { Platform } from './types'

export const webPlatform: Platform = {
  name: 'web',

  async enterFullscreen(el) {
    // requestFullscreen REJECTS (rather than resolving false) when it is refused:
    // no user activation, a Permissions-Policy block, an OS that will not oblige.
    // All of those mean the same thing to a caller — you did not get it — so they
    // collapse into one `false` here.
    try {
      await el.requestFullscreen()
      return document.fullscreenElement !== null
    } catch {
      return false
    }
  },

  async exitFullscreen() {
    // Guarded because exitFullscreen() rejects when nothing is fullscreen, and
    // "leave fullscreen" asked of a window that already left is a no-op, not a
    // failure. Callers exit on a keypress and on unmount; both can arrive after
    // the user already pressed F11.
    if (document.fullscreenElement === null) return
    try {
      await document.exitFullscreen()
    } catch {
      /* already gone, or the host refused to let go — either way we are done */
    }
  },

  isFullscreen() {
    return document.fullscreenElement !== null
  },

  onFullscreenChange(fn) {
    document.addEventListener('fullscreenchange', fn)
    return () => document.removeEventListener('fullscreenchange', fn)
  },
}
