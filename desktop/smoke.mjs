// #202 — does the real app run in the real desktop host?
//
// Not a unit test, and not a screenshot. The four things this proves cannot be
// proved anywhere else:
//
//   1. `app://` SERVED THE BUNDLE. `dist/index.html` asks for absolute
//      `/assets/…` paths; a host that could not answer those gives a blank
//      window and no error. So "#root has children" is a protocol assertion
//      wearing a DOM assertion's clothes. (Do NOT "fix" a blank window with
//      Vite's `base: './'` — the paths are correct; the host has to be.)
//   2. THE PRELOAD WON. `data-present-host` reads `electron` only if
//      `window.knPlatform` was published and `src/platform/index.ts` picked it
//      up. `web` here means the seam quietly fell back and the whole slice is
//      decorative.
//   3. FULLSCREEN CROSSES THE PROCESS BOUNDARY. `setFullScreen` from main never
//      fires the DOM's `fullscreenchange`, so the readout only moves if
//      main → preload cache → onFullscreenChange → session.ts → React all hold.
//      This is the divergence the seam exists to absorb.
//   4. STORAGE SURVIVES A RESTART. Two launches, one `pkt.` key. This is the
//      assertion `file://` fails — its origin is opaque and has no localStorage
//      at all — and it is the entire reason `app://` is registered.
//
// Plus one GATE on an open decision: `screens()` is answered by the web
// implementation on purpose (see preload.ts). If Electron will not grant
// `window-management`, the answer is `[]` and the desktop build would be worse
// at finding a projector than the browser build — the exact inversion #211
// exists to prevent. Better to fail here than to discover it in #204.
//
// Requires a built app: `npm run build` at the REPO ROOT first.
// Run:  npm run smoke        (from desktop/)
// Exits nonzero on any failed check or any page error.

import { createRequire } from 'node:module'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const MAIN = join(HERE, 'out', 'main.cjs')
const DIST_INDEX = join(HERE, '..', 'dist', 'index.html')

const require = createRequire(import.meta.url)
const { _electron } = require('playwright-core')
// The `electron` package's main export is the path to the binary, which is what
// playwright wants. Resolving it explicitly rather than letting playwright guess
// keeps this working whatever directory it is invoked from.
const electronPath = require('electron')

if (!existsSync(MAIN)) {
  console.error('no out/main.cjs — run `npm run build` in desktop/ first')
  process.exit(1)
}
if (!existsSync(DIST_INDEX)) {
  console.error('no dist/index.html — run `npm run build` at the repo root first')
  process.exit(1)
}

