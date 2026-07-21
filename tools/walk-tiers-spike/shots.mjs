// Walk-tiers spike driver, round 5 (final). C is palette + the nested-box
// editor ALONE — the chain must prove the nest owns every block gesture the
// retired timeline had: banded drop (before), drop INTO an open box, moving
// an existing block into a box, group (the new stage is born OPEN), aside
// (leaves the projected route), collapse (hides blocks but never changes the
// projection). E is stack + vertical columns on ONE TierPathState — proven
// by driving the stack FROM the columns and the columns FROM the stack.
// HTML5 dnd is driven by dispatching dragstart/dragover/drop with a shared
// DataTransfer handle.
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

// ── C · the nested-box editor (default tab), seeded 3-tier draft ────────────
// seed: [dns, seed-net[ip, tcp, seed-sec[pkc, tls]], http] — all boxes open
if ((await count('[data-blk]')) !== 8) errors.push(`C: seeded draft should show 8 blocks (6 visits + 2 headers), got ${await count('[data-blk]')}`)
if ((await count('[data-retitle]')) !== 2) errors.push(`C: seed has 2 open stages to retitle, got ${await count('[data-retitle]')}`)
if ((await fringeCount()) !== '6') errors.push(`C: seeded fringe should be 6 visits, got ${await fringeCount()}`)
await shot('c5-default')

// collapse hides blocks but NEVER changes the projection (authoring projects all-open)
await click('[data-nest-toggle="seed-sec"]')
if ((await count('[data-blk]')) !== 6) errors.push(`C: collapsing seed-sec should hide its 2 visits (6 blocks), got ${await count('[data-blk]')}`)
if ((await fringeCount()) !== '6') errors.push(`C: view collapse must not change the projected route, got ${await fringeCount()}`)
await click('[data-nest-toggle="seed-sec"]')
if ((await count('[data-blk]')) !== 8) errors.push(`C: re-opening seed-sec should restore 8 blocks, got ${await count('[data-blk]')}`)

// drop INTO an open box appends to that stage
await dnd('[data-pal="web-sockets-apis"]', '[data-ndrop="seed-sec"]')
if ((await count('[data-blk]')) !== 9) errors.push(`C: drop into the sec box should make 9 blocks, got ${await count('[data-blk]')}`)
if ((await fringeCount()) !== '7') errors.push(`C: fringe should be 7 after the nest drop, got ${await fringeCount()}`)
if ((await count('[data-ndrop="seed-sec"] [data-blk]')) !== 4)
  errors.push(`C: the sec box should hold 4 blocks after the drop (own header + 3 steps), got ${await count('[data-ndrop="seed-sec"] [data-blk]')}`)

// a banded drop on a box's TOP HALF inserts BEFORE it
await dnd('[data-pal="auto-continuous-integration"]', '[data-blk="b.0"]', 0.25)
if ((await count('[data-blk]')) !== 10) errors.push(`C: banded drop should append a block (10), got ${await count('[data-blk]')}`)
if ((await fringeCount()) !== '8') errors.push(`C: fringe should be 8 after the banded drop, got ${await fringeCount()}`)
const first = await page.locator('[data-blk="b.0"]').getAttribute('data-node')
if (first !== 'auto-continuous-integration') errors.push(`C: top-half drop should land BEFORE the first block, but b.0 is ${first}`)

// moving an EXISTING block into an open box — root shrinks, the box grows
await dnd('[data-blk="b.3"]', '[data-ndrop="seed-net"]') // http-rest → into seed-net
if ((await count('[data-blk]')) !== 10) errors.push(`C: a move changes no counts (10 blocks), got ${await count('[data-blk]')}`)
if ((await fringeCount()) !== '8') errors.push(`C: a move changes no visits — fringe stays 8, got ${await fringeCount()}`)
if ((await count('[data-ndrop="seed-net"] [data-blk]')) !== 8)
  errors.push(`C: seed-net should hold 8 blocks after the move (own header + 7 inside), got ${await count('[data-ndrop="seed-net"] [data-blk]')}`)

