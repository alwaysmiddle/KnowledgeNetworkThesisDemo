// Walk-tiers spike driver, round 2 — screenshots the three surviving
// candidates and asserts the load-bearing behaviours: the tier-lines cascade
// swaps every line below a pick, the stack grows/shrinks one plane per line
// on the SAME state, hover lights the doc pane (no candidate owns a
// tooltip), and the projected route follows the drill-path.
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
const count = (sel) => page.locator(sel).count()

await page.goto(`http://localhost:${PORT}/?spike=walk-tiers`)
await page.waitForTimeout(700)

// ── E · stack + lines (default tab, 'serve' pre-picked → 2 lines/planes) ────
if ((await count('[data-plane]')) !== 2) errors.push(`E: expected 2 planes at start, got ${await count('[data-plane]')}`)
await shot('e2-default')
// drill: serve ▸ secure ▸ primitives — a plane must appear per picked line
await click('[data-pick="secure"]')
await click('[data-pick="primitives"]')
if ((await count('[data-plane]')) !== 4) errors.push(`E: drill to primitives should show 4 planes, got ${await count('[data-plane]')}`)
if ((await count('[data-line]')) !== 4) errors.push(`E: drill to primitives should show 4 lines, got ${await count('[data-line]')}`)
await shot('e2-deep')
// the SWAP: picking a different tier-0 stage must replace every line below
const fringeDeep = await page.locator('[data-fringe-count]').getAttribute('data-fringe-count')
await click('[data-pick="machine"]')
if ((await count('[data-plane]')) !== 2) errors.push(`E: picking 'machine' at tier 0 should swap to 2 planes, got ${await count('[data-plane]')}`)
const fringeSwap = await page.locator('[data-fringe-count]').getAttribute('data-fringe-count')
if (fringeDeep === fringeSwap) errors.push(`E: the swap did not change the projected route (${fringeDeep})`)
await shot('e2-swap')

// ── B · tier lines alone ────────────────────────────────────────────────────
await tab('B')
if ((await count('[data-line]')) !== 1) errors.push(`B: expected 1 line before any pick, got ${await count('[data-line]')}`)
await shot('b2-default')
await click('[data-pick="serve"]')
await click('[data-pick="secure"]')
if ((await count('[data-line]')) !== 3) errors.push(`B: serve▸secure should show 3 lines, got ${await count('[data-line]')}`)
await shot('b2-drill')
// picking a leaf visit on line 1 truncates below it — a visit has no inside
await click('[data-cand="B"] [data-line="1"] [data-node="stk-dns-naming"]')
if ((await count('[data-line]')) !== 2) errors.push(`B: picking a visit on line 1 should truncate to 2 lines, got ${await count('[data-line]')}`)
await shot('b2-visit-truncate')

// ── C · outline + recursive timeline ────────────────────────────────────────
await tab('C')
await click('[data-expand-all]')
// exactly ONE occurrence is a revisit at full expansion (stk-tcp-udp's
// second stop) — mutating a seen-set during render double-marked everything
// under StrictMode once; this pins the pure computation
const revisits = await count('[data-revisit]')
if (revisits !== 1) errors.push(`C: expected exactly 1 revisit mark at full expansion, got ${revisits}`)
await shot('c2-open')
// hover syncs the doc pane — the whole reason the mocks carry no tooltips
await page.locator('[data-cand="C"] [data-node="stk-tcp-udp"]').first().hover()
await page.waitForTimeout(250)
const doc = await page.locator('[data-doc]').getAttribute('data-doc')
if (doc !== 'stk-tcp-udp') errors.push(`C: hovering stk-tcp-udp shows doc pane "${doc}"`)
await shot('c2-hover')

await browser.close()
vite.kill()

if (errors.length) {
  console.error('walk-tiers spike FAILED:')
  for (const e of errors) console.error('  x ' + e)
  process.exit(1)
}
console.log('walk-tiers spike ok — frames in tools/walk-tiers-spike/out/')
