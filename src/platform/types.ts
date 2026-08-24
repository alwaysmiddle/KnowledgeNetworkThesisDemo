// WHAT THE HOST CAN DO — the one interface between this app and whatever is
// running it. Today that is a browser tab; later it may be an Electron window.
//
// The seam exists because those two hosts answer the same questions differently,
// NOT because one of them is "the real one". A common misreading is that wrapping
// the app in Electron gives the app Node: it does not. Electron's renderer is a
// Chromium page like any other and never has Node — Node lives in the MAIN
// process, reached over IPC through a preload script. So there is no version of
// this app that "uses Node directly". There is only: the app asks for a
// capability, and something answers.
//
// This interface is that question. `web.ts` answers it with browser APIs; a
// desktop preload would answer it with IPC calls. Callers see neither.
//
// KEEP IT SMALL. Every method here is a promise to implement it twice. Fullscreen
// earns its place because presentation mode cannot work without it. The next
// method, when something actually needs it, is:
//
//   keepAwake(): Promise<() => void>    // navigator.wakeLock / powerSaveBlocker
//
// deliberately absent today — see #195. It is named here only so the next author
// knows the interface was left open on purpose rather than considered finished.

export interface Platform {
  /** which implementation answered. A readout for humans and for drivers — never
   *  a thing to branch on: if a caller needs to know, the interface is wrong. */
  readonly name: 'web' | 'electron'

  /** Take `el` fullscreen. Resolves to whether it actually happened.
   *
   *  THE WEB IMPLEMENTATION REQUIRES A USER GESTURE, so this must be called
   *  synchronously from the click handler that started the presentation — never
   *  after an `await`, which ends the gesture's activation window.
   *
   *  A `false` is not an error and must not be treated as one. Fullscreen can be
   *  refused by policy, by an iframe's permissions, or by the user's settings;
   *  the honest response is a presentation that runs in the window it has. */
  enterFullscreen(el: Element): Promise<boolean>

  /** Leave fullscreen. Safe to call when not fullscreen — a no-op, not a throw. */
  exitFullscreen(): Promise<void>

  /** Is the host fullscreen RIGHT NOW. A query of the host, never state this
   *  module owns: the user can leave fullscreen by pressing F11 or Escape
   *  without telling us, so a cached copy would go stale within one keystroke. */
  isFullscreen(): boolean

  /** Fires whenever the host's fullscreen state changes for ANY reason — our own
   *  calls, F11, Escape, the OS, a request that was silently denied. Returns its
   *  own unsubscribe. This is the only trustworthy source of that bit. */
  onFullscreenChange(fn: () => void): () => void
}