// group two selected root blocks — the new stage is born OPEN (retitle ready)
await click('[data-blk="b.0"]')
await click('[data-blk="b.1"]')
await click('[data-group]')
if ((await count('[data-retitle]')) !== 3) errors.push(`C: grouping should make a 3rd OPEN stage, got ${await count('[data-retitle]')} retitle inputs`)
if ((await count('[data-blk]')) !== 11) errors.push(`C: after grouping expect 11 blocks, got ${await count('[data-blk]')}`)
if ((await fringeCount()) !== '8') errors.push(`C: grouping adds no visits — fringe stays 8, got ${await fringeCount()}`)
await shot('c5-group')

// aside the grouped visits — they leave the projected route but stay visible
await click('[data-blk="b.0.0"]')
await click('[data-blk="b.0.1"]')
await click('[data-aside]')
if ((await count('[data-aside-lane]')) !== 1) errors.push(`C: expected 1 aside lane, got ${await count('[data-aside-lane]')}`)
if ((await count('[data-blk]')) !== 9) errors.push(`C: aside removes its 2 visits from the flow (9 blocks), got ${await count('[data-blk]')}`)
if ((await fringeCount()) !== '6') errors.push(`C: aside visits leave the route — fringe 6, got ${await fringeCount()}`)
await shot('c5-aside')

// hover lights the doc pane from the editor — no private tooltips
await page.locator('[data-cand="C"] [data-node="stk-ip-routing"]').first().hover()
await page.waitForTimeout(250)
const doc = await page.locator('[data-doc]').getAttribute('data-doc')
if (doc !== 'stk-ip-routing') errors.push(`C: hovering stk-ip-routing shows doc pane "${doc}"`)

// the palette search narrows the pick list
const palAll = await count('[data-pal]')
await page.locator('[data-pal-search]').fill('tls')
await page.waitForTimeout(200)
const palTls = await count('[data-pal]')
if (!(palTls > 0 && palTls < palAll)) errors.push(`C: search 'tls' should narrow the palette (${palAll} -> ${palTls})`)
await page.locator('[data-pal-search]').fill('')

// ── E · stack + vertical columns, 'serve' pre-picked ────────────────────────
await tab('E')
if ((await count('[data-plane]')) !== 2) errors.push(`E: expected 2 planes at start, got ${await count('[data-plane]')}`)
if ((await count('[data-vcol]')) !== 2) errors.push(`E: expected 2 columns at start, got ${await count('[data-vcol]')}`)
if ((await count('[data-vedge]')) !== 1) errors.push(`E: one open column = one begat-edge, got ${await count('[data-vedge]')}`)
if ((await count('[data-varrow]')) !== 6) errors.push(`E: 4+4 boxes need 3+3 down arrows, got ${await count('[data-varrow]')}`)
if ((await count('[data-vaside]')) !== 1) errors.push(`E: serve's aside should hang below its column, got ${await count('[data-vaside]')}`)
await shot('e5-default')

// picking in the COLUMNS drives the STACK — one TierPathState
await click('[data-vpick="secure"]')
if ((await count('[data-plane]')) !== 3) errors.push(`E: column pick should grow the stack to 3 planes, got ${await count('[data-plane]')}`)
await click('[data-vpick="primitives"]')
if ((await count('[data-plane]')) !== 4) errors.push(`E: drill to primitives should show 4 planes, got ${await count('[data-plane]')}`)
if ((await count('[data-vcol]')) !== 4) errors.push(`E: drill to primitives should show 4 columns, got ${await count('[data-vcol]')}`)
if ((await count('[data-vedge]')) !== 3) errors.push(`E: three open columns = three begat-edges, got ${await count('[data-vedge]')}`)
await shot('e5-deep')
const fringeDeep = await fringeCount()

// picking in the STACK drives the COLUMNS — the tier-0 swap truncates all
await click('[data-pick-stack="machine"]')
if ((await count('[data-plane]')) !== 2) errors.push(`E: picking 'machine' at tier 0 should swap to 2 planes, got ${await count('[data-plane]')}`)
if ((await count('[data-vcol]')) !== 2) errors.push(`E: the swap should leave 2 columns, got ${await count('[data-vcol]')}`)
if ((await fringeCount()) === fringeDeep) errors.push('E: the tier-0 swap did not change the projected route')
await shot('e5-swap')

await browser.close()
vite.kill()

if (errors.length) {
  console.error('walk-tiers spike FAILED:')
  for (const e of errors) console.error('  x ' + e)
  process.exit(1)
}
console.log('walk-tiers spike ok — frames in tools/walk-tiers-spike/out/')
