// #195 — presentation mode, slice 1. Does the furniture actually go away, does
// the deck actually move, and does leaving it put you back where you were?
//
// None of those is a unit test. playback.test.ts proves the projection and the
// cursor arithmetic; only a real browser proves that the chrome UNMOUNTS rather
// than hiding, that exactly one MapView exists (an overlay would give two), that
// the layout puts the document where the user asked for it, and — the one most
// likely to rot — that Escape leaving the deck does not also trip MapView's own
// Escape listener and clear the focus on the way out.
//
// ON FULLSCREEN, DELIBERATELY LOOSE. Playwright's click is a real user
// activation, so the gesture requirement is met, but requestFullscreen in
// headless Edge is version-dependent: it can resolve without ever setting
// document.fullscreenElement. Failing on that would make this driver red for a
// reason that has nothing to do with the app. So the assertion is only that
// entering throws nothing, and the real value is PRINTED for a human running
// this locally. That split is not a compromise — it is exactly why `presenting`
// and `fullscreen` are two independent flags in session.ts: the deck is supposed
// to work either way.
//
// Spawns vite ITSELF — backgrounded dev servers die on this machine, so the
// script owns the server lifecycle. Same pattern as drive-persistence.mjs.
//
// Run from anywhere:  node tools/studio-spike/drive-present.mjs
// Exits nonzero on any failed check or any page error.
import { createRequire } from 'node:module'
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'

const REPO = 'D:/ShiZhong/MyCode/KnowledgeNetworkThesisDemo'
const OUT = REPO + '/tools/studio-spike/shots'
const PORT = 5207
mkdirSync(OUT, { recursive: true })

const require = createRequire(REPO + '/package.json')
const { chromium } = require('playwright-core')

const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--port', String(PORT), '--strictPort'], {
  cwd: REPO,
  stdio: ['ignore', 'pipe', 'pipe'],
})
let viteOut = ''
await new Promise((res, rej) => {
  const t = setTimeout(() => rej(new Error('vite did not become ready:\n' + viteOut)), 30000)
  const watch = (d) => {
    viteOut += String(d)
    if (viteOut.includes('localhost:')) {
      clearTimeout(t)
      res()
    }
  }
  vite.stdout.on('data', watch)
  vite.stderr.on('data', watch)
  vite.on('exit', (c) => rej(new Error('vite exited early ' + c + ':\n' + viteOut)))
})

