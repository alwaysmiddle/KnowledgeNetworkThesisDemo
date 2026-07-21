// Walk-tiers spike driver, round 4. E is back to stack + lines (canvas
// dropped) — asserts the round-2 drill/swap behaviours still hold. C is now
// THREE parallel authoring views over ONE seeded draft; the load-bearing
// assertions are cross-view: the vertical columns open one column per picked
// stage and draw a begat-edge per column; dropping a node INTO an expanded
// nested box adds it to that stage and the columns view shows the new count
// without being touched; the timeline still groups; an aside still leaves
// the projected route. HTML5 dnd is driven by dispatching
// dragstart/dragover/drop with a shared DataTransfer handle.
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
const fringeCount = () => page.locator('[data-fringe-count]').getAttribute('data-fringe-count')

/** HTML5 dnd via dispatched events sharing one DataTransfer */
const dnd = async (srcSel, tgtSel, yFrac = 0.5) => {
  const dt = await page.evaluateHandle(() => new DataTransfer())
  await page.dispatchEvent(srcSel, 'dragstart', { dataTransfer: dt })
  const box = await page.locator(tgtSel).first().boundingBox()
  if (!box) throw new Error('dnd target not found: ' + tgtSel)
  const pos = { clientX: box.x + box.width / 2, clientY: box.y + box.height * yFrac }
  await page.dispatchEvent(tgtSel, 'dragover', { dataTransfer: dt, ...pos })
  await page.dispatchEvent(tgtSel, 'drop', { dataTransfer: dt, ...pos })
  await page.waitForTimeout(200)
}

await page.goto(`http://localhost:${PORT}/?spike=walk-tiers`)
await page.waitForTimeout(700)

// ── E · stack + lines (default tab, 'serve' pre-picked → 2 lines/planes) ────
if ((await count('[data-plane]')) !== 2) errors.push(`E: expected 2 planes at start, got ${await count('[data-plane]')}`)
await shot('e4-default')
await click('[data-pick="secure"]')
await click('[data-pick="primitives"]')
if ((await count('[data-plane]')) !== 4) errors.push(`E: drill to primitives should show 4 planes, got ${await count('[data-plane]')}`)
if ((await count('[data-line]')) !== 4) errors.push(`E: drill to primitives should show 4 lines, got ${await count('[data-line]')}`)
await shot('e4-deep')
const fringeDeep = await fringeCount()
await click('[data-pick="machine"]')
if ((await count('[data-plane]')) !== 2) errors.push(`E: picking 'machine' at tier 0 should swap to 2 planes, got ${await count('[data-plane]')}`)
if ((await fringeCount()) === fringeDeep) errors.push('E: the tier-0 swap did not change the projected route')
await shot('e4-swap')

// ── C · one draft, three authoring views ────────────────────────────────────
await tab('C')
if ((await count('[data-blk]')) !== 8) errors.push(`C: seeded draft should have 8 blocks, got ${await count('[data-blk]')}`)
if ((await count('[data-retitle]')) !== 2) errors.push(`C: seed has 2 stages, got ${await count('[data-retitle]')}`)
if ((await fringeCount()) !== '6') errors.push(`C: seeded fringe should be 6 visits, got ${await fringeCount()}`)
await shot('c4-default')

// view 2 — vertical columns: pick opens a column and draws its begat-edge
if ((await count('[data-vcol]')) !== 1) errors.push(`C: columns should start at 1, got ${await count('[data-vcol]')}`)
if ((await count('[data-varrow]')) !== 2) errors.push(`C: 3 root boxes need 2 down arrows, got ${await count('[data-varrow]')}`)
await click('[data-vpick="seed-net"]')
if ((await count('[data-vcol]')) !== 2) errors.push(`C: picking seed-net should open column 2, got ${await count('[data-vcol]')}`)
if ((await count('[data-vedge]')) !== 1) errors.push(`C: one open column = one begat-edge, got ${await count('[data-vedge]')}`)
await click('[data-vpick="seed-sec"]')
if ((await count('[data-vcol]')) !== 3) errors.push(`C: picking seed-sec should open column 3, got ${await count('[data-vcol]')}`)
if ((await count('[data-vedge]')) !== 2) errors.push(`C: two open columns = two begat-edges, got ${await count('[data-vedge]')}`)
await shot('c4-columns')

// view 3 — nested boxes: expand in place, drop INTO the open box; the
// columns view must show the new count without being touched
await click('[data-nest-toggle="seed-sec"]')
await dnd('[data-pal="web-sockets-apis"]', '[data-ndrop="seed-sec"]')
if ((await count('[data-blk]')) !== 9) errors.push(`C: drop into the sec box should make 9 blocks, got ${await count('[data-blk]')}`)
if ((await fringeCount()) !== '7') errors.push(`C: fringe should be 7 after the nest drop, got ${await fringeCount()}`)
if ((await count('[data-vcol="2"] [data-vbox]')) !== 3)
  errors.push(`C: columns view should show sec's 3 boxes after the nest drop, got ${await count('[data-vcol="2"] [data-vbox]')}`)
await shot('c4-nest-drop')

// view 1 — the timeline still authors: append at root, group two blocks
await click('[data-pal="app-authentication-authorization"]')
if ((await count('[data-blk]')) !== 10) errors.push(`C: palette click should append (10 blocks), got ${await count('[data-blk]')}`)
if ((await fringeCount()) !== '8') errors.push(`C: fringe should be 8 after append, got ${await fringeCount()}`)
await click('[data-blk="b.2"]')
await click('[data-blk="b.3"]')
await click('[data-group]')
if ((await count('[data-retitle]')) !== 3) errors.push(`C: grouping should make a 3rd stage, got ${await count('[data-retitle]')}`)
if ((await count('[data-blk]')) !== 11) errors.push(`C: after grouping expect 11 blocks, got ${await count('[data-blk]')}`)
if ((await fringeCount()) !== '8') errors.push(`C: grouping adds no visits — fringe stays 8, got ${await fringeCount()}`)
await shot('c4-group')

// hover syncs the doc pane from any view — same contract everywhere
await page.locator('[data-cand="C"] [data-node="stk-dns-naming"]').first().hover()
await page.waitForTimeout(250)
const doc = await page.locator('[data-doc]').getAttribute('data-doc')
if (doc !== 'stk-dns-naming') errors.push(`C: hovering stk-dns-naming shows doc pane "${doc}"`)

// the palette search narrows the pick list
const palAll = await count('[data-pal]')
await page.locator('[data-pal-search]').fill('tls')
await page.waitForTimeout(200)
const palTls = await count('[data-pal]')
if (!(palTls > 0 && palTls < palAll)) errors.push(`C: search 'tls' should narrow the palette (${palAll} -> ${palTls})`)

await browser.close()
vite.kill()

if (errors.length) {
  console.error('walk-tiers spike FAILED:')
  for (const e of errors) console.error('  x ' + e)
  process.exit(1)
}
console.log('walk-tiers spike ok — frames in tools/walk-tiers-spike/out/')
