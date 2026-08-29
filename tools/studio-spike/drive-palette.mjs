// OB-104 / OB-105 / OB-106 — the palette pane's close, its way back, and the
// toolbar order around it.
//
// None of this is a unit test. The regression OB-104 reports is that the pane
// had no ✕ AND the toolbar had no toggle, which is only a bug in combination:
// either one alone is a design, the pair is a one-way door. So the check that
// matters is the ROUND TRIP — close it, then get it back — and that needs a real
// browser because the way back is measured off a live `getBoundingClientRect`.
//
// THE ONE SILENT FAILURE THIS EXISTS TO CATCH: StudioView finds the toolbar icon
// by `[title="hide the palette"]`, and `Toolbar` puts every title through
// `wrapTip`, which inserts newlines past 44 characters. Lengthen either tip and
// the selector stops matching, `paletteDelta()` bails to {0,0}, and the pane
// fades in place instead of flying — no error, no test failure, just a worse
// animation. Asserted directly below.
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
// settle past --dur-hover (140ms) plus the unmount, with room to spare
const settle = () => page.waitForTimeout(500)

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

// THE SELECTOR THE ANIMATION DEPENDS ON. If wrapTip ever folds this title, the
// attribute stops being the literal string and this is the only thing that says so.
ok(
  'the toggle is findable by the exact title StudioView measures against',
  await page.evaluate(() => !!document.querySelector('[title="hide the palette"], [title="show the palette"]')),
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

// ── 4. OB-106: picking a named preset closes the palette ────────────────────
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
