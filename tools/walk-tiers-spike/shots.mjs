// Walk-tiers spike driver, round 3 — screenshots the two surviving surfaces
// and asserts the load-bearing behaviours. E: the canvas shows the OPEN tier,
// dragging a card rearranges without touching the route, clicking a stage
// card drills and stack/lines/canvas/fringe all follow. C (the authoring
// page): palette click and palette drag both insert, blocks group into a
// stage, drop-on-a-stage-header lands INSIDE it, Tab indents, an aside
// leaves the projected route. HTML5 dnd is driven by dispatching
// dragstart/dragover/drop with a shared DataTransfer handle — deterministic,
// no native drag emulation.
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

/** HTML5 dnd via dispatched events sharing one DataTransfer. yFrac picks the
 * drop band on the target row: <0.3 before, 0.3–0.7 inside (stages), >0.7 after */
const dnd = async (srcSel, tgtSel, yFrac) => {
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

// ── E · stack + lines + canvas (default tab, 'serve' pre-picked) ────────────
if ((await count('[data-plane]')) !== 2) errors.push(`E: expected 2 planes at start, got ${await count('[data-plane]')}`)
if ((await count('[data-card]')) !== 4) errors.push(`E: canvas should show serve's 4 stops, got ${await count('[data-card]')}`)
await shot('e3-default')

// drag a canvas card — the arrangement moves, the route does not
const card = page.locator('[data-card]').first()
const before = await card.evaluate((el) => el.style.left)
const fringeBeforeDrag = await fringeCount()
const box = await card.boundingBox()
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
await page.mouse.down()
await page.mouse.move(box.x + 160, box.y + 90, { steps: 6 })
await page.mouse.up()
await page.waitForTimeout(200)
const after = await page.locator('[data-card]').first().evaluate((el) => el.style.left)
if (before === after) errors.push(`E: dragging a canvas card did not move it (left stays ${before})`)
if ((await fringeCount()) !== fringeBeforeDrag) errors.push('E: dragging a card changed the projected route — it must not')
await shot('e3-canvas-drag')

// a clean CLICK on the canvas's stage card drills — stack and canvas follow
await click('[data-canvas-pick="secure"]')
if ((await count('[data-plane]')) !== 3) errors.push(`E: drilling from the canvas should show 3 planes, got ${await count('[data-plane]')}`)
if ((await count('[data-card]')) !== 3) errors.push(`E: canvas should now show secure's 3 stops, got ${await count('[data-card]')}`)
await shot('e3-drill')

// picking on the flat lines drives the same state one tier further
await click('[data-pick="primitives"]')
if ((await count('[data-plane]')) !== 4) errors.push(`E: drilling to primitives should show 4 planes, got ${await count('[data-plane]')}`)
if ((await count('[data-card]')) !== 2) errors.push(`E: canvas should show primitives' 2 stops, got ${await count('[data-card]')}`)
await shot('e3-deep')

// ── C · the authoring page ──────────────────────────────────────────────────
await tab('C')
if ((await count('[data-blk]')) !== 0) errors.push(`C: draft should start empty, got ${await count('[data-blk]')} blocks`)

// palette CLICK inserts (the block-editor half of the gesture pair)
await click('[data-pal="stk-dns-naming"]')
if ((await count('[data-blk]')) !== 1) errors.push(`C: palette click should insert 1 block, got ${await count('[data-blk]')}`)

// palette DRAG inserts at the caret (drop on the lower half = after)
await dnd('[data-pal="stk-ip-routing"]', '[data-blk="b.0"]', 0.8)
if ((await count('[data-blk]')) !== 2) errors.push(`C: palette drop should make 2 blocks, got ${await count('[data-blk]')}`)
const second = await page.locator('[data-blk="b.1"]').getAttribute('data-node')
if (second !== 'stk-ip-routing') errors.push(`C: dropped node should land AFTER the first block, b.1 is ${second}`)

// select both blocks, group into a stage
await click('[data-blk="b.0"]')
await click('[data-blk="b.1"]')
await click('[data-group]')
if ((await count('[data-retitle]')) !== 1) errors.push(`C: grouping should create 1 stage, got ${await count('[data-retitle]')}`)
if ((await count('[data-blk]')) !== 3) errors.push(`C: after grouping expect stage + 2 children = 3 blocks, got ${await count('[data-blk]')}`)
if ((await fringeCount()) !== '2') errors.push(`C: a stage adds no visits — fringe should stay 2, got ${await fringeCount()}`)

// drop on the stage header's MIDDLE band lands inside the stage
await dnd('[data-pal="stk-tcp-udp"]', '[data-blk="b.0"]', 0.5)
if ((await count('[data-blk^="b.0."]')) !== 3) errors.push(`C: mid-header drop should land inside the stage (3 children), got ${await count('[data-blk^="b.0."]')}`)
if ((await fringeCount()) !== '3') errors.push(`C: fringe should be 3 after the in-stage drop, got ${await fringeCount()}`)
await shot('c3-built')

// append at root, then Tab-indent it into the stage above
await click('[data-pal="web-http-rest"]')
if ((await count('[data-blk]')) !== 5) errors.push(`C: append should make 5 blocks total, got ${await count('[data-blk]')}`)
await click('[data-blk="b.1"]')
await page.keyboard.press('Tab')
await page.waitForTimeout(200)
if ((await count('[data-blk^="b.0."]')) !== 4) errors.push(`C: Tab should indent the block into the stage (4 children), got ${await count('[data-blk^="b.0."]')}`)

// fork an aside — it leaves the projected route
await click('[data-blk="b.0.3"]')
await click('[data-aside]')
if ((await count('[data-aside-lane]')) !== 1) errors.push(`C: expected 1 aside lane, got ${await count('[data-aside-lane]')}`)
if ((await fringeCount()) !== '3') errors.push(`C: an aside is not in the route — fringe should drop to 3, got ${await fringeCount()}`)
await shot('c3-aside')

// hover syncs the doc pane — authoring keeps the same hover contract
await page.locator('[data-cand="C"] [data-node="stk-dns-naming"]').first().hover()
await page.waitForTimeout(250)
const doc = await page.locator('[data-doc]').getAttribute('data-doc')
if (doc !== 'stk-dns-naming') errors.push(`C: hovering stk-dns-naming shows doc pane "${doc}"`)
await shot('c3-hover')

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
