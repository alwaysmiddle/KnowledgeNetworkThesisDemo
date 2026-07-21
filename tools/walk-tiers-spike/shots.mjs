// Walk-tiers spike driver — screenshots the five candidate mocks and asserts
// the load-bearing behaviours: expansion changes the projected route, a
// 4th-tier expand dives with a breadcrumb, and hover lights the doc pane
// (the KnowledgePanel stand-in) plus BOTH occurrences of a revisited node.
// Spawns vite ITSELF (backgrounded dev servers die on this machine): spawn,
// wait ready, drive, kill — same pattern as tools/studio-spike/shot-visuals.mjs.
//
// Run from anywhere:  node tools/walk-tiers-spike/shots.mjs
// Frames land in tools/walk-tiers-spike/out/ (gitignored).
// Exits nonzero on any page error or failed assertion.
import { createRequire } from 'node:module'
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'

const REPO = 'D:/ShiZhong/MyCode/KnowledgeNetworkThesisDemo'
const OUT = REPO + '/tools/walk-tiers-spike/out'
const PORT = 5201
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
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 1750, height: 950 } })
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
page.on('console', (m) => {
  if (m.type() === 'error') errors.push('console: ' + m.text())
})

const shot = (name) => page.screenshot({ path: `${OUT}/${name}.png` })
const click = async (sel) => {
  await page.locator(sel).first().click()
  await page.waitForTimeout(250)
}
const tab = (id) => click(`[data-galtab="${id}"]`)

await page.goto(`http://localhost:${PORT}/?spike=walk-tiers`)
await page.waitForTimeout(700)

// ── B · tiered ribbon (default tab, 'serve' pre-expanded) ───────────────────
await shot('b-default')
const fringeBefore = await page.locator('[data-fringe-count]').getAttribute('data-fringe-count')
await click('[data-expand="secure"]')
const fringeAfter = await page.locator('[data-fringe-count]').getAttribute('data-fringe-count')
if (fringeBefore === fringeAfter) errors.push(`B: expanding 'secure' did not change the projected route (${fringeBefore})`)
await shot('b-open')
// 'primitives' sits at depth 2 — opening it must DIVE, not expand inline
await click('[data-expand="primitives"]')
if ((await page.locator('[data-crumb]').count()) !== 1) errors.push('B: expanding a 4th-tier stage did not show the dive breadcrumb')
await shot('b-dive')
await click('[data-up]')

// ── A · expanding columns ───────────────────────────────────────────────────
await tab('A')
await shot('a-default')
await click('[data-expand="serve"]')
await click('[data-expand="secure"]')
await shot('a-open')
await click('[data-expand="primitives"]')
if ((await page.locator('[data-crumb]').count()) !== 1) errors.push('A: expanding a 4th-tier stage did not show the dive breadcrumb')
await shot('a-dive')

// ── C · outline + fringe ────────────────────────────────────────────────────
await tab('C')
await click('[data-expand-all]')
await shot('c-open')
// hover syncs the doc pane — the whole reason the mocks carry no tooltips
await page.locator('[data-cand="C"] [data-node="stk-tcp-udp"]').first().hover()
await page.waitForTimeout(250)
const doc = await page.locator('[data-doc]').getAttribute('data-doc')
if (doc !== 'stk-tcp-udp') errors.push(`C: hovering stk-tcp-udp shows doc pane "${doc}"`)
await shot('c-hover')

// ── D · metro line ──────────────────────────────────────────────────────────
await tab('D')
await shot('d-default')
// stations are SVG — a <g> has no clickable area of its own, so aim at the
// diamond rect inside it
await click('[data-expand="secure"] rect')
await click('[data-expand="primitives"] rect')
await click('[data-expand="speak"] rect')
await shot('d-dips')
// the revisit: stk-tcp-udp is a station twice (serve + speak) — hovering one
// occurrence must light both, the id-keyed hover contract doing its job
await page.locator('[data-cand="D"] [data-node="stk-tcp-udp"]').first().hover()
await page.waitForTimeout(250)
const lit = await page.locator('[data-cand="D"] [data-node="stk-tcp-udp"][data-lit="1"]').count()
if (lit < 2) errors.push(`D: hovering the revisited station lit ${lit} of 2 occurrences`)
await shot('d-revisit-hover')

// ── E · layer stack ─────────────────────────────────────────────────────────
await tab('E')
await shot('e-tier0')
await click('[data-plane-label="1"]')
const desk = await page.locator('[data-desk-tier]').getAttribute('data-desk-tier')
if (desk !== '1') errors.push(`E: selecting plane 1 put the desk on tier "${desk}"`)
await shot('e-tier1')

await browser.close()
vite.kill()

if (errors.length) {
  console.error('walk-tiers spike FAILED:')
  for (const e of errors) console.error('  x ' + e)
  process.exit(1)
}
console.log('walk-tiers spike ok — frames in tools/walk-tiers-spike/out/')