const errors = []
const checks = []
const ok = (name, cond, detail = '') => {
  checks.push(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? '   ' + detail : ''}`)
  if (!cond) errors.push(name + (detail ? ' — ' + detail : ''))
}

// DESKTOP_LOAD=dist is the whole point: without it main.ts loads the dev server
// and this would prove that Vite works, which we already know.
const launch = () =>
  _electron.launch({
    executablePath: electronPath,
    args: [MAIN],
    cwd: HERE,
    env: { ...process.env, DESKTOP_LOAD: 'dist' },
  })

const watch = (page) => {
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push('console: ' + m.text())
  })
}

const KEY = 'pkt.smoke.restart'
const STAMP = 'written-by-run-1'

// ── run 1 ────────────────────────────────────────────────────────────────────
{
  const app = await launch()
  const page = await app.firstWindow()
  watch(page)

  await page.waitForSelector('#root > *', { timeout: 20000 })
  ok('app:// served the bundle — #root has content', (await page.$$eval('#root > *', (e) => e.length)) > 0)

  const url = page.url()
  ok('and it is the app:// origin, not a file:// or a dev server', url.startsWith('app://local/'), url)

  // A leftover draft from a previous run would move the step count under every
  // assertion below. Cleared here, and NOT in run 2 — run 2's whole job is to
  // find something still there.
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await page.waitForSelector('#root > *')
  await page.waitForTimeout(600)

  const present = page.getByTitle('Present', { exact: true })
  ok('the toolbar offers Present', (await present.count()) === 1)
  await present.first().click()
  await page.waitForTimeout(700)

  ok('the deck is on screen', await page.locator('[aria-label="presentation"]').isVisible())

  const attr = (n) => page.$eval('[data-present-step]', (el, k) => el.getAttribute(k), n)

  // THE ONE THING THIS SLICE EXISTS TO SHOW.
  const host = await attr('data-present-host')
  ok('the preload won — the seam reports the desktop host', host === 'electron', `data-present-host=${host}`)

  // THE GATE on the screens() decision. Evaluated straight after a real click so
  // the transient user activation getScreenDetails() wants is still live — which
  // is also how a caller would really reach it (#204 asks while the user is
  // choosing a display).
  const screens = await page.evaluate(() => window.knPlatform.screens())
  ok(
    'screens() answers from the renderer, no IPC needed',
    Array.isArray(screens) && screens.length > 0,
    Array.isArray(screens)
      ? `${screens.length} display(s): ${screens.map((s) => s.label || '(unnamed)').join(', ')}`
      : String(screens),
  )
  if (Array.isArray(screens) && screens.length === 0) {
    checks.push(
      'NOTE  an empty screens() means this host denied window-management. The fix is one line in ' +
        'preload.ts — swap the delegation for ipcRenderer.invoke(\'screens\') over screen.getAllDisplays(). See #202.',
    )
  }

  const step = async () => Number(await attr('data-present-step'))
  const step0 = await step()
  await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(300)
  ok('the deck works in the new host — → advances', (await step()) === step0 + 1, `${step0} → ${await step()}`)

  // ── FULLSCREEN FROM MAIN — the F11-class divergence ────────────────────────
  // No DOM event fires for a window put fullscreen by the main process, so the
  // readout only moves if main → preload cache → onFullscreenChange →
  // session.ts → React all hold.
  //
  // THREE TRANSITIONS, NOT ONE, AND THAT IS THE POINT. The first version of
  // main.ts pushed `win.isFullScreen()` from inside the transition handlers,
  // which on Windows answers with the state the window is LEAVING — so every
  // pushed value was inverted. A single enter-and-assert passes that bug: the
  // stale `false` on the way in is indistinguishable from a readout that has not
  // updated yet. Only going back and forth catches it.
  const setFs = (want) =>
    app.evaluate(({ BrowserWindow }, w) => BrowserWindow.getAllWindows()[0].setFullScreen(w), want)

  // Polled rather than slept on: the transition is animated and its length is
  // the OS's business, not ours.
  const readoutBecomes = async (want, ms = 4000) => {
    const deadline = Date.now() + ms
    for (;;) {
      if ((await attr('data-present-fullscreen')) === want) return true
      if (Date.now() > deadline) return false
      await page.waitForTimeout(100)
    }
  }

  // The INVOKE direction first: clicking Present called the seam's own
  // enterFullscreen(), which is an IPC round trip in this host.
  ok('presenting took the host fullscreen through the seam', await readoutBecomes('1'))

  // Then the EVENT direction — changes the app did not ask for, which is what
  // F11 and the OS look like.
  await setFs(false)
  ok('a fullscreen change made in MAIN reaches the app', await readoutBecomes('0'))
  await setFs(true)
  ok('and back up', await readoutBecomes('1'))
  await setFs(false)
  ok('and down again — the readout tracks state, not a count of events', await readoutBecomes('0'))

  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, STAMP])
  await app.close()
}

// ── run 2: a genuinely separate process ──────────────────────────────────────
{
  const app = await launch()
  const page = await app.firstWindow()
  watch(page)

  await page.waitForSelector('#root > *', { timeout: 20000 })
  const read = await page.evaluate((k) => localStorage.getItem(k), KEY)
  ok('localStorage survived the restart — this is why app:// and not file://', read === STAMP, `read back ${read}`)

  await page.evaluate((k) => localStorage.removeItem(k), KEY)
  await app.close()
}

console.log(checks.join('\n'))
if (errors.length) {
  console.error('\n' + errors.length + ' problem(s):\n' + errors.map((e) => '  · ' + e).join('\n'))
  process.exit(1)
}
console.log('\nall ' + checks.filter((c) => c.startsWith('PASS')).length + ' checks passed')
