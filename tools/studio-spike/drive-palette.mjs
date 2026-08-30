// OB-104 / OB-105 / OB-106 — the palette pane's close, its way back, and the
// toolbar order around it.
//
// None of this is a unit test. The regression OB-104 reports is that the pane
// had no ✕ AND the toolbar had no toggle, which is only a bug in combination:
// either one alone is a design, the pair is a one-way door. So the check that
// matters is the ROUND TRIP — close it, then get it back — and that needs a real
// browser because the way back is measured off a live `getBoundingClientRect`.
//
// TWO SILENT FAILURES THIS EXISTS TO CATCH, neither of which throws or drops a
// frame:
//
//   1. StudioView finds the toolbar icon by its title, and `Toolbar` puts every
//      title through `wrapTip`, which folds past 44 characters. Match the raw
//      tip and lengthening the copy breaks the flight — and as a CSS selector it
//      did not even degrade to "no match", it threw (OB-118 point 2).
//   2. the flight was one motion and the DESK was another: the panes beside the
//      palette held still for the whole transition and then jumped the full
//      column width in the single frame the unmount landed on. Section 4.
//
// Spawns vite ITSELF — backgrounded dev servers die on this machine, so the
// script owns the server lifecycle. Same pattern as drive-present.mjs.
//
// Run from anywhere:  node tools/studio-spike/drive-palette.mjs
// Exits nonzero on any failed check or any page error.
import { createRequire } from 'node:module'
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'

const REPO = 'D:/ShiZhong/MyCode/KnowledgeNetworkThesisDemo'
const OUT = REPO + '/tools/studio-spike/shots'
const PORT = 5209
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

const sidebars = () => page.$$eval('[aria-label="studio-sidebar"]', (els) => els.length)
// the toolbar is the div directly after the app header; read its buttons in DOM
// order, which IS the group order the obligation is about
const toolbarTitles = () =>
  page.$$eval('[aria-label="studio-header"] + div button', (els) => els.map((el) => (el.getAttribute('title') || '').replace(/\n/g, ' ')))
// settle past --dur-palette (400ms) plus the unmount, with room to spare
const settle = () => page.waitForTimeout(700)

await page.goto(`http://localhost:${PORT}/`)
await page.evaluate(() => localStorage.clear())
await page.reload()
await page.waitForTimeout(600)

// ── 1. both controls exist (OB-104's actual report) ─────────────────────────
ok('the palette pane is on screen at rest', (await sidebars()) === 1)
const closeX = page.locator('[aria-label="studio-sidebar"]').getByRole('button', { name: 'close' })
ok('the palette pane has a ✕', (await closeX.count()) === 1)
const toggle = page.getByTitle('hide the palette', { exact: true })
ok('the toolbar has the palette toggle, reading "hide" while open', (await toggle.count()) === 1)

// HOW THE ANIMATION FINDS THE BUTTON (OB-118 point 2). It compares `el.title` in
// JS against `wrapTip(tip)`, and it used to be a CSS attribute selector on the raw
// tip. Both halves of that change matter and both are checked here on the live DOM.
ok(
  'the toggle is findable the way StudioView actually finds it — title compared in JS',
  await page.evaluate(() =>
    [...document.querySelectorAll('button[title]')].some(
      (el) => el.title === 'hide the palette' || el.title === 'show the palette',
    ),
  ),
)

// AND WHY IT IS NOT A SELECTOR. `Toolbar` folds any title past 44 characters, and a
// CSS string may not carry a raw newline — so the old form did not degrade to "no
// match", it threw. Proven against a stand-in button rather than by lengthening the
// app's own copy, so the check holds whatever that copy says.
ok(
  'and a folded title breaks the OLD selector form, which is why it is gone',
  await page.evaluate(() => {
    const probe = document.createElement('button')
    // the newline is built, not escaped, so no layer between here and the page
    // can quietly turn it back into a space
    probe.setAttribute('title', ['hide the palette panel and give the desk', 'more room to work in'].join(String.fromCharCode(10)))
    document.body.appendChild(probe)
    let selector = 'no match'
    try {
      selector = document.querySelector(`[title="${probe.title}"]`) ? 'matched' : 'no match'
    } catch (e) {
      selector = 'threw ' + e.name
    }
    const inJs = [...document.querySelectorAll('button[title]')].some((el) => el.title === probe.title)
    probe.remove()
    return selector.startsWith('threw') && inJs
  }),
)