const errors = []
const checks = []
const ok = (name, cond, detail = '') => {
  checks.push(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? '   ' + detail : ''}`)
  if (!cond) errors.push(name + (detail ? ' — ' + detail : ''))
}

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 1750, height: 950 } })
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
page.on('console', (m) => {
  if (m.type() === 'error') errors.push('console: ' + m.text())
})

const count = (sel) => page.$$eval(sel, (els) => els.length)
const attr = (name) => page.$eval('[data-present-step]', (el, n) => el.getAttribute(n), name)
const step = async () => Number(await attr('data-present-step'))
const presentFocus = () => attr('data-present-focus')
const docText = () => page.$eval('[aria-label="document-panel"]', (el) => el.innerText)
const press = async (key) => {
  await page.keyboard.press(key)
  await page.waitForTimeout(260)
}

await page.goto(`http://localhost:${PORT}/`)
// a leftover draft from another driver would change the step count under every
// assertion below
await page.evaluate(() => localStorage.clear())
await page.reload()
await page.waitForTimeout(600)

// ── 1. the entry point exists and is LIVE ───────────────────────────────────
// (every other AppToolbar item but undo/redo is disabled — this one must not be)
const present = page.getByTitle('Present', { exact: true })
ok('the toolbar offers Present', (await present.count()) === 1)
ok('and it is enabled, unlike the placeholder items', !(await present.first().isDisabled()))

// ── 2. entering takes the furniture away — by UNMOUNTING it ──────────────────
await present.first().click()
await page.waitForTimeout(700)
ok('the deck is on screen', await page.locator('[aria-label="presentation"]').isVisible())
// zero, not merely hidden: this is what catches a drift back to an overlay
ok('the sidebar is gone, not hidden', (await count('[aria-label="studio-sidebar"]')) === 0)
ok('the app header is gone, not hidden', (await count('[aria-label="studio-header"]')) === 0)

// ── 3. exactly one of every instrument (the overlay guard) ───────────────────
ok('exactly one MapView', (await count('[aria-label="map-view"]')) === 1)
ok('exactly one DocumentPanel', (await count('[aria-label="document-panel"]')) === 1)
ok('exactly one Walk·Viewer', (await count('[aria-label="walk-viewer"]')) === 1)

// ── 4. the layout the user asked for, as geometry ────────────────────────────
// "the map should not be on the top, the document should be the biggest focus,
//  and map should be on the side"
const box = async (label) => page.locator(`[aria-label="${label}"]`).boundingBox()
const doc = await box('present-document')
const map = await box('present-map')
const seq = await box('present-sequence')
ok('the document is the biggest focus', doc.width > map.width, `doc ${Math.round(doc.width)} vs map ${Math.round(map.width)}`)
ok('the map is beside it, not above it', map.x > doc.x && map.y < doc.y + 40, `map x${Math.round(map.x)} y${Math.round(map.y)} · doc x${Math.round(doc.x)} y${Math.round(doc.y)}`)
ok('the sequence band spans the bottom', seq.y > doc.y + doc.height - 8 && seq.width > map.width)

// ── 5. the deck moves, and the document moves with it ───────────────────────
const total = Number(await attr('data-present-count'))
ok('the deck has steps to present', total > 1, `${total} steps`)
const step0 = await step()
const focus0 = await presentFocus()
await press('ArrowRight')
const step1 = await step()
const focus1 = await presentFocus()
ok('→ advances the deck', step1 === step0 + 1, `${step0} → ${step1}`)
// the fix this slice carries: seeking used to move the strip and leave the
// document sitting where it was
ok('→ moves the focus with it', focus1 !== focus0 && focus1.length > 0, `${focus0} → ${focus1}`)
const title1 = await page.$eval('[data-present-step]', () => null).then(() => docText())
ok('the document pane is showing the new stop', title1.length > 0)

await press('ArrowLeft')
ok('← goes back', (await step()) === step0)

// a presenter's clicker sends these, not arrows
await press('PageDown')
ok('PageDown advances (the clicker)', (await step()) === step0 + 1)
await press('PageUp')
ok('PageUp goes back (the clicker)', (await step()) === step0)

await press('End')
ok('End jumps to the last stop', (await step()) === total - 1)
// the end of a walk is a fact, not an error
await press('ArrowRight')
ok('→ past the end is a silent no-op', (await step()) === total - 1)
await press('Home')
ok('Home returns to the first stop', (await step()) === 0)

// ── 6. fullscreen: reported, never asserted (see the header) ────────────────
const fs = await attr('data-present-fullscreen')
ok('the fullscreen readout is a clean bit', fs === '0' || fs === '1', fs)
const realFs = await page.evaluate(() => document.fullscreenElement !== null)
checks.push(`INFO  headless fullscreen actually engaged: ${realFs}   (not asserted — see this file's header)`)

await page.screenshot({ path: OUT + '/present.png' })

// ── 7. leaving puts you back exactly where you were ─────────────────────────
// The regression that matters: MapView binds its own window Escape listener and
// calls bus.clearFocus(). If usePresentationKeys ever stops capturing, exiting
// the deck silently clears the focus and this goes red.
const focusBeforeExit = await presentFocus()
await press('Escape')
await page.waitForTimeout(500)
ok('Escape leaves the deck', (await count('[aria-label="presentation"]')) === 0)
ok('the studio is back', (await count('[aria-label="studio-sidebar"]')) === 1)
const focusAfter = await page.$eval('[data-focus]', (el) => el.getAttribute('data-focus'))
ok("Escape did NOT also clear the focus (MapView's listener never fired)", focusAfter === focusBeforeExit, `${focusBeforeExit} → ${focusAfter}`)

// exiting must not have quietly rewritten the composition: activateWalk reveals
// 'walkviewer', which without the ensureActive guard would null out presetId
ok('the composition survived the round trip', (await count('[data-slot="on"]')) === 4)
const sidebar = await page.$eval('[aria-label="studio-sidebar"]', (el) => el.innerText)
ok('and it is still the Present preset, not a custom composition', sidebar.includes('accumulating, authored order'))

// ── 8. the SAVED-walk source — the only coverage of the activateWalk fix ─────
await page.getByLabel('studio-inst-trail').click()
await page.waitForTimeout(400)
const play = page.locator('[aria-label="trail-strip"]').getByRole('button').filter({ hasText: '▶' }).first()
if ((await play.count()) > 0) {
  await play.click()
  await page.waitForTimeout(400)
  const savedFocus = await page.$eval('[data-focus]', (el) => el.getAttribute('data-focus'))
  ok('activating a saved walk moves the focus (it never used to)', savedFocus !== null && savedFocus.length > 0, String(savedFocus))
  await page.getByTitle('Present', { exact: true }).first().click()
  await page.waitForTimeout(600)
  const sStep0 = await step()
  await press('ArrowRight')
  ok('a saved walk steps in the deck too', (await step()) === sStep0 + 1)
  await press('Escape')
  await page.waitForTimeout(400)
} else {
  checks.push('SKIP  saved-walk source — the Trail offered no walk to play')
}

await page.evaluate(() => localStorage.clear())

await browser.close()
vite.kill()

console.log(checks.join('\n'))
if (errors.length) {
  console.error('\n' + errors.length + ' failure(s):\n' + errors.join('\n'))
  process.exit(1)
}
console.log('\nall checks passed — shot at tools/studio-spike/shots/present.png')