// ── 2. OB-105: group order — palette, then new map / load / save / print ────
const titles = await toolbarTitles()
ok('the palette toggle is the toolbar\'s FIRST item', titles[0] === 'hide the palette', JSON.stringify(titles[0]))
const doc = titles.slice(1, 5)
ok(
  'the four document actions are grouped, in use order',
  doc[0] === 'New map' && doc[1] === 'Load' && doc[2] === 'Save (Ctrl+S)' && doc[3] === 'Print (Ctrl+P)',
  JSON.stringify(doc),
)
ok('undo/redo follow them, not precede them', titles[5] === 'Undo (Ctrl+Z)' && titles[6] === 'Redo (Ctrl+Y)', JSON.stringify(titles.slice(5, 7)))

// ── 3. the round trip: ✕ closes, the toolbar brings it back ─────────────────
// THE ✕ ARRIVES WITH THE POINTER — that is Pane's design, not an accident: at
// rest it is opacity 0 AND pointer-events none, so a click without a hover first
// lands on the header behind it and times out. Hovering the pane is what a user
// does; the driver has to do it too.
await page.locator('[aria-label="studio-sidebar"]').hover()
await page.waitForTimeout(200)
await closeX.click()
await settle()
ok('the ✕ closes the palette — unmounted, not hidden', (await sidebars()) === 0)
const reopen = page.getByTitle('show the palette', { exact: true })
ok('and the toggle now reads "show"', (await reopen.count()) === 1)

await reopen.click()
await settle()
ok('the toggle brings the palette back — the door swings both ways', (await sidebars()) === 1)
ok('and the toggle reads "hide" again', (await page.getByTitle('hide the palette', { exact: true }).count()) === 1)

// ── 4. the close is ONE motion, not a flight and then a lurch ──────────────
// The pane's own flight was always smooth — measured at a steady 17ms/frame with
// nothing dropped, in both directions. The DESK was the stutter: the panes
// beside the palette held their exact position for the whole transition and
// then moved 220px, the column plus its gap, in the ONE frame the unmount
// landed on.
// Opening was the same two beats in the other order, the jump first.
//
// So this samples the NEIGHBOUR rather than the palette, every frame across a
// close, and asks whether it travels or teleports. The palette flying smoothly
// is not evidence about this and never was.
const reflow = await page.evaluate(async () => {
  const wrap = document.querySelector('[aria-label="studio-sidebar"]').parentElement
  const neighbour = [...wrap.parentElement.children].find((c) => c !== wrap)
  const xs = []
  let on = true
  const step = () => {
    if (!on) return
    xs.push(Math.round(neighbour.getBoundingClientRect().left))
    requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
  ;[...document.querySelectorAll('button[title]')].find((el) => el.title === 'hide the palette').click()
  await new Promise((r) => setTimeout(r, 900))
  on = false
  let biggest = 0
  for (let i = 1; i < xs.length; i++) biggest = Math.max(biggest, Math.abs(xs[i] - xs[i - 1]))
  return { seen: new Set(xs).size, biggest, from: xs[0], to: xs[xs.length - 1], travelled: Math.abs(xs[xs.length - 1] - xs[0]) }
})
ok(
  'the palette closes at all — the neighbour ends up where the column was',
  reflow.travelled > 100,
  `${reflow.from}px → ${reflow.to}px`,
)
ok(
  'the panes beside it make room over many frames, not one',
  reflow.seen >= 6,
  `${reflow.seen} distinct positions across the close`,
)
// the old behaviour puts 100% of the move in a single frame, so this is the
// check that actually fails against it
ok(
  'and no single frame carries half the move',
  reflow.biggest < reflow.travelled / 2,
  `biggest step ${reflow.biggest}px of ${reflow.travelled}px`,
)

await page.getByTitle('show the palette', { exact: true }).click()
await settle()

// ── 5. OB-106: picking a named preset closes the palette ────────────────────
await page.getByLabel('studio-preset-explore').click()
await settle()
ok('picking Explore closes the palette', (await sidebars()) === 0)
ok('and it is reopenable afterwards', (await page.getByTitle('show the palette', { exact: true }).count()) === 1)

await page.getByTitle('show the palette', { exact: true }).click()
await settle()
await page.screenshot({ path: OUT + '/palette.png' })

await page.evaluate(() => localStorage.clear())
await browser.close()
vite.kill()

console.log(checks.join('\n'))
if (errors.length) {
  console.error('\n' + errors.length + ' failure(s):\n' + errors.join('\n'))
  process.exit(1)
}
console.log('\nall checks passed — shot at tools/studio-spike/shots/palette.png')
